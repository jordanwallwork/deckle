import type { ZoneDef, TabletopController } from './types';
import type { GameSetupState } from '$lib/types/gameSetup';

export type { ZoneDef, TabletopController };

// ── Internal types ─────────────────────────────────────────────────────────

interface VariableRef {
  id: string;
  name: string;
  type: string;
}

interface BlockNode {
  type: string;
  id?: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block?: BlockNode }>;
  next?: { block?: BlockNode };
}

interface EvalContext {
  /** Maps Blockly variable ID → runtime value (e.g. player number for PLAYER vars) */
  variables: Map<string, unknown>;
}

// ── Player zone layout ─────────────────────────────────────────────────────

const PLAYER_ZONE_Y = 700;
const PLAYER_HAND_W = 200;
const PLAYER_HAND_H = 180;
const PLAYER_TABLEAU_W = 300;
const PLAYER_TABLEAU_H = 350;
const PLAYER_ZONE_GAP = 20; // between hand and tableau within a player column
const PLAYER_COLUMN_GAP = 40; // between adjacent player columns
const PLAYER_START_X = 40;

function addPlayerZones(count: number, controller: TabletopController): void {
  const colWidth = PLAYER_HAND_W + PLAYER_ZONE_GAP + PLAYER_TABLEAU_W;
  for (let i = 1; i <= count; i++) {
    const colX = PLAYER_START_X + (i - 1) * (colWidth + PLAYER_COLUMN_GAP);
    controller.addZone({
      id: `player-${i}-hand`,
      label: `Player ${i} Hand`,
      x: colX,
      y: PLAYER_ZONE_Y,
      minWidth: PLAYER_HAND_W,
      minHeight: PLAYER_HAND_H,
    });
    controller.addZone({
      id: `player-${i}-tableau`,
      label: `Player ${i} Tableau`,
      x: colX + PLAYER_HAND_W + PLAYER_ZONE_GAP,
      y: PLAYER_ZONE_Y,
      minWidth: PLAYER_TABLEAU_W,
      minHeight: PLAYER_TABLEAU_H,
    });
  }
}

