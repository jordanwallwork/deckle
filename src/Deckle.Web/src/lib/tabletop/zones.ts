// Zone lifecycle operations and the zone behaviour table (see SPEC "Zone
// behaviour strategy"). Zones are regions: they impose no content
// restrictions and never auto-delete. Like operations.ts, every function
// mutates the passed state in place — callers wrap them in the store's
// transaction/commit API.

import { flippablePiles, rotatablePiles } from './actions';
import type { Point, Rect } from './geometry';
import {
  pileFootprint,
  pointInRect,
  worldToZoneLocal,
  zoneLocalToWorld,
  zoneWorldOrigin,
  zoneWorldRect
} from './geometry';
import {
  detachPileToRoot,
  flipPile,
  makeId,
  normalizeDegrees,
  rotatePile,
  snapToRightAngle
} from './operations';
import type {
  GridZone,
  FreeformZone,
  GroupZone,
  SpreadZone,
  TabletopState,
  Templates,
  Zone,
  ZoneType,
  ZoneTypeSettingsCache
} from './types';

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

/** Default cell footprint for a fresh grid — sized to seat a card with margin. */
export const DEFAULT_GRID_CELL_WIDTH = 150;
export const DEFAULT_GRID_CELL_HEIGHT = 200;
/** Default columns and initial rows a fresh grid is sized for. */
export const DEFAULT_GRID_COLUMNS = 4;
export const DEFAULT_GRID_ROWS = 3;
/** Smallest a cell edge or (for columns) the count may shrink to. */
export const MIN_GRID_CELL = 20;

/** How far (px, ± each axis) a group nudges an incoming pile from the drop point. */
export const GROUP_POSITION_JITTER = 24;

/** The cosmetic tilt (degrees, ±) a group applies to incoming/scattered piles. */
export const GROUP_ROTATION_JITTER = 12;

/** Inset (px) keeping a group re-scatter clear of the zone edges. */
export const GROUP_SCATTER_MARGIN = 24;

/** Widest an insertion band flanking a spread seam gets (px each side). */
export const SPREAD_INSERT_BAND_MAX = 16;

/** Fraction of a card's visible sliver each flanking insertion band claims. */
export const SPREAD_INSERT_BAND_FRACTION = 0.25;

export function getZone(state: TabletopState, zoneId: string): Zone {
  const zone = state.zones[zoneId];
  if (!zone) throw new Error(`Zone not found: ${zoneId}`);
  return zone;
}

/**
 * The nested child zone ids of `zone`, or an empty array when it is not a
 * freeform zone (the only zone kind that nests) or has no children. Returns the
 * live array for freeform zones, so callers may splice it to detach a child.
 */
export function freeformChildren(zone: Zone | undefined): string[] {
  return zone?.type === 'freeform' ? (zone.childZoneIds ?? []) : [];
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
 * Create a board/mat as a top-level freeform *container* zone: a region whose
 * background renders the named template's designed artwork (the `isContainer`
 * capability). Sized to physical scale so cards placed on it keep correct
 * relative sizes. This is the one case where spawning a component creates a
 * zone — every other spawn lands piles. Top-left at (x, y) in world space.
 */
