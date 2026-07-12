// Zone lifecycle operations and the zone behaviour table (see SPEC "Zone
// behaviour strategy"). Zones are regions: they impose no content
// restrictions and never auto-delete. Like operations.ts, every function
// mutates the passed state in place — callers wrap them in the store's
// transaction/commit API.

import { flippablePiles, rotatablePiles } from './actions';
import type { Point, Rect } from './geometry';
import { pileFootprint, pointInRect, worldToZoneLocal, zoneWorldRect } from './geometry';
import { flipPile, makeId, rotatePile } from './operations';
import type { FreeformZone, SpreadZone, TabletopState, Templates, Zone } from './types';

/** Default footprint for zones created from the canvas context menu. */
export const NEW_ZONE_WIDTH = 300;
export const NEW_ZONE_HEIGHT = 200;

/** Smallest edge a resize can shrink a zone to. */
export const MIN_ZONE_SIZE = 40;

/** Px each pile overlaps the previous in a fresh spread (carried from v1). */
export const DEFAULT_SPREAD_OVERLAP = 40;

/** Inset from a spread's leading edge to its first pile. */
export const SPREAD_PADDING = 12;

/** Smallest per-slot advance, so a runaway overlap can't collapse the layout. */
export const MIN_SPREAD_STEP = 8;

export function getZone(state: TabletopState, zoneId: string): Zone {
  const zone = state.zones[zoneId];
  if (!zone) throw new Error(`Zone not found: ${zoneId}`);
  return zone;
}

// ─── Lifecycle ─────────────────────────────────────────────────────────────

/**
 * Create an empty top-level freeform zone with its top-left at (x, y) in
 * world space. The zone persists when empty — creation is the only way zones
 * appear (spawning components never creates them) and deletion the only way
 * they go.
 */
export function createFreeformZone(
  state: TabletopState,
  x: number,
  y: number,
  width = NEW_ZONE_WIDTH,
  height = NEW_ZONE_HEIGHT,
  name = 'New Zone'
): string {
  const zone: FreeformZone = {
    id: makeId('zone'),
    name,
    type: 'freeform',
    x,
    y,
    width,
    height,
    pileIds: [],
    locked: false
  };
  state.zones[zone.id] = zone;
  state.zoneOrder.push(zone.id);
  return zone.id;
}

/**
 * Create an empty top-level spread zone — the ordered strip for hands and
 * rivers — with its top-left at (x, y) in world space.
 */
export function createSpreadZone(
  state: TabletopState,
  x: number,
  y: number,
  width = NEW_ZONE_WIDTH,
  height = NEW_ZONE_HEIGHT,
  name = 'New Spread'
): string {
  const zone: SpreadZone = {
    id: makeId('zone'),
    name,
    type: 'spread',
    x,
    y,
    width,
    height,
    pileIds: [],
    locked: false,
    direction: 'row',
    overlap: DEFAULT_SPREAD_OVERLAP
  };
  state.zones[zone.id] = zone;
  state.zoneOrder.push(zone.id);
  return zone.id;
}

/** Switch a spread's direction and relayout immediately. No-op elsewhere. */
export function setSpreadDirection(
  state: TabletopState,
  templates: Templates,
  zoneId: string,
  direction: 'row' | 'column'
): void {
  const zone = state.zones[zoneId];
  if (zone?.type !== 'spread') return;
  zone.direction = direction;
  layoutSpread({ state, templates }, zone);
}

/** Set a spread's overlap (px, clamped ≥ 0) and relayout immediately. */
export function setSpreadOverlap(
  state: TabletopState,
  templates: Templates,
  zoneId: string,
  overlap: number
): void {
  const zone = state.zones[zoneId];
  if (zone?.type !== 'spread') return;
  zone.overlap = Math.max(0, overlap);
  layoutSpread({ state, templates }, zone);
}

/**
 * Delete a zone with its contents: every contained pile (and its cards) is
 * removed, nested child zones are deleted recursively, and the zone leaves
 * its container's render order.
 */
