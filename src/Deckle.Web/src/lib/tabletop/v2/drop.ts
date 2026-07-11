// The shared drop resolver: every drop path — sidebar template drops, pile
// drags, multi-pile drags, "Move to <zone>" menu moves — resolves its
// payload + world point to a DropPlan here, and the plan is applied inside a
// store commit. Renderers and shells never decide placement, and merge
// precedence over other placement is decided here, nowhere else.

import type { Point } from './geometry';
import { pileWorldCenter, pileWorldRect, pointInRect, zoneWorldRect } from './geometry';
import type { Pile, TabletopState, Templates, Zone } from './types';
import {
  detachPileToRoot,
  getUnplacedInstances,
  isPileMergeable,
  mergePiles,
  movePileTo,
  placePile,
  spawnPileFromTemplate
} from './operations';
import { findZoneAt, zoneBehavior } from './zones';

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
      /** Region the pile spawns into (null = root table). */
      zoneId: string | null;
      /** World-space pile centre. */
      x: number;
      y: number;
    }
  | { kind: 'merge-piles'; sourcePileId: string; targetPileId: string }
  | {
      kind: 'place-pile';
      pileId: string;
      /** Region the pile lands in (null = root table). */
      zoneId: string | null;
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
 * world-space footprint contains the world point — the candidate merge
 * target. Root piles render above zones, so they are searched first; then
 * zones top-down, each zone's piles top-down. Locked and non-mergeable piles
 * are still returned: they refuse the merge in the resolver, and resolution
 * falls through to placement rather than merging into whatever sits
 * underneath them.
 */
export function findPileAt(
  state: TabletopState,
  templates: Templates,
  world: Point,
  exclude?: string | readonly string[]
): Pile | null {
  const excluded = new Set(typeof exclude === 'string' ? [exclude] : (exclude ?? []));
  const hit = (ids: readonly string[]): Pile | null => {
    for (let i = ids.length - 1; i >= 0; i--) {
      const id = ids[i];
      if (excluded.has(id)) continue;
      const pile = state.piles[id];
      if (!pile) continue;
      if (pointInRect(world, pileWorldRect(state, templates, pile))) return pile;
    }
    return null;
  };

  const rootHit = hit(state.rootPileIds);
  if (rootHit) return rootHit;
  for (let i = state.zoneOrder.length - 1; i >= 0; i--) {
    const zone = state.zones[state.zoneOrder[i]];
    if (!zone) continue;
    const zoneHit = hit(zone.pileIds);
    if (zoneHit) return zoneHit;
  }
  return null;
}

/** Whether a merge onto this target is refused: the target pile is locked or
 *  it sits inside a locked zone (a locked zone refuses incoming drops). */
function refusesMerge(state: TabletopState, target: Pile): boolean {
  if (target.locked) return true;
  const zone = target.zoneId === null ? null : state.zones[target.zoneId];
  return zone !== undefined && zone !== null && zone.locked;
}

/**
 * The region a drop at this world point places into: the topmost zone under
 * the point whose lock doesn't refuse it, else the root table. A locked zone
 * refuses the drop entirely rather than passing it to whatever is beneath —
 * so the pile falls onto the root, keeping its visual position.
 */
function dropRegionAt(state: TabletopState, world: Point): Zone | null {
  const zone = findZoneAt(state, world);
  return zone === null || zone.locked ? null : zone;
}

/**
 * Resolve a drop against the current state.
 *
 * Template payloads spawn only the instances not already on the table (dedup
 * identity — see getUnplacedInstances); a fully-placed component resolves to
 * no-op. The spawn lands in the region under the pointer per that region's
 * drop rules.
 *
 * Pile payloads follow the universal precedence: a pile under the pointer
 * merges (dropped pile lands on top) when the target is unlocked (pile and
 * zone) and both sides are mergeable; otherwise the pointer's region places
 * the pile via its behaviour — for freeform and the root that keeps the pile
 * where it visually sits (its current world centre — transient drag frames
 * already track the pointer).
 *
 * Multi-pile payloads resolve each pile independently against the same
 * precedence: mergeable piles merge into the target under the pointer (in
 * payload order, so selection order becomes stacking order); the rest land
 * in the pointer's region at their own centres (story 41: every pile lands
 * in the drop zone under that zone's rules). Dragged piles never count as
 * merge targets for each other.
 */
export function resolveDrop(
  state: TabletopState,
  templates: Templates,
  payload: DropPayload,
  world: Point
): DropPlan {
  const ctx = { state, templates };
  switch (payload.kind) {
    case 'template': {
      const template = templates[payload.templateId];
      if (!template) return NONE;
      // Boards/mats spawn as container zones — that arrives with ticket 11.
      if (template.isContainer) return NONE;
      const instances = getUnplacedInstances(state, template);
      if (instances.length === 0) return NONE;
      const region = dropRegionAt(state, world);
      const placement = zoneBehavior(region).planDrop(ctx, region, world);
      return {
        kind: 'spawn-pile',
        templateId: template.id,
        instances,
        zoneId: placement.zoneId,
        x: placement.x,
        y: placement.y
      };
    }
    case 'pile': {
      const pile = state.piles[payload.pileId];
      if (!pile) return NONE;
      const target = findPileAt(state, templates, world, pile.id);
      if (
        target &&
        !refusesMerge(state, target) &&
        isPileMergeable(state, templates, pile) &&
        isPileMergeable(state, templates, target)
      ) {
        return { kind: 'merge-piles', sourcePileId: pile.id, targetPileId: target.id };
      }
      const region = dropRegionAt(state, world);
      const placement = zoneBehavior(region).planDrop(ctx, region, pileWorldCenter(state, pile));
      return { kind: 'place-pile', pileId: pile.id, zoneId: placement.zoneId, x: placement.x, y: placement.y };
    }
    case 'piles': {
      const piles = payload.pileIds
        .map((id) => state.piles[id])
        .filter((p): p is Pile => p !== undefined);
      if (piles.length === 0) return NONE;
      const target = findPileAt(state, templates, world, payload.pileIds);
      const merging =
        target !== null && !refusesMerge(state, target) && isPileMergeable(state, templates, target);
      const region = dropRegionAt(state, world);
      const behavior = zoneBehavior(region);
      const plans = piles.map((pile): DropPlan => {
        if (merging && isPileMergeable(state, templates, pile)) {
          return { kind: 'merge-piles', sourcePileId: pile.id, targetPileId: target.id };
        }
        const placement = behavior.planDrop(ctx, region, pileWorldCenter(state, pile));
        return { kind: 'place-pile', pileId: pile.id, zoneId: placement.zoneId, x: placement.x, y: placement.y };
      });
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
      const pileId = spawnPileFromTemplate(state, template, plan.instances, plan.x, plan.y);
      if (pileId !== null && plan.zoneId !== null) {
        placePile(state, pileId, plan.zoneId, plan.x, plan.y);
      }
      return;
    }
    case 'merge-piles': {
      mergePiles(state, plan.sourcePileId, plan.targetPileId);
      return;
    }
    case 'place-pile': {
      if (!state.piles[plan.pileId]) return;
      placePile(state, plan.pileId, plan.zoneId, plan.x, plan.y);
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

/**
 * The "Move to <zone>" context action, executed as a literal replay of a real
 * drag-and-drop so menu moves and drag moves can never disagree: pick the
 * pile up (detach to the root, on top), carry it to the zone's centre, and
 * release it there through the shared resolver — merging onto whatever pile
 * sits at that point exactly as a pointer drop would. No-op when the target
 * zone is missing or locked (a locked zone refuses drops, so the menu never
 * offers it). Call inside a store commit.
 */
export function movePileToZone(
  state: TabletopState,
  templates: Templates,
  pileId: string,
  zoneId: string
): void {
  const zone = state.zones[zoneId];
  if (!zone || zone.locked || !state.piles[pileId]) return;
  const rect = zoneWorldRect(state, zone);
  const center = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  detachPileToRoot(state, pileId);
  movePileTo(state, pileId, center.x, center.y);
  applyDropPlan(state, templates, resolveDrop(state, templates, { kind: 'pile', pileId }, center));
}

/**
 * The zones a pile can be sent to from its context menu: every unlocked zone
 * except the one it is already in, in render order.
 */
export function moveTargetZones(state: TabletopState, pileId: string): Zone[] {
  const pile = state.piles[pileId];
  if (!pile) return [];
  return state.zoneOrder
    .map((id) => state.zones[id])
    .filter((z): z is Zone => z !== undefined && !z.locked && z.id !== pile.zoneId);
}