export function createContainerZone(
  state: TabletopState,
  templateId: string,
  x: number,
  y: number,
  width: number,
  height: number,
  name: string
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
    locked: false,
    backgroundTemplateId: templateId
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
 * Create an empty top-level grid zone — the sparse snap-to-cell board — with
 * its top-left at (x, y) in world space. Sized by default to hold its default
 * grid (columns × cells wide, a few rows tall).
 */
export function createGridZone(
  state: TabletopState,
  x: number,
  y: number,
  width = DEFAULT_GRID_COLUMNS * DEFAULT_GRID_CELL_WIDTH,
  height = DEFAULT_GRID_ROWS * DEFAULT_GRID_CELL_HEIGHT,
  name = 'New Grid'
): string {
  const zone: GridZone = {
    id: makeId('zone'),
    name,
    type: 'grid',
    x,
    y,
    width,
    height,
    pileIds: [],
    locked: false,
    cellWidth: DEFAULT_GRID_CELL_WIDTH,
    cellHeight: DEFAULT_GRID_CELL_HEIGHT,
    columns: DEFAULT_GRID_COLUMNS
  };
  state.zones[zone.id] = zone;
  state.zoneOrder.push(zone.id);
  return zone.id;
}

/**
 * Create an empty top-level group zone — the scatter tray (a natural home
 * for dice) — with its top-left at (x, y) in world space. Incoming piles land
 * with a jittered position and tilt; leaving snaps rotation to the nearest
 * quarter turn.
 */
export function createGroupZone(
  state: TabletopState,
  x: number,
  y: number,
  width = NEW_ZONE_WIDTH,
  height = NEW_ZONE_HEIGHT,
  name = 'New Group'
): string {
  const zone: GroupZone = {
    id: makeId('zone'),
    name,
    type: 'group',
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

/** Set a grid's cell width (px, clamped ≥ MIN_GRID_CELL) and re-snap contents. */
export function setGridCellWidth(state: TabletopState, zoneId: string, cellWidth: number): void {
  const zone = state.zones[zoneId];
  if (zone?.type !== 'grid') return;
  zone.cellWidth = Math.max(MIN_GRID_CELL, cellWidth);
  snapGridToCells(state, zone);
}

/** Set a grid's cell height (px, clamped ≥ MIN_GRID_CELL) and re-snap contents. */
export function setGridCellHeight(state: TabletopState, zoneId: string, cellHeight: number): void {
  const zone = state.zones[zoneId];
  if (zone?.type !== 'grid') return;
  zone.cellHeight = Math.max(MIN_GRID_CELL, cellHeight);
  snapGridToCells(state, zone);
}

/** Set a grid's column count (integer, clamped ≥ 1) and re-snap contents. */
export function setGridColumns(state: TabletopState, zoneId: string, columns: number): void {
  const zone = state.zones[zoneId];
  if (zone?.type !== 'grid') return;
  zone.columns = Math.max(1, Math.floor(columns));
  snapGridToCells(state, zone);
}

// ─── Type conversion ────────────────────────────────────────────────────────
// Ticket 12: convert a populated zone between all four types in place, keeping
// its id, name, position, and contents. Per-type settings survive round-trips
// via the settings cache (spread direction/overlap, grid cell dims/columns);
// defaults apply the first time a type is seen. There is no per-type
// special-casing beyond the behaviour table + the settings cache: re-placing
// the contents (splaying a deck across a spread, seating piles on grid cells)
// is left entirely to the normalize invariants the caller runs at commit, and
// leaving a group snaps rotations to the nearest 90° via the shared onLeave
// hook — the same rule as dragging a pile out.

/**
 * The outgoing type's settings, merged over any previously cached ones, so a
 * later round-trip back to this type restores exactly what was configured.
 * Freeform and group carry no type-specific settings.
 */
function cacheZoneTypeSettings(zone: Zone): ZoneTypeSettingsCache {
  const cache: ZoneTypeSettingsCache = { ...zone.typeSettings };
  if (zone.type === 'spread') {
    cache.spread = { direction: zone.direction, overlap: zone.overlap };
  } else if (zone.type === 'grid') {
    cache.grid = { cellWidth: zone.cellWidth, cellHeight: zone.cellHeight, columns: zone.columns };
  }
  return cache;
}

/**
 * Convert a zone to `targetType` in place: id, name, position/size, lock
 * state, contents, and any parent nesting are preserved; the outgoing type's
 * settings are cached and the incoming type's restored (or defaulted). A no-op
 * when the zone is already that type or does not exist. The caller must run
 * normalize afterwards — that is what splays a multi-card pile across a new
 * spread and seats piles on a new grid's cells.
 */
export function convertZone(
  state: TabletopState,
  templates: Templates,
  zoneId: string,
  targetType: ZoneType
): void {
  const zone = state.zones[zoneId];
  if (!zone || zone.type === targetType) return;

  // Leaving the zone fires its onLeave hook for every pile (a group snaps each
  // card's cosmetic tilt to the nearest 90°; a no-op for the other types, so
  // this needs no type check).
  const behavior = zoneBehavior(zone);
  for (const pileId of zone.pileIds) {
    behavior.onLeave({ state, templates }, zone, pileId);
  }

  // Only freeform zones can host nested children; un-nest them to the root
  // (preserving world position) before dropping the freeform shape, so they
  // are never orphaned by the conversion.
  for (const childId of [...freeformChildren(zone)]) reparentZone(state, childId, null);

  const typeSettings = cacheZoneTypeSettings(zone);
  const base = {
    id: zone.id,
    name: zone.name,
    x: zone.x,
    y: zone.y,
    width: zone.width,
    height: zone.height,
    pileIds: zone.pileIds,
    locked: zone.locked,
    typeSettings,
    ...(zone.parentZoneId !== undefined ? { parentZoneId: zone.parentZoneId } : {})
  };

  let converted: Zone;
  switch (targetType) {
    case 'freeform':
      converted = { ...base, type: 'freeform' };
      break;
    case 'spread':
      converted = {
        ...base,
        type: 'spread',
        direction: typeSettings.spread?.direction ?? 'row',
        overlap: typeSettings.spread?.overlap ?? DEFAULT_SPREAD_OVERLAP
      };
      break;
    case 'grid':
      converted = {
        ...base,
        type: 'grid',
        cellWidth: typeSettings.grid?.cellWidth ?? DEFAULT_GRID_CELL_WIDTH,
        cellHeight: typeSettings.grid?.cellHeight ?? DEFAULT_GRID_CELL_HEIGHT,
        columns: typeSettings.grid?.columns ?? DEFAULT_GRID_COLUMNS
      };
      break;
    case 'group':
      converted = { ...base, type: 'group' };
      break;
  }

  state.zones[zoneId] = converted;
}

/**
 * Delete a zone with its contents: every contained pile (and its cards) is
 * removed, nested child zones are deleted recursively, and the zone leaves
 * its container's render order.
 */
export function removeZone(state: TabletopState, zoneId: string): void {
  const zone = state.zones[zoneId];
  if (!zone) return;

  for (const pileId of zone.pileIds) {
    const pile = state.piles[pileId];
    if (!pile) continue;
    for (const cardId of pile.cardIds) delete state.cards[cardId];
    delete state.piles[pileId];
  }
  zone.pileIds = [];

  for (const childId of [...freeformChildren(zone)]) removeZone(state, childId);

  if (zone.parentZoneId !== undefined) {
    const siblings = freeformChildren(state.zones[zone.parentZoneId]);
    const index = siblings.indexOf(zoneId);
    if (index !== -1) siblings.splice(index, 1);
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

// ─── Nesting ───────────────────────────────────────────────────────────────
// Freeform zones (boards/mats included) may contain child zones. Children
// store parent-local coordinates; the world-position helpers in geometry.ts
// walk the ancestry chain, so nothing jumps. Every nest/un-nest goes through
// reparentZone, which preserves the dragged zone's world origin.

/**
 * Every zone in render order, top-level first and each zone immediately
 * followed by its descendants (depth-first). Later in this list = rendered
 * on top, so a reverse scan finds the topmost/innermost zone first.
 */
export function renderOrderedZoneIds(state: TabletopState): string[] {
  const out: string[] = [];
  const visit = (id: string): void => {
    const zone = state.zones[id];
    if (!zone) return;
    out.push(id);
    for (const childId of freeformChildren(zone)) visit(childId);
  };
  for (const id of state.zoneOrder) visit(id);
  return out;
}

/**
 * All descendants of a zone (its children, their children, …) — the subtree
 * excluded from a zone drag's own hit-testing so a parent can never nest into
 * one of its own descendants.
 */
export function descendantZoneIds(state: TabletopState, zoneId: string): Set<string> {
  const out = new Set<string>();
  const visit = (id: string): void => {
    for (const childId of freeformChildren(state.zones[id])) {
      if (out.has(childId)) continue;
      out.add(childId);
      visit(childId);
    }
  };
  visit(zoneId);
  return out;
}

/**
 * The freeform zone a dragged zone would nest into if released here: the
 * topmost (innermost) freeform zone whose world rectangle contains `world`,
 * excluding the dragged zone and all its descendants (so a parent never nests
 * into its own child). Null means the open table — an un-nest. Freeform zones
 * are the only valid parents.
 */
export function findNestTarget(
  state: TabletopState,
  draggedZoneId: string,
  world: Point
): string | null {
  const excluded = descendantZoneIds(state, draggedZoneId);
  excluded.add(draggedZoneId);
  const ordered = renderOrderedZoneIds(state);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const id = ordered[i];
    if (excluded.has(id)) continue;
    const zone = state.zones[id];
    if (zone?.type !== 'freeform') continue;
    if (pointInRect(world, zoneWorldRect(state, zone))) return id;
  }
  return null;
}

/**
 * The parent a zone should nest into given its current position: the nest
 * target under its own world centre. Null = un-nest to the table. This is what
 * the reducer resolves at the end of a zone-header drag.
 */
export function zoneNestTarget(state: TabletopState, zoneId: string): string | null {
  const zone = state.zones[zoneId];
  if (!zone) return null;
  const rect = zoneWorldRect(state, zone);
  return findNestTarget(state, zoneId, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
}

/**
 * Re-parent a zone under a new freeform parent (or the root table when null),
 * keeping it visually stationary: its world origin is captured first, then its
 * stored coordinates are rewritten into the new frame (parent-local under a
 * parent, world at the root). Contained piles and further-nested zones are
 * stored relative to this zone, so they travel with it untouched. A no-op when
 * the parent is unchanged.
 */
export function reparentZone(
  state: TabletopState,
  zoneId: string,
  newParentId: string | null
): void {
  const zone = getZone(state, zoneId);
  const currentParentId = zone.parentZoneId ?? null;
  if (currentParentId === newParentId) return;
  if (newParentId !== null) {
    const parent = state.zones[newParentId];
    if (parent?.type !== 'freeform') return; // only freeform parents
  }

  const worldOrigin = zoneWorldOrigin(state, zone);

  // Detach from the current container (old parent's child list, or zoneOrder).
  if (currentParentId !== null) {
    const siblings = freeformChildren(state.zones[currentParentId]);
    const index = siblings.indexOf(zoneId);
    if (index !== -1) siblings.splice(index, 1);
  } else {
    const index = state.zoneOrder.indexOf(zoneId);
    if (index !== -1) state.zoneOrder.splice(index, 1);
  }

  // Attach to the new container and rewrite the stored coordinates so the
  // world origin is preserved.
  if (newParentId !== null) {
    const parent = state.zones[newParentId] as FreeformZone;
    zone.parentZoneId = newParentId;
    if (!parent.childZoneIds) parent.childZoneIds = [];
    parent.childZoneIds.push(zoneId);
    const parentOrigin = zoneWorldOrigin(state, parent);
    zone.x = worldOrigin.x - parentOrigin.x;
    zone.y = worldOrigin.y - parentOrigin.y;
  } else {
    delete zone.parentZoneId;
    state.zoneOrder.push(zoneId);
    zone.x = worldOrigin.x;
    zone.y = worldOrigin.y;
  }
}

// ─── Hit-testing ───────────────────────────────────────────────────────────

/**
 * The topmost zone (render order, nesting included) whose world rectangle
 * contains the point, or null when the point is over the open table (the root
 * region). Nested zones render on top of their parents, so an innermost child
 * wins over the board it sits on.
 */
export function findZoneAt(
  state: TabletopState,
  world: Point,
  exclude?: string | readonly string[]
): Zone | null {
  const excluded = new Set(typeof exclude === 'string' ? [exclude] : (exclude ?? []));
  const ordered = renderOrderedZoneIds(state);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const id = ordered[i];
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
  /**
   * A rotation delta (degrees) to apply to the placed pile's cards — group
   * zones only, for the cosmetic scatter tilt. Undefined leaves rotation
   * untouched.
   */
  rotationJitter?: number;
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
 * The primary-axis positions of a spread's insertion slots, zone-local:
 * slot k (k < pileIds.length) sits at pile k's leading edge — the visible
 * seam where it overlaps its predecessor — and the final slot at the last
 * pile's trailing edge. Always pileIds.length + 1 entries (a lone
 * SPREAD_PADDING entry when empty). Derived from current pile positions,
 * not the canonical layout, so a mid-drag gap keeps its slots where the
 * user actually sees them.
 */
export function spreadSlots(
  state: TabletopState,
  templates: Templates,
  zone: SpreadZone
): number[] {
  const row = zone.direction === 'row';
  const slots: number[] = [];
  let trailing = SPREAD_PADDING;
  for (const pileId of zone.pileIds) {
    const pile = state.piles[pileId];
    if (!pile) continue;
    const footprint = pileFootprint(state, templates, pile);
    const extent = row ? footprint.width : footprint.height;
    const centre = row ? pile.x : pile.y;
    slots.push(centre - extent / 2);
    trailing = centre + extent / 2;
  }
  slots.push(trailing);
  return slots;
}

/**
 * The slot a drop at this world point inserts at: the nearest insertion slot
 * along the spread's primary axis — 0 before the first card,
 * pileIds.length past the last. Nearest-seam (not a running count), so the
 * index transitions midway between two seams and always matches an
 * indicator rendered at the slot position.
 */
export function spreadInsertIndex(
  state: TabletopState,
  templates: Templates,
  zone: SpreadZone,
  world: Point
): number {
  const local = worldToZoneLocal(state, zone, world);
  const coord = zone.direction === 'row' ? local.x : local.y;
  const slots = spreadSlots(state, templates, zone);
  let index = 0;
  for (let k = 1; k < slots.length; k++) {
    if (Math.abs(coord - slots[k]) < Math.abs(coord - slots[index])) index = k;
  }
  return index;
}

/**
 * Merge-vs-insert disambiguation over a spread card (stories 24/25),
 * decided purely by pointer position: within the insertion band flanking
 * either seam of the target pile's visible sliver → insert at that seam's
 * slot; over the middle of the sliver → merge (null). Bands scale with the
 * sliver (capped at SPREAD_INSERT_BAND_MAX) so both gestures stay reachable
 * however tight the overlap, while a fully-visible card is mostly merge
 * surface.
 */
export function spreadInsertIntent(
  state: TabletopState,
  templates: Templates,
  zone: SpreadZone,
  targetPileId: string,
  world: Point
): number | null {
  const index = zone.pileIds.indexOf(targetPileId);
  if (index === -1) return null;
  const slots = spreadSlots(state, templates, zone);
  const local = worldToZoneLocal(state, zone, world);
  const coord = zone.direction === 'row' ? local.x : local.y;
  const start = slots[index];
  const end = slots[index + 1];
  const band = Math.max(
    0,
    Math.min(SPREAD_INSERT_BAND_MAX, (end - start) * SPREAD_INSERT_BAND_FRACTION)
  );
  if (coord <= start + band) return index;
  if (coord >= end - band) return index + 1;
  return null;
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
      index: spreadInsertIndex(ctx.state, ctx.templates, zone, world)
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

// ─── Grid cells ────────────────────────────────────────────────────────────
// A grid is a sparse board: cells are the positions things snap to and stay
// on. Cells tile from the zone's top-left; `columns` fixes the horizontal
// count and the rows follow from the zone height. Nothing stores a cell
// index — occupancy is always derived from pile positions, so a pile is on
// whatever cell its centre falls in.

/** Rows the grid's height affords (at least one). */
export function gridRows(zone: GridZone): number {
  return Math.max(1, Math.floor(zone.height / zone.cellHeight));
}

/** Stable key for a (col, row) cell. */
export function gridCellKey(col: number, row: number): string {
  return `${col},${row}`;
}

/** Zone-local centre of cell (col, row). */
export function gridCellCenter(zone: GridZone, col: number, row: number): Point {
  return { x: (col + 0.5) * zone.cellWidth, y: (row + 0.5) * zone.cellHeight };
}

/** The in-bounds cell a zone-local point falls in (clamped to the grid). */
export function gridCellAt(zone: GridZone, local: Point): { col: number; row: number } {
  const cols = Math.max(1, zone.columns);
  const rows = gridRows(zone);
  const col = Math.max(0, Math.min(cols - 1, Math.floor(local.x / zone.cellWidth)));
  const row = Math.max(0, Math.min(rows - 1, Math.floor(local.y / zone.cellHeight)));
  return { col, row };
}

/**
 * The cells currently holding a pile, derived from pile positions (a cell may
 * appear once however many piles overlap it). `exclude` drops one pile from
 * the reckoning — the one being placed.
 */
export function occupiedGridCells(
  state: TabletopState,
  zone: GridZone,
  exclude?: string
): Set<string> {
  const cells = new Set<string>();
  for (const pileId of zone.pileIds) {
    if (pileId === exclude) continue;
    const pile = state.piles[pileId];
    if (!pile) continue;
    const { col, row } = gridCellAt(zone, { x: pile.x, y: pile.y });
    cells.add(gridCellKey(col, row));
  }
  return cells;
}

/**
 * The free cell nearest a target cell (by centre distance), or null when the
 * grid is full. Row-major scan with a strict-less tie-break, so the search is
 * deterministic — the topmost-leftmost of equidistant cells wins.
 */
export function nearestFreeGridCell(
  zone: GridZone,
  target: { col: number; row: number },
  occupied: Set<string>
): { col: number; row: number } | null {
  const cols = Math.max(1, zone.columns);
  const rows = gridRows(zone);
  const centre = gridCellCenter(zone, target.col, target.row);
  let best: { col: number; row: number } | null = null;
  let bestDist = Infinity;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (occupied.has(gridCellKey(col, row))) continue;
      const c = gridCellCenter(zone, col, row);
      const dist = (c.x - centre.x) ** 2 + (c.y - centre.y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        best = { col, row };
      }
    }
  }
  return best;
}

/**
 * Snap every pile in a grid onto a distinct cell, in zone order: each pile
 * takes the cell under its centre if free, else the nearest free cell; when
 * the grid is full it overlaps on its own cell (the last resort). This is the
 * grid invariant — normalize runs it after every commit, and the setters run
 * it for immediate feedback. Idempotent: a pile already centred on a cell
 * stays put.
 */
export function snapGridToCells(state: TabletopState, zone: GridZone): void {
  const occupied = new Set<string>();
  for (const pileId of zone.pileIds) {
    const pile = state.piles[pileId];
    if (!pile) continue;
    const target = gridCellAt(zone, { x: pile.x, y: pile.y });
    let cell = target;
    if (occupied.has(gridCellKey(target.col, target.row))) {
      cell = nearestFreeGridCell(zone, target, occupied) ?? target;
    }
    occupied.add(gridCellKey(cell.col, cell.row));
    const centre = gridCellCenter(zone, cell.col, cell.row);
    pile.x = centre.x;
    pile.y = centre.y;
  }
}

const gridBehavior: ZoneBehavior = {
  ordered: false,
  shuffleable: true,
  // Snap the drop point to a cell: its own cell if free, else the nearest
  // free one; a full grid falls back to the point's cell (overlap). The
  // grid invariant re-checks this at commit, so collisions from a multi-drop
  // (which plans each pile against the same occupancy) still resolve.
  planDrop: (ctx, zone, world) => {
    if (zone?.type !== 'grid') return freeformBehavior.planDrop(ctx, zone, world);
    const local = worldToZoneLocal(ctx.state, zone, world);
    const target = gridCellAt(zone, local);
    const occupied = occupiedGridCells(ctx.state, zone);
    const cell = occupied.has(gridCellKey(target.col, target.row))
      ? (nearestFreeGridCell(zone, target, occupied) ?? target)
      : target;
    const centre = zoneLocalToWorld(ctx.state, zone, gridCellCenter(zone, cell.col, cell.row));
    return { zoneId: zone.id, x: centre.x, y: centre.y };
  },
  // Snapping is a normalize invariant, not a layout write — no-op here.
  layout: () => {},
  onLeave: () => {},
  // Permute which occupied cells the piles sit on: the set of occupied cells
  // is preserved (face-down tile setups survive a shuffle), only the piles
  // sitting on them are rearranged.
  shuffleZone: (ctx, zone) => {
    if (zone.type !== 'grid') return;
    const piles = zone.pileIds
      .map((id) => ctx.state.piles[id])
      .filter((p): p is NonNullable<typeof p> => p !== undefined);
    if (piles.length < 2) return;
    // Each pile's current cell — the multiset of cells to preserve.
    const cells = piles.map((p) => gridCellAt(zone, { x: p.x, y: p.y }));
    const random = ctx.random ?? Math.random;
    const order = [...piles];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((pile, i) => {
      const centre = gridCellCenter(zone, cells[i].col, cells[i].row);
      pile.x = centre.x;
      pile.y = centre.y;
    });
  }
};

// ─── Group scatter ───────────────────────────────────────────────────────────
// A group is a freeform region with organic scatter: incoming piles get a
// jittered position and a small tilt (a dice tray, a token pool), leaving
// snaps rotation to the nearest quarter turn (cosmetic jitter removed,
// deliberate orientation preserved), and shuffle re-scatters the contents.

/** Clamp `n` to [min, max] (max wins if the range inverts). */
function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

const groupBehavior: ZoneBehavior = {
  ordered: false,
  shuffleable: true,
  // Jitter the drop point within the zone and hand back a small rotation
  // delta (applied to the pile's cards at commit) — the organic scatter.
  planDrop: (ctx, zone, world) => {
    if (zone?.type !== 'group') return freeformBehavior.planDrop(ctx, zone, world);
    const random = ctx.random ?? Math.random;
    const local = worldToZoneLocal(ctx.state, zone, world);
    const jittered = {
      x: clamp(local.x + (random() * 2 - 1) * GROUP_POSITION_JITTER, 0, zone.width),
      y: clamp(local.y + (random() * 2 - 1) * GROUP_POSITION_JITTER, 0, zone.height)
    };
    const worldPt = zoneLocalToWorld(ctx.state, zone, jittered);
    return {
      zoneId: zone.id,
      x: worldPt.x,
      y: worldPt.y,
      rotationJitter: (random() * 2 - 1) * GROUP_ROTATION_JITTER
    };
  },
  layout: () => {},
  // Leaving the tray straightens the cosmetic tilt to the nearest 90°.
  onLeave: (ctx, zone, pileId) => {
    if (zone.type !== 'group') return;
    const pile = ctx.state.piles[pileId];
    if (!pile) return;
    for (const cardId of pile.cardIds) {
      const card = ctx.state.cards[cardId];
      if (card) card.rotation = snapToRightAngle(card.rotation);
    }
  },
  // Re-scatter: fresh jittered positions (inset from the edges) and a fresh
  // tilt for every pile — tumbling the tray.
  shuffleZone: (ctx, zone) => {
    if (zone.type !== 'group') return;
    const random = ctx.random ?? Math.random;
    const spanX = Math.max(0, zone.width - 2 * GROUP_SCATTER_MARGIN);
    const spanY = Math.max(0, zone.height - 2 * GROUP_SCATTER_MARGIN);
    for (const pileId of zone.pileIds) {
      const pile = ctx.state.piles[pileId];
      if (!pile) continue;
      pile.x = GROUP_SCATTER_MARGIN + random() * spanX;
      pile.y = GROUP_SCATTER_MARGIN + random() * spanY;
      // Re-tilt the pile as a whole: anchor on its first card and apply the
      // same delta to every card, so a multi-card pile keeps each card's
      // relative orientation (stories 7/9 — Scout, rotated piles) instead of
      // being flattened to one absolute angle. Delta-based, matching how
      // planDrop and onLeave already treat group rotation.
      const tilt = normalizeDegrees((random() * 2 - 1) * GROUP_ROTATION_JITTER);
      const anchor = ctx.state.cards[pile.cardIds[0]];
      if (anchor) rotatePile(ctx.state, pileId, tilt - anchor.rotation);
    }
  }
};

const behaviors: Record<Zone['type'], ZoneBehavior> = {
  freeform: freeformBehavior,
  grid: gridBehavior,
  spread: spreadBehavior,
  group: groupBehavior
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

/**
 * Pick a pile up onto the root, firing its source zone's `onLeave` hook
 * first (a group snaps each card's rotation to the nearest 90°). This is the
 * single "a pile leaves its zone" path — the reducer's detach-pile mutation
 * and "Move to <zone>" both route through here, so leaving a group always
 * straightens the scatter tilt regardless of gesture.
 */
export function detachPileFromZone(
  state: TabletopState,
  templates: Templates,
  pileId: string
): void {
  const pile = state.piles[pileId];
  if (pile && pile.zoneId !== null) {
    const zone = state.zones[pile.zoneId];
    if (zone) zoneBehavior(zone).onLeave({ state, templates }, zone, pileId);
  }
  detachPileToRoot(state, pileId);
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