export function removeZone(state: TabletopState, zoneId: string): void {
  const zone = state.zones[zoneId];
  if (!zone) return;

  for (const pileId of [...zone.pileIds]) {
    const pile = state.piles[pileId];
    if (!pile) continue;
    for (const cardId of pile.cardIds) delete state.cards[cardId];
    delete state.piles[pileId];
  }
  zone.pileIds = [];

  if (zone.type === 'freeform' && zone.childZoneIds) {
    for (const childId of [...zone.childZoneIds]) removeZone(state, childId);
  }

  if (zone.parentZoneId !== undefined) {
    const parent = state.zones[zone.parentZoneId];
    if (parent?.type === 'freeform' && parent.childZoneIds) {
      const index = parent.childZoneIds.indexOf(zoneId);
      if (index !== -1) parent.childZoneIds.splice(index, 1);
    }
  } else {
    const index = state.zoneOrder.indexOf(zoneId);
    if (index !== -1) state.zoneOrder.splice(index, 1);
  }

  delete state.zones[zoneId];
}

export function renameZone(state: TabletopState, zoneId: string, name: string): void {
  getZone(state, zoneId).name = name;
}

/** Lock or unlock a zone. A locked zone refuses move/edit/delete and drops. */
export function setZoneLocked(state: TabletopState, zoneId: string, locked: boolean): void {
  getZone(state, zoneId).locked = locked;
}

/**
 * Move a zone so its top-left sits at (x, y) in world space, converting to
 * parent-local storage for nested zones. Contained piles are zone-local, so
 * they travel with it untouched.
 */
export function moveZoneTo(state: TabletopState, zoneId: string, x: number, y: number): void {
  const zone = getZone(state, zoneId);
  if (zone.parentZoneId !== undefined) {
    const parent = state.zones[zone.parentZoneId];
    if (parent) {
      const local = worldToZoneLocal(state, parent, { x, y });
      zone.x = local.x;
      zone.y = local.y;
      return;
    }
  }
  zone.x = x;
  zone.y = y;
}

/** Set a zone's rectangle in its stored (parent-local) frame. */
export function setZoneRect(state: TabletopState, zoneId: string, rect: Rect): void {
  const zone = getZone(state, zoneId);
  zone.x = rect.x;
  zone.y = rect.y;
  zone.width = Math.max(MIN_ZONE_SIZE, rect.width);
  zone.height = Math.max(MIN_ZONE_SIZE, rect.height);
}

export type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';

/**
 * The rectangle a corner-handle resize produces: the dragged corner follows
 * the pointer delta while the opposite corner stays fixed. Clamped to
 * MIN_ZONE_SIZE on both axes — when shrinking from the top/left the origin
 * is corrected so the zone never slides past its opposite edge.
 */
export function resizeRectFromCorner(
  start: Rect,
  corner: ResizeCorner,
  dx: number,
  dy: number
): Rect {
  const left = corner === 'nw' || corner === 'sw';
  const top = corner === 'nw' || corner === 'ne';

  let x = start.x + (left ? dx : 0);
  let y = start.y + (top ? dy : 0);
  let width = start.width + (left ? -dx : dx);
  let height = start.height + (top ? -dy : dy);

  if (width < MIN_ZONE_SIZE) {
    if (left) x = start.x + start.width - MIN_ZONE_SIZE;
    width = MIN_ZONE_SIZE;
  }
  if (height < MIN_ZONE_SIZE) {
    if (top) y = start.y + start.height - MIN_ZONE_SIZE;
    height = MIN_ZONE_SIZE;
  }
  return { x, y, width, height };
}

// ─── Hit-testing ───────────────────────────────────────────────────────────

/**
 * The topmost zone (render order) whose world rectangle contains the point,
 * or null when the point is over the open table (the root region). Top-level
 * zones only for now — nested zone targeting arrives with ticket 11.
 */
export function findZoneAt(
  state: TabletopState,
  world: Point,
  exclude?: string | readonly string[]
): Zone | null {
  const excluded = new Set(typeof exclude === 'string' ? [exclude] : (exclude ?? []));
  for (let i = state.zoneOrder.length - 1; i >= 0; i--) {
    const id = state.zoneOrder[i];
    if (excluded.has(id)) continue;
    const zone = state.zones[id];
    if (!zone) continue;
    if (pointInRect(world, zoneWorldRect(state, zone))) return zone;
  }
  return null;
}

// ─── Zone behaviour table ──────────────────────────────────────────────────
// One behaviour object per zone type, dispatched instead of type-conditionals.
// The root region shares the freeform behaviour. Freeform (06) and spread
// (07) are real; grid (09) and group (10) replace their placeholder entries.

