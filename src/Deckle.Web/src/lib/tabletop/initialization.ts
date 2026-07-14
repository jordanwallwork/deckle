// Build an empty TabletopState plus the template record (with capability
// flags) from the project's components. The table starts truly empty — the
// root region needs no seeded zone.

import type { GameComponent } from '$lib/types';
import {
  isCard,
  isDice,
  isEditableComponent,
  isGameBoard,
  isPlayerMat
} from '$lib/utils/componentTypes';
import type { TabletopState, Template, Templates } from './types';
import { PX_PER_MM } from './geometry';

/** Assumed physical size for dice (standard d6) — dice components carry no dimensions. */
export const DICE_SIZE_MM = 16;

/** Faces per dice type; rolling reads the template's `faces` flag, never the component. */
const DICE_FACES: Record<string, number> = { D4: 4, D6: 6, D8: 8, D10: 10, D12: 12, D20: 20 };

export interface TabletopInitInput {
  components: GameComponent[];
  /** Data source rows keyed by component id. Omit for components without one. */
  componentRows?: Record<string, Record<string, string>[]>;
}

export interface TabletopInitResult {
  state: TabletopState;
  templates: Templates;
}

interface TemplateDimensions {
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
}

function getTemplateDimensions(c: GameComponent): TemplateDimensions {
  if (isEditableComponent(c)) {
    return {
      widthPx: c.dimensions.widthPx + 2 * c.dimensions.bleedPx,
      heightPx: c.dimensions.heightPx + 2 * c.dimensions.bleedPx,
      widthMm: c.dimensions.widthMm + 2 * c.dimensions.bleedMm,
      heightMm: c.dimensions.heightMm + 2 * c.dimensions.bleedMm
    };
  }
  if (isDice(c)) {
    const px = DICE_SIZE_MM * PX_PER_MM;
    return { widthPx: px, heightPx: px, widthMm: DICE_SIZE_MM, heightMm: DICE_SIZE_MM };
  }
  // Fallback: assume a 50mm square placeholder.
  return { widthPx: 100, heightPx: 100, widthMm: 50, heightMm: 50 };
}

/**
 * Expand data source rows into one instance per row, honouring a "Num" field
 * for duplicates (matches the export preview's behaviour). Falls back to a
 * single null instance when no rows are provided.
 */
export function buildInstances(
  rows: Record<string, string>[] | undefined
): (Record<string, string> | null)[] {
  if (!rows || rows.length === 0) return [null];
  const instances: (Record<string, string> | null)[] = [];
  for (const row of rows) {
    const numCopies = row.Num ? Math.max(1, Number.parseInt(row.Num, 10) || 1) : 1;
    for (let i = 0; i < numCopies; i++) {
      instances.push(row);
    }
  }
  return instances.length > 0 ? instances : [null];
}

/** Compute a template (dimensions + capability flags + instances) for one component. */
export function buildTemplate(
  c: GameComponent,
  rows: Record<string, string>[] | undefined
): Template {
  const { widthPx, heightPx, widthMm, heightMm } = getTemplateDimensions(c);
  const dice = isDice(c);
  return {
    id: c.id,
    name: c.name,
    widthPx,
    heightPx,
    widthMm,
    heightMm,
    mergeable: isCard(c),
    isContainer: isGameBoard(c) || isPlayerMat(c),
    flippable: !dice,
    faces: dice ? (DICE_FACES[c.diceType] ?? 6) : undefined,
    instances: dice ? Array.from({ length: Math.max(1, c.number) }, () => null) : buildInstances(rows)
  };
}

export function emptyTabletopState(): TabletopState {
  return {
    cards: {},
    piles: {},
    zones: {},
    zoneOrder: [],
    rootPileIds: [],
    selection: { kind: 'none' },
    editingZoneId: null
  };
}

export function buildInitialTabletop(input: TabletopInitInput): TabletopInitResult {
  const { components, componentRows = {} } = input;

  const templates: Templates = {};
  for (const c of components) {
    templates[c.id] = buildTemplate(c, componentRows[c.id]);
  }

  return { state: emptyTabletopState(), templates };
}
