// The shared drop resolver: every drop path — sidebar template drops, pile
// drags, multi-pile drags, "Move to <zone>" menu moves — resolves its
// payload + world point to a DropPlan here, and the plan is applied inside a
// store commit. Renderers and shells never decide placement, and merge
// precedence over other placement — including the spread merge-vs-insert
// disambiguation (stories 24/25) — is decided here, nowhere else.

import type { Point } from './geometry';
import {
  pileWorldCenter,
  pileWorldRect,
  pointInRect,
  templateDisplaySize,
  zoneWorldRect
} from './geometry';
import type { Pile, SpreadZone, TabletopState, Templates, Zone } from './types';
import {
  getUnplacedInstances,
  isDiceTemplate,
  isPileMergeable,
  mergePiles,
  movePileTo,
  placePile,
  rotatePile,
  scatterAround,
  spawnPileFromTemplate
} from './operations';
import {
  createContainerZone,
  detachPileFromZone,
  findZoneAt,
  renderOrderedZoneIds,
  spreadInsertIndex,
  spreadInsertIntent,
  zoneBehavior
} from './zones';

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
      /** Insert slot in the zone's pile order — ordered zones only. */
      index?: number;
      /** Rotation delta applied to the spawned cards — group scatter tilt. */
      rotationJitter?: number;
    }
  | {
      /**
       * Boards/mats — the one spawn that creates a zone rather than piles: a
       * freeform container region rendering the template's artwork.
       */
      kind: 'spawn-zone';
      templateId: string;
      name: string;
      /** World-space top-left of the region. */
      x: number;
      y: number;
      width: number;
      height: number;
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
      /** Insert slot in the zone's pile order — ordered zones only. */
      index?: number;
      /** Rotation delta applied to the pile's cards — group scatter tilt. */
      rotationJitter?: number;
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
 * zones top-down (nesting included, innermost first), each zone's piles
 * top-down. Locked and non-mergeable piles
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
  const ordered = renderOrderedZoneIds(state);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const zone = state.zones[ordered[i]];
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
 * The zone the drop at this world point would place into, as an id — the
 * shells' hover highlight while a drag is over the table (null over the open
 * root region).
 */
export function dropTargetZoneAt(state: TabletopState, world: Point): string | null {
  return dropRegionAt(state, world)?.id ?? null;
}

/**
 * The unlocked spread containing this pile, or null. A drop landing on a
 * card that lives in a spread always resolves against that spread — merging
 * onto its face or inserting beside it — even where the card overhangs the
 * zone's rectangle, so pointer precision doesn't decay at zone edges.
 */