export interface ZoneBehaviorContext {
  state: TabletopState;
  templates: Templates;
  /** Randomness source for shuffles; injectable so tests are deterministic. */
  random?: () => number;
}

/** Where a drop lands: a world-space pile centre plus the containing region. */
export interface DropPlacement {
  zoneId: string | null;
  x: number;
  y: number;
  /** Insert position in the zone's pile order — ordered zones (spreads) only. */
  index?: number;
}

export interface ZoneBehavior {
  /** True only for spreads — the one zone type where pile order is meaning. */
  ordered: boolean;
  /** Whether shuffleZone does anything here — drives S/menu applicability. */
  shuffleable: boolean;
  /**
   * Plan where an incoming pile lands. `zone` is null for the root region;
   * `world` is the intended drop centre (the pile's visual centre for drags,
   * the pointer for spawns and menu moves).
   */
  planDrop(ctx: ZoneBehaviorContext, zone: Zone | null, world: Point): DropPlacement;
  /** Re-derive contained pile positions (spreads); no-op elsewhere. */
  layout(ctx: ZoneBehaviorContext, zone: Zone): void;
  /** Hook for a pile leaving the zone (group: snap rotation); no-op elsewhere. */
  onLeave(ctx: ZoneBehaviorContext, zone: Zone, pileId: string): void;
  /** Zone-wide shuffle; no-op for freeform. */
  shuffleZone(ctx: ZoneBehaviorContext, zone: Zone): void;
}

const freeformBehavior: ZoneBehavior = {
  ordered: false,
  shuffleable: false,
  // At-point: the pile lands exactly where it visually sits.
  planDrop: (_ctx, zone, world) => ({ zoneId: zone?.id ?? null, x: world.x, y: world.y }),
  layout: () => {},
  onLeave: () => {},
  shuffleZone: () => {}
};

/**
 * Write a spread's pile positions into state: piles advance along the
 * primary axis in zone order, centred on the cross axis. The per-slot step
 * derives from each pile's own footprint, so heterogeneous sizes just work —
 * pile i+1 overlaps pile i by the zone's overlap, whatever pile i's size.
 * Positions are always truthful state; renderers never compute layout.
 */
function layoutSpread(ctx: ZoneBehaviorContext, zone: SpreadZone): void {
  const row = zone.direction === 'row';
  let cursor = SPREAD_PADDING;
  for (const pileId of zone.pileIds) {
    const pile = ctx.state.piles[pileId];
    if (!pile) continue;
    const footprint = pileFootprint(ctx.state, ctx.templates, pile);
    const extent = row ? footprint.width : footprint.height;
    pile.x = row ? cursor + extent / 2 : zone.width / 2;
    pile.y = row ? zone.height / 2 : cursor + extent / 2;
    cursor += Math.max(extent - zone.overlap, MIN_SPREAD_STEP);
  }
}

/**
 * The slot a drop at this world point inserts at: the number of piles whose
 * laid-out centre sits before the point along the spread's primary axis —
 * 0 before the first card, pileIds.length past the last. Layout keeps
 * centres monotonic in zone order, so a single forward scan suffices.
 */
export function spreadInsertIndex(
  state: TabletopState,
  zone: SpreadZone,
  world: Point
): number {
  const local = worldToZoneLocal(state, zone, world);
  const coord = zone.direction === 'row' ? local.x : local.y;
  let index = 0;
  for (const pileId of zone.pileIds) {
    const pile = state.piles[pileId];
    if (!pile) continue;
    if (coord <= (zone.direction === 'row' ? pile.x : pile.y)) break;
    index++;
  }
  return index;
}

const spreadBehavior: ZoneBehavior = {
  ordered: true,
  shuffleable: true,
  // Insert at the point-derived slot. The returned x/y are just the drop
  // point — the layout invariant assigns the real position at commit.
  planDrop: (ctx, zone, world) => {
    if (zone?.type !== 'spread') return freeformBehavior.planDrop(ctx, zone, world);
    return {
      zoneId: zone.id,
      x: world.x,
      y: world.y,
      index: spreadInsertIndex(ctx.state, zone, world)
    };
  },
  layout: (ctx, zone) => {
    if (zone.type === 'spread') layoutSpread(ctx, zone);
  },
  onLeave: () => {},
  // Permute the order (Fisher–Yates) and relayout — order is the only thing
  // a spread shuffle randomises.
  shuffleZone: (ctx, zone) => {
    if (zone.type !== 'spread' || zone.pileIds.length < 2) return;
    const random = ctx.random ?? Math.random;
    const ids = [...zone.pileIds];
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    zone.pileIds = ids;
    layoutSpread(ctx, zone);
  }
};

