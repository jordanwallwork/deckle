// Zone lifecycle operations and the zone behaviour table (see SPEC "Zone
// behaviour strategy"). Zones are regions: they impose no content
// restrictions and never auto-delete. Like operations.ts, every function
// mutates the passed state in place — callers wrap them in the store's
// transaction/commit API.

import type { Point, Rect } from './geometry';
import { pointInRect, worldToZoneLocal, zoneWorldRect } from './geometry';
import { makeId } from './operations';
import type { FreeformZone, TabletopState, Templates, Zone } from './types';

/** Default footprint for zones created from the canvas context menu. */
export const NEW_ZONE_WIDTH = 300;
export const NEW_ZONE_HEIGHT = 200;

/** Smallest edge a resize can shrink a zone to. */
export const MIN_ZONE_SIZE = 40;

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
// The root region shares the freeform behaviour. Only freeform is real yet:
// spread (07), grid (09) and group (10) replace their placeholder entries.

export interface ZoneBehaviorContext {
  state: TabletopState;
  templates: Templates;
}

/** Where a drop lands: a world-space pile centre plus the containing region. */
export interface DropPlacement {
  zoneId: string | null;
  x: number;
  y: number;
}

export interface ZoneBehavior {
  /** True only for spreads — the one zone type where pile order is meaning. */
  ordered: boolean;
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
  // At-point: the pile lands exactly where it visually sits.
  planDrop: (_ctx, zone, world) => ({ zoneId: zone?.id ?? null, x: world.x, y: world.y }),
  layout: () => {},
  onLeave: () => {},
  shuffleZone: () => {}
};

const behaviors: Record<Zone['type'], ZoneBehavior> = {
  freeform: freeformBehavior,
  // Placeholders until their tickets land — they place like freeform.
  grid: freeformBehavior,
  spread: freeformBehavior,
  group: freeformBehavior
};

/** The behaviour for a zone, or the root region's (freeform) for null. */
export function zoneBehavior(zone: Zone | null): ZoneBehavior {
  return zone === null ? freeformBehavior : behaviors[zone.type];
}

// ─── Zone context menu ─────────────────────────────────────────────────────

export type ZoneAction = 'edit' | 'lock' | 'unlock' | 'delete';

/**
 * Exactly the actions applicable to a zone, in menu order. A locked zone is
 * inert: it offers only Unlock (still clickable, per the lock story).
 */
export function zoneActions(state: TabletopState, zoneId: string): ZoneAction[] {
  const zone = state.zones[zoneId];
  if (!zone) return [];
  if (zone.locked) return ['unlock'];
  return ['edit', 'lock', 'delete'];
}