function spreadContaining(state: TabletopState, pile: Pile): SpreadZone | null {
  const zone = pile.zoneId === null ? undefined : state.zones[pile.zoneId];
  return zone !== undefined && zone.type === 'spread' && !zone.locked ? zone : null;
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
 * already track the pointer), while ordered zones derive the insert slot
 * from the pointer itself. One refinement inside spreads: the pointer
 * position alone disambiguates stacking on a card from slotting beside it —
 * the insertion band flanking a seam inserts even though it sits on a
 * card's footprint, and a refused merge over a spread card still lands in
 * that spread at the nearest slot.
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
  world: Point,
  random: () => number = Math.random
): DropPlan {
  const ctx = { state, templates, random };
  switch (payload.kind) {
    case 'template': {
      const template = templates[payload.templateId];
      if (!template) return NONE;
      // Boards/mats are the one spawn that creates a zone: a freeform
      // container region rendering the artwork, centred on the drop point at
      // physical scale.
      if (template.isContainer) {
        const { width, height } = templateDisplaySize(template);
        return {
          kind: 'spawn-zone',
          templateId: template.id,
          name: template.name,
          x: world.x - width / 2,
          y: world.y - height / 2,
          width,
          height
        };
      }
      const instances = getUnplacedInstances(state, template);
      if (instances.length === 0) return NONE;
      const region = dropRegionAt(state, world);
      const behavior = zoneBehavior(region);
      if (isDiceTemplate(template)) {
        // Multi-dice spawn: scatter one loose single-die pile per instance
        // around the drop point in whatever region was hit — spawning never
        // creates a zone. Each die still passes through the region's own drop
        // rules (a group re-jitters it; a grid seats it on a cell).
        const points = scatterAround(world, instances.length, random);
        const plans = instances.map((inst, i): DropPlan => {
          const placement = behavior.planDrop(ctx, region, points[i]);
          return {
            kind: 'spawn-pile',
            templateId: template.id,
            instances: [inst],
            zoneId: placement.zoneId,
            x: placement.x,
            y: placement.y,
            index: placement.index,
            rotationJitter: placement.rotationJitter
          };
        });
        return { kind: 'multi', plans };
      }
      const placement = behavior.planDrop(ctx, region, world);
      return {
        kind: 'spawn-pile',
        templateId: template.id,
        instances,
        zoneId: placement.zoneId,
        x: placement.x,
        y: placement.y,
        index: placement.index,
        rotationJitter: placement.rotationJitter
      };
    }
    case 'pile': {
      const pile = state.piles[payload.pileId];
      if (!pile) return NONE;
      const target = findPileAt(state, templates, world, pile.id);
      const targetSpread = target === null ? null : spreadContaining(state, target);
      if (target && targetSpread) {
        // Insert wins over merge inside the seam bands (story 24) …
        const bandIndex = spreadInsertIntent(state, templates, targetSpread, target.id, world);
        if (bandIndex !== null) {
          return {
            kind: 'place-pile',
            pileId: pile.id,
            zoneId: targetSpread.id,
            x: world.x,
            y: world.y,
            index: bandIndex
          };
        }
      }
      if (
        target &&
        !refusesMerge(state, target) &&
        isPileMergeable(state, templates, pile) &&
        isPileMergeable(state, templates, target)
      ) {
        // … and the card's face merges (story 25).
        return { kind: 'merge-piles', sourcePileId: pile.id, targetPileId: target.id };
      }
      if (targetSpread) {
        // A refused merge over a spread card (locked target, unmergeable
        // payload) still lands in the spread — nearest slot to the pointer.
        return {
          kind: 'place-pile',
          pileId: pile.id,
          zoneId: targetSpread.id,
          x: world.x,
          y: world.y,
          index: spreadInsertIndex(state, templates, targetSpread, world)
        };
      }
      const region = dropRegionAt(state, world);
      const behavior = zoneBehavior(region);
      // Ordered zones slot by the pointer; everything else keeps the pile
      // where it visually sits.
      const at = behavior.ordered ? world : pileWorldCenter(state, pile);
      const placement = behavior.planDrop(ctx, region, at);
      return {
        kind: 'place-pile',
        pileId: pile.id,
        zoneId: placement.zoneId,
        x: placement.x,
        y: placement.y,
        index: placement.index,
        rotationJitter: placement.rotationJitter
      };
    }
    case 'piles': {
      const piles = payload.pileIds
        .map((id) => state.piles[id])
        .filter((p): p is Pile => p !== undefined);
      if (piles.length === 0) return NONE;
      const target = findPileAt(state, templates, world, payload.pileIds);
      const targetSpread = target === null ? null : spreadContaining(state, target);
      // The seam bands disable merging for the whole group, exactly as for a
      // single pile; each pile then slots at its own centre-derived index.
      const bandInsert =
        target !== null && targetSpread !== null
          ? spreadInsertIntent(state, templates, targetSpread, target.id, world)
          : null;
      const merging =
        bandInsert === null &&
        target !== null &&
        !refusesMerge(state, target) &&
        isPileMergeable(state, templates, target);
      const region = targetSpread ?? dropRegionAt(state, world);
      const behavior = zoneBehavior(region);
      const plans = piles.map((pile): DropPlan => {
        if (merging && isPileMergeable(state, templates, pile)) {
          return { kind: 'merge-piles', sourcePileId: pile.id, targetPileId: target.id };
        }
        const placement = behavior.planDrop(ctx, region, pileWorldCenter(state, pile));
        return {
          kind: 'place-pile',
          pileId: pile.id,
          zoneId: placement.zoneId,
          x: placement.x,
          y: placement.y,
          index: placement.index,
          rotationJitter: placement.rotationJitter
        };
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
      if (pileId === null) return;
      if (plan.zoneId !== null) {
        placePile(state, pileId, plan.zoneId, plan.x, plan.y, plan.index);
      }
      if (plan.rotationJitter) rotatePile(state, pileId, plan.rotationJitter);
      return;
    }
    case 'spawn-zone': {
      if (!templates[plan.templateId]) return;
      createContainerZone(state, plan.templateId, plan.x, plan.y, plan.width, plan.height, plan.name);
      return;
    }
    case 'merge-piles': {
      mergePiles(state, plan.sourcePileId, plan.targetPileId);
      return;
    }
    case 'place-pile': {
      if (!state.piles[plan.pileId]) return;
      placePile(state, plan.pileId, plan.zoneId, plan.x, plan.y, plan.index);
      if (plan.rotationJitter) rotatePile(state, plan.pileId, plan.rotationJitter);
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
 * The insertion indicator's data (story 24): the spread slot the drop at
 * this point would insert at, or null when the drop wouldn't insert into a
 * spread — a merge onto a card's face, a non-spread region, a no-op, or a
 * multi-pile payload (whose piles each derive their own slot, so a single
 * indicator would lie). Derived from the resolver's own plan, so the
 * indicator can never disagree with where the card actually lands. A
 * transient render hint — never touches state or history.
 */
export interface SpreadInsertHint {
  zoneId: string;
  index: number;
}

export function spreadInsertHint(
  state: TabletopState,
  templates: Templates,
  payload: DropPayload,
  world: Point
): SpreadInsertHint | null {
  const plan = resolveDrop(state, templates, payload, world);
  if (plan.kind !== 'place-pile' && plan.kind !== 'spawn-pile') return null;
  if (plan.zoneId === null || plan.index === undefined) return null;
  return state.zones[plan.zoneId]?.type === 'spread'
    ? { zoneId: plan.zoneId, index: plan.index }
    : null;
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
  detachPileFromZone(state, templates, pileId);
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
  return renderOrderedZoneIds(state)
    .map((id) => state.zones[id])
    .filter((z): z is Zone => z !== undefined && !z.locked && z.id !== pile.zoneId);
}