function applyPlayerCount(count: number, controller: TabletopController): void {
  controller.setPlayerCount(count);
  addPlayerZones(count, controller);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getVarId(field: unknown): string | undefined {
  if (!field || typeof field !== 'object') return undefined;
  const id = (field as Record<string, unknown>)['id'];
  return typeof id === 'string' ? id : undefined;
}

function compare(lhs: number, operator: string, rhs: number): boolean {
  switch (operator) {
    case 'eq':  return lhs === rhs;
    case 'neq': return lhs !== rhs;
    case 'lt':  return lhs < rhs;
    case 'gt':  return lhs > rhs;
    case 'lte': return lhs <= rhs;
    case 'gte': return lhs >= rhs;
    default:    return false;
  }
}

// ── Value evaluation ───────────────────────────────────────────────────────

/** Evaluates a PLAYER-output block → player number (1-based), or null */
function evalPlayer(block: BlockNode, ctx: EvalContext): number | null {
  switch (block.type) {
    case 'player': {
      const num = block.fields?.['NUM'];
      return typeof num === 'number' ? num : null;
    }
    case 'player_var_get':
    case 'variables_get': {
      const id = getVarId(block.fields?.['VAR']);
      if (!id) return null;
      const val = ctx.variables.get(id);
      return typeof val === 'number' ? val : null;
    }
    default:
      return null;
  }
}

/** Evaluates a ZONE-output block → zone ID string, or null */
function evalZone(block: BlockNode, ctx: EvalContext): string | null {
  switch (block.type) {
    case 'zone_preset': {
      const zone = block.fields?.['ZONE'];
      return typeof zone === 'string' ? zone : null;
    }
    case 'zone_player_specific': {
      const zoneType = block.fields?.['ZONE_TYPE'] as string ?? 'hand';
      const playerBlock = block.inputs?.['PLAYER']?.block;
      if (!playerBlock) return null;
      const n = evalPlayer(playerBlock, ctx);
      return n !== null ? `player-${n}-${zoneType}` : null;
    }
    default:
      return null;
  }
}

// ── Components evaluation ──────────────────────────────────────────────────

/** Evaluates a COMPONENTS-output block → array of component IDs */
async function evalComponents(
  block: BlockNode,
  ctx: EvalContext,
  controller: TabletopController
): Promise<string[]> {
  switch (block.type) {
    case 'component_all': {
      // Returns the component type ID, not all instances. Instance expansion
      // is deferred to moveComponents on the controller.
      const id = block.fields?.['COMPONENT'] as string;
      return id && id !== '__none__' ? [id] : [];
    }
    case 'component_in_zone': {
      const id = block.fields?.['COMPONENT'] as string;
      if (!id || id === '__none__') return [];
      const zoneBlock = block.inputs?.['ZONE']?.block;
      if (!zoneBlock) return [];
      const zoneId = await evalZone(zoneBlock, ctx);
      if (!zoneId) return [];
      return controller.getComponentsInZone(id, zoneId);
    }
    case 'component_top': {
      const count = block.fields?.['COUNT'] as number ?? 1;
      const compBlock = block.inputs?.['COMPONENTS']?.block;
      if (!compBlock) return [];
      const all = await evalComponents(compBlock, ctx, controller);
      return all.slice(0, count);
    }
    case 'component_bottom': {
      const count = block.fields?.['COUNT'] as number ?? 1;
      const compBlock = block.inputs?.['COMPONENTS']?.block;
      if (!compBlock) return [];
      const all = await evalComponents(compBlock, ctx, controller);
      return all.slice(-count);
    }
    default:
      return [];
  }
}

// ── Statement evaluation ───────────────────────────────────────────────────

async function evalStatement(
  block: BlockNode,
  ctx: EvalContext,
  controller: TabletopController
): Promise<void> {
  switch (block.type) {
    case 'set_player_count': {
      const count = block.fields?.['COUNT'] as number ?? 2;
      applyPlayerCount(count, controller);
      break;
    }

    case 'determine_player_count': {
      const min = block.fields?.['MIN'] as number ?? 2;
      const max = block.fields?.['MAX'] as number ?? 4;
      const count = await controller.promptPlayerCount(min, max);
      applyPlayerCount(count, controller);
      break;
    }

    case 'component_move': {
      const compBlock = block.inputs?.['COMPONENTS']?.block;
      const toBlock   = block.inputs?.['TO_ZONE']?.block;
      if (!compBlock || !toBlock) break;
      const componentIds = await evalComponents(compBlock, ctx, controller);
      const toZone       = evalZone(toBlock, ctx);
      if (componentIds.length > 0 && toZone) {
        await controller.moveComponents(componentIds, toZone);
      }
      break;
    }

    case 'game_for_each_player': {
      const varId   = getVarId(block.fields?.['PLAYER_VAR']);
      const doBlock = block.inputs?.['DO']?.block;
      if (!doBlock) break;
      const count = controller.getPlayerCount();
      for (let i = 1; i <= count; i++) {
        // Each iteration gets an isolated copy of the variable map
        const loopCtx: EvalContext = { variables: new Map(ctx.variables) };
        if (varId) loopCtx.variables.set(varId, i);
        await evalStatements(doBlock, loopCtx, controller);
      }
      break;
    }

    case 'game_determine_first_player': {
      const varId  = getVarId(block.fields?.['VARIABLE']);
      const method = block.fields?.['METHOD'] as string ?? 'random';
      let playerNum: number;
      if (method === 'random') {
        playerNum = Math.floor(Math.random() * Math.max(1, controller.getPlayerCount())) + 1;
      } else {
        playerNum = await controller.promptChoosePlayer(controller.getPlayerCount());
      }
      // Store in context so future blocks can reference it via variables_get
      if (varId) ctx.variables.set(varId, playerNum);
      break;
    }

    case 'game_conditional': {
      const varName  = block.fields?.['VARIABLE'] as string ?? '';
      const operator = block.fields?.['OPERATOR'] as string ?? 'eq';
      const rawRhs   = block.fields?.['VALUE'];
      const rhs      = typeof rawRhs === 'number' ? rawRhs : parseFloat(String(rawRhs ?? '0'));
      const doBlock  = block.inputs?.['DO']?.block;

      let lhs: number | undefined;
      if (varName === 'Player Count') {
        lhs = controller.getPlayerCount();
      } else {
        console.warn(`[GameSetup] game_conditional: unrecognised variable "${varName}" — condition will not fire`);
      }

      if (lhs !== undefined && doBlock && compare(lhs, operator, rhs)) {
        await evalStatements(doBlock, ctx, controller);
      }
      break;
    }

    case 'zoom_view_all': {
      controller.zoomToFitAll();
      break;
    }

    case 'zoom_view_zone': {
      const zoneBlock = block.inputs?.['ZONE']?.block;
      if (!zoneBlock) break;
      const zoneId = evalZone(zoneBlock, ctx);
      if (zoneId) controller.zoomToFitZone(zoneId);
      break;
    }

    default:
      // Unknown / not-yet-implemented block → no-op
      break;
  }
}

async function evalStatements(
  firstBlock: BlockNode | undefined,
  ctx: EvalContext,
  controller: TabletopController
): Promise<void> {
  let block: BlockNode | undefined = firstBlock;
  while (block) {
    await evalStatement(block, ctx, controller);
    block = block.next?.block;
  }
}

// ── Public entry point ─────────────────────────────────────────────────────

/**
 * Interprets a serialised Blockly game-setup workspace against the provided
 * TabletopController. Awaits completion (including any UI dialogs).
 */
export async function runGameSetup(
  setupJson: string,
  controller: TabletopController
): Promise<void> {
  let state: unknown;
  try {
    state = JSON.parse(setupJson);
  } catch {
    console.error('[GameSetup] Failed to parse game setup JSON');
    return;
  }

  const typed = state as GameSetupState;
  const topBlocks: BlockNode[] = (typed.blocks as { blocks?: BlockNode[] })?.blocks ?? [];
  const setupBlock = topBlocks.find((b) => b.type === 'game_setup');
  if (!setupBlock) {
    console.warn('[GameSetup] No game_setup block found in workspace');
    return;
  }

  const firstStep = setupBlock.inputs?.['STEPS']?.block;
  const ctx: EvalContext = { variables: new Map() };
  await evalStatements(firstStep, ctx, controller);
}