const behaviors: Record<Zone['type'], ZoneBehavior> = {
  freeform: freeformBehavior,
  // Placeholders until their tickets land — they place like freeform.
  grid: freeformBehavior,
  spread: spreadBehavior,
  group: freeformBehavior
};

/** The behaviour for a zone, or the root region's (freeform) for null. */
export function zoneBehavior(zone: Zone | null): ZoneBehavior {
  return zone === null ? freeformBehavior : behaviors[zone.type];
}

// ─── Zone-wide actions ─────────────────────────────────────────────────────
// Story 44: select all / flip all / rotate all / shuffle act on a whole
// zone's contents as one commit each. Flip/rotate reuse the selection-wide
// applicability rules from actions.ts, so the zone menu, F/R/S on a selected
// zone, and pile selections can never disagree about "applicable"; shuffle
// dispatches through the behaviour table (spread: permute order).

/** The piles a zone select-all takes: unlocked ones, in zone order. */
export function selectablePilesInZone(state: TabletopState, zoneId: string): string[] {
  const zone = state.zones[zoneId];
  if (!zone) return [];
  return zone.pileIds.filter((id) => {
    const pile = state.piles[id];
    return pile !== undefined && !pile.locked;
  });
}

/** Select every (unlocked) pile in the zone. Ephemeral — no history entry. */
export function selectAllInZone(state: TabletopState, zoneId: string): void {
  const pileIds = selectablePilesInZone(state, zoneId);
  state.selection = pileIds.length === 0 ? { kind: 'none' } : { kind: 'piles', pileIds };
}

/** Flip every applicable pile in the zone (the wave animation is ticket 13). */
export function flipAllInZone(state: TabletopState, templates: Templates, zoneId: string): void {
  const zone = state.zones[zoneId];
  if (!zone) return;
  for (const pileId of flippablePiles(state, templates, zone.pileIds)) {
    flipPile(state, templates, pileId);
  }
}

/** Rotate every applicable pile in the zone by the same delta. */
export function rotateAllInZone(state: TabletopState, zoneId: string, delta = 90): void {
  const zone = state.zones[zoneId];
  if (!zone) return;
  for (const pileId of rotatablePiles(state, zone.pileIds)) {
    rotatePile(state, pileId, delta);
  }
}

/** Zone shuffle, dispatched through the behaviour table. */
export function shuffleZoneContents(
  state: TabletopState,
  templates: Templates,
  zoneId: string,
  random: () => number = Math.random
): void {
  const zone = state.zones[zoneId];
  if (!zone) return;
  zoneBehavior(zone).shuffleZone({ state, templates, random }, zone);
}

// ─── Zone context menu ─────────────────────────────────────────────────────

export type ZoneAction =
  | 'edit'
  | 'select-all'
  | 'flip-all'
  | 'rotate-all'
  | 'shuffle'
  | 'lock'
  | 'unlock'
  | 'delete';

/**
 * Exactly the actions applicable to a zone, in menu order. A locked zone is
 * inert: it offers only Unlock (still clickable, per the lock story). The
 * zone-wide actions appear only when they would do something: each needs an
 * applicable pile, and shuffle needs a behaviour that shuffles plus an order
 * worth permuting.
 */
export function zoneActions(
  state: TabletopState,
  templates: Templates,
  zoneId: string
): ZoneAction[] {
  const zone = state.zones[zoneId];
  if (!zone) return [];
  if (zone.locked) return ['unlock'];

  const actions: ZoneAction[] = ['edit'];
  if (selectablePilesInZone(state, zoneId).length > 0) actions.push('select-all');
  if (flippablePiles(state, templates, zone.pileIds).length > 0) actions.push('flip-all');
  if (rotatablePiles(state, zone.pileIds).length > 0) actions.push('rotate-all');
  if (zoneBehavior(zone).shuffleable && zone.pileIds.length > 1) actions.push('shuffle');
  actions.push('lock', 'delete');
  return actions;
}
