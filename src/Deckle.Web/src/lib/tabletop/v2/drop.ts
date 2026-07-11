// The shared drop resolver: every drop path — sidebar template drops, pile
// drags, multi-pile drags; "Move to zone" in a later ticket — resolves its
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

/** What is being dropped. */
export type DropPayload =
  | { kind: 'template'; templateId: string }
  | { kind: 'pile'; pileId: string }
  | { kind: 'piles'; pileIds: string[] };

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
  | {
      kind: 'multi';
      /** One sub-plan per dropped pile, in payload (selection) order. */
      plans: DropPlan[];
    }
  | { kind: 'none' };

const NONE: DropPlan = { kind: 'none' };

/**
 * The topmost pile (render order, excluding the dragged pile(s)) whose
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
  exclude?: string | readonly string[]
): Pile | null {
  const excluded = new Set(typeof exclude === 'string' ? [exclude] : (exclude ?? []));
  for (let i = state.rootPileIds.length - 1; i >= 0; i--) {
    const id = state.rootPileIds[i];
    if (excluded.has(id)) continue;
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
 *
 * Multi-pile payloads resolve each pile independently against the same
 * precedence: mergeable piles merge into the target under the pointer (in
 * payload order, so selection order becomes stacking order); the rest place
 * at their own centres. Dragged piles never count as merge targets for each
 * other.
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
    case 'piles': {
      const piles = payload.pileIds
        .map((id) => state.piles[id])
        .filter((p): p is Pile => p !== undefined);
      if (piles.length === 0) return NONE;
      const target = findPileAt(state, templates, world, payload.pileIds);
      const merging =
        target !== null && !target.locked && isPileMergeable(state, templates, target);
      const plans = piles.map(
        (pile): DropPlan =>
          merging && isPileMergeable(state, templates, pile)
            ? { kind: 'merge-piles', sourcePileId: pile.id, targetPileId: target.id }
            : { kind: 'place-pile', pileId: pile.id, x: pile.x, y: pile.y }
      );
      return { kind: 'multi', plans };
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
    case 'multi': {
      for (const sub of plan.plans) applyDropPlan(state, templates, sub);
      return;
    }
    case 'none':
      return;
  }
}
