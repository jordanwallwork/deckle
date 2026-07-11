// The shared drop resolver: every drop path — sidebar template drops, pile
// drags; multi-drags and "Move to zone" in later tickets — resolves its
// payload + world point to a DropPlan here, and the plan is applied inside a
// store commit. Renderers and shells never decide placement, and merge
// precedence over other placement is decided here, nowhere else.

import type { Point } from './geometry';
import { pileRect, pointInRect } from './geometry';
import type { Pile, TabletopState, Templates } from './types';
import {
  getUnplacedInstances,
  isPileMergeable,
  mergePiles,
  movePileTo,
  spawnPileFromTemplate
} from './operations';

/** What is being dropped. Later tickets add multi-pile payloads. */
export type DropPayload =
  | { kind: 'template'; templateId: string }
  | { kind: 'pile'; pileId: string };

/** What the drop will do when applied. */
export type DropPlan =
  | {
      kind: 'spawn-pile';
      templateId: string;
      instances: (Record<string, string> | null)[];
      /** World-space pile centre. */
      x: number;
      y: number;
    }
  | { kind: 'merge-piles'; sourcePileId: string; targetPileId: string }
  | {
      kind: 'place-pile';
      pileId: string;
      /** World-space pile centre. */
      x: number;
      y: number;
    }
  | { kind: 'none' };

const NONE: DropPlan = { kind: 'none' };

/**
 * The topmost pile (render order, excluding the dragged pile itself) whose
 * footprint contains the world point — the candidate merge target. Locked
 * and non-mergeable piles are still returned: they refuse the merge in the
 * resolver, and resolution falls through to placement rather than merging
 * into whatever sits underneath them.
 *
 * Root piles only for now; zone piles join the search when zones arrive
 * (ticket 06).
 */
export function findPileAt(
  state: TabletopState,
  templates: Templates,
  world: Point,
  excludePileId?: string
): Pile | null {
  for (let i = state.rootPileIds.length - 1; i >= 0; i--) {
    const id = state.rootPileIds[i];
    if (id === excludePileId) continue;
    const pile = state.piles[id];
    if (!pile) continue;
    if (pointInRect(world, pileRect(state, templates, pile))) return pile;
  }
  return null;
}

/**
 * Resolve a drop against the current state.
 *
 * Template payloads spawn only the instances not already on the table (dedup
 * identity — see getUnplacedInstances); a fully-placed component resolves to
 * no-op.
 *
 * Pile payloads follow the universal precedence: a pile under the pointer
 * merges (dropped pile lands on top) when the target is unlocked and both
 * sides are mergeable; otherwise the pile is placed where it visually sits
 * (its current centre — transient drag frames already track the pointer).
 */
export function resolveDrop(
  state: TabletopState,
  templates: Templates,
  payload: DropPayload,
  world: Point
): DropPlan {
  switch (payload.kind) {
    case 'template': {
      const template = templates[payload.templateId];
      if (!template) return NONE;
      // Boards/mats spawn as container zones — that arrives with ticket 11.
      if (template.isContainer) return NONE;
      const instances = getUnplacedInstances(state, template);
      if (instances.length === 0) return NONE;
      return { kind: 'spawn-pile', templateId: template.id, instances, x: world.x, y: world.y };
    }
    case 'pile': {
      const pile = state.piles[payload.pileId];
      if (!pile) return NONE;
      const target = findPileAt(state, templates, world, pile.id);
      if (
        target &&
        !target.locked &&
        isPileMergeable(state, templates, pile) &&
        isPileMergeable(state, templates, target)
      ) {
        return { kind: 'merge-piles', sourcePileId: pile.id, targetPileId: target.id };
      }
      return { kind: 'place-pile', pileId: pile.id, x: pile.x, y: pile.y };
    }
  }
}

/** Apply a resolved plan to the state. Call inside a store commit. */
export function applyDropPlan(state: TabletopState, templates: Templates, plan: DropPlan): void {
  switch (plan.kind) {
    case 'spawn-pile': {
      const template = templates[plan.templateId];
      if (!template) return;
      spawnPileFromTemplate(state, template, plan.instances, plan.x, plan.y);
      return;
    }
    case 'merge-piles': {
      mergePiles(state, plan.sourcePileId, plan.targetPileId);
      return;
    }
    case 'place-pile': {
      if (!state.piles[plan.pileId]) return;
      movePileTo(state, plan.pileId, plan.x, plan.y);
      return;
    }
    case 'none':
      return;
  }
}
