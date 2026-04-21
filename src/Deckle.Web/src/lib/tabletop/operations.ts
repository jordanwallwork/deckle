// Pure operations on TabletopState. Each function mutates the passed state
// in place — callers are responsible for wrapping in history management
// (see store.svelte.ts). Keeping these outside the store means they stay
// unit-testable and can be reused by the boardgame.io adapter in Phase 3.

import type {
  Entity,
  EntityTemplate,
  FreeformZone,
  GridZone,
  SpreadZone,
  StackZone,
  TabletopState,
  Zone,
  ZoneType,
  ZoneTypeSettingsCache
} from './types';
import { getTemplateDisplaySize } from './initialization';

/**
 * Extra padding (px) added to each side of a stack zone beyond its
 * defaultSize, giving the pile some visual breathing room and a drop
 * target slightly larger than a single card.
 */
export const STACK_ZONE_PADDING = 20;

function makeId(prefix = 'id'): string {
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  return `${prefix}-${suffix}`;
}

/** Normalize an angle to [0, 360). */
function normalizeDegrees(n: number): number {
  const r = n % 360;
  return r < 0 ? r + 360 : r;
}

function getEntity(state: TabletopState, instanceId: string) {
  const entity = state.entities[instanceId];
  if (!entity) {
    throw new Error(`Entity not found: ${instanceId}`);
  }
  return entity;
}

function getZone(state: TabletopState, zoneId: string): Zone {
  const zone = state.zones[zoneId];
  if (!zone) {
    throw new Error(`Zone not found: ${zoneId}`);
  }
  return zone;
}

/**
 * Register a freshly-constructed zone with the state: store it, append to
 * zoneOrder, and optionally enter edit/select mode. Used by every zone
 * creation path so the bookkeeping stays consistent.
 */
function registerZone(
  state: TabletopState,
  zone: Zone,
  opts: { edit?: boolean; select?: boolean } = {}
): void {
  state.zones[zone.id] = zone;
  state.zoneOrder.push(zone.id);
  if (opts.edit) state.editingZoneId = zone.id;
  if (opts.select) {
    state.selectedZoneId = zone.id;
    state.selectedEntityId = null;
  }
}

/**
 * Compute the layout step (px) between consecutive entities in a spread,
 * given its direction and defaultSize. Kept public so the renderer and
 * drop-target math use the same formula as the layout routine.
 *
 * Minimum step is 1px so a runaway overlap value can't collapse positions
 * or make the insert-index math divide by zero.
 */
export function getSpreadStep(zone: SpreadZone): number {
  const size = zone.defaultSize;
  if (!size) return 0;
  const primary = zone.direction === 'row' ? size.width : size.height;
  return Math.max(1, primary - zone.overlap);
}

/**
 * Place every entity in a grid zone into consecutive cells, filling
 * left-to-right then top-to-bottom. No-op for non-grid zones.
 */
export function layoutGrid(state: TabletopState, zoneId: string): void {
  const zone = state.zones[zoneId];
  if (!zone || zone.type !== 'grid') return;
  for (let i = 0; i < zone.entityIds.length; i++) {
    const entity = state.entities[zone.entityIds[i]];
    if (!entity) continue;
    entity.x = (i % zone.columns) * zone.cellWidth;
    entity.y = Math.floor(i / zone.columns) * zone.cellHeight;
  }
}

/**
 * Recompute the (x, y) of every entity in a spread zone based on its
 * index, direction, and overlap. Entities are laid flush to the zone's
 * origin along the primary axis and centred on the cross axis. No-op if
 * the zone isn't a spread or has no defaultSize yet.
 */
export function layoutSpread(state: TabletopState, zoneId: string): void {
  const zone = state.zones[zoneId];
  if (!zone || zone.type !== 'spread') return;
  const size = zone.defaultSize;
  if (!size) return;

  const step = getSpreadStep(zone);
  const crossAxis =
    zone.direction === 'row'
      ? (zone.height - size.height) / 2
      : (zone.width - size.width) / 2;

  for (let i = 0; i < zone.entityIds.length; i++) {
    const entity = state.entities[zone.entityIds[i]];
    if (!entity) continue;
    if (zone.direction === 'row') {
      entity.x = i * step;
      entity.y = crossAxis;
    } else {
      entity.x = crossAxis;
      entity.y = i * step;
    }
  }
}

/**
 * Derive the insert index for a drag drop at (localX, localY) within a
 * spread zone. Uses the same step as the layout so the position between
 * two cards maps to the index that visually lands there. `excludeId` is
 * filtered out first for same-zone reorders (where the dragged card's old
 * slot is about to vanish from the array).
 */
export function computeSpreadInsertIndex(
  zone: SpreadZone,
  localX: number,
  localY: number,
  excludeId?: string
): number {
  const ids = excludeId
    ? zone.entityIds.filter((id) => id !== excludeId)
    : zone.entityIds;
  if (ids.length === 0) return 0;
  const size = zone.defaultSize;
  if (!size) return ids.length;

  const step = getSpreadStep(zone);
  const pointer = zone.direction === 'row' ? localX : localY;
  const half = (zone.direction === 'row' ? size.width : size.height) / 2;
  const position = (pointer - half) / step;
  return Math.max(0, Math.min(ids.length, Math.floor(position + 1)));
}

/**
 * Set defaultSize on a spread zone from the given template's display size,
 * if it doesn't already have one. Called when the first entity lands in an
 * empty spread so subsequent layout / insert math has the dims it needs.
 */
export function ensureSpreadDefaultSize(
  state: TabletopState,
  zoneId: string,
  template: EntityTemplate
): void {
  const zone = state.zones[zoneId];
  if (!zone || zone.type !== 'spread') return;
  if (zone.defaultSize) return;
  const { width, height } = getTemplateDisplaySize(template);
  zone.defaultSize = { width, height };
}

/**
 * Snap (x, y) to the nearest grid cell origin within a grid zone.
 * Keeps positions inside the zone bounds.
 */
export function snapToGrid(
  zone: GridZone,
  x: number,
  y: number
): { x: number; y: number; index: number } {
  const col = Math.max(0, Math.min(zone.columns - 1, Math.round(x / zone.cellWidth)));
  const row = Math.max(0, Math.round(y / zone.cellHeight));
  return {
    x: col * zone.cellWidth,
    y: row * zone.cellHeight,
    index: row * zone.columns + col
  };
}

/**
 * Move an entity to a new (x, y) within its current zone.
 * Grid zones snap; stack zones ignore position (entities stack on top).
 */
export function moveEntity(
  state: TabletopState,
  instanceId: string,
  x: number,
  y: number
): void {
  const entity = getEntity(state, instanceId);
  const zone = getZone(state, entity.zoneId);

  if (zone.type === 'grid') {
    const snapped = snapToGrid(zone, x, y);
    entity.x = snapped.x;
    entity.y = snapped.y;
  } else if (zone.type === 'stack' || zone.type === 'spread') {
    // Stack and spread positions are derived from the layout — ignore free movement.
  } else {
    entity.x = x;
    entity.y = y;
  }
}

/**
 * If the given stack is non-persistent and has dropped to a single entity (or
 * fewer), dissolve the stack: promote the last entity to a non-stack zone at
 * the stack's old location, and remove the stack from state. A no-op for
 * persistent stacks, non-stack zones, or stacks with 2+ entities.
 */
function maybeAutoDissolveStack(state: TabletopState, zoneId: string): void {
  const zone = state.zones[zoneId];
  if (!zone || zone.type !== 'stack' || zone.persistent) return;
  if (zone.entityIds.length > 1) return;

  // Prefer a freeform zone so the promoted entity keeps its visual position;
  // fall back to any non-stack zone so it still has somewhere to live.
  const targetZone =
    Object.values(state.zones).find((z) => z.type === 'freeform' && z.id !== zoneId) ??
    Object.values(state.zones).find((z) => z.type !== 'stack' && z.id !== zoneId);

  if (zone.entityIds.length === 1 && targetZone) {
    const lastId = zone.entityIds[0];
    const entity = state.entities[lastId];
    if (entity) {
      const displayW = zone.defaultSize?.width ?? Math.max(0, zone.width - STACK_ZONE_PADDING * 2);
      const displayH = zone.defaultSize?.height ?? Math.max(0, zone.height - STACK_ZONE_PADDING * 2);
      const worldX = zone.x + zone.width / 2;
      const worldY = zone.y + zone.height / 2;
      const localX = worldX - targetZone.x - displayW / 2;
      const localY = worldY - targetZone.y - displayH / 2;

      zone.entityIds = [];
      entity.zoneId = targetZone.id;
      if (targetZone.type === 'freeform') {
        entity.x = localX;
        entity.y = localY;
      } else if (targetZone.type === 'grid') {
        const snapped = snapToGrid(targetZone, localX, localY);
        entity.x = snapped.x;
        entity.y = snapped.y;
      }
      targetZone.entityIds.push(lastId);
      if (targetZone.type === 'spread') {
        layoutSpread(state, targetZone.id);
      }
    }
  }

  delete state.zones[zoneId];
  state.zoneOrder = state.zoneOrder.filter((id) => id !== zoneId);
  if (state.selectedZoneId === zoneId) state.selectedZoneId = null;
}

/**
 * Move an entity from its current zone into another zone.
 * @param insertIndex  Position in the target zone's entityIds array; appended if omitted.
 * @param x,y          Position within the target zone (for freeform/grid).
 */
export function moveEntityToZone(
  state: TabletopState,
  instanceId: string,
  targetZoneId: string,
  opts: { insertIndex?: number; x?: number; y?: number } = {}
): void {
  const entity = getEntity(state, instanceId);
  const sourceZone = getZone(state, entity.zoneId);
  const targetZone = getZone(state, targetZoneId);
  const sourceZoneId = sourceZone.id;

  // Remove from source
  sourceZone.entityIds = sourceZone.entityIds.filter((id) => id !== instanceId);

  // Insert into target
  const ids = [...targetZone.entityIds];
  const index = opts.insertIndex ?? ids.length;
  ids.splice(index, 0, instanceId);
  targetZone.entityIds = ids;

  entity.zoneId = targetZoneId;

  // Update position based on target zone type
  if (targetZone.type === 'freeform') {
    entity.x = opts.x ?? 0;
    entity.y = opts.y ?? 0;
  } else if (targetZone.type === 'grid') {
    const snapped = snapToGrid(targetZone, opts.x ?? 0, opts.y ?? 0);
    entity.x = snapped.x;
    entity.y = snapped.y;
  } else if (targetZone.type === 'stack') {
    // stack — positions are derived
    entity.x = 0;
    entity.y = 0;
    // Preserve the entity's current flip state. Forcing it to the stack's
    // faceDown here would visibly flip a card whenever it was dropped back
    // onto its source stack.
    // Align rotation with the other cards in the stack so the pile looks
    // tidy; an empty stack has no reference, so the entity keeps its own
    // rotation.
    const referenceId = targetZone.entityIds.find((id) => id !== instanceId);
    if (referenceId) {
      const reference = state.entities[referenceId];
      if (reference) entity.rotation = reference.rotation;
    }
  } else {
    // spread — positions are set by layoutSpread
    entity.x = 0;
    entity.y = 0;
    layoutSpread(state, targetZoneId);
  }

  // Source stack may need to dissolve now that an entity has left it.
  if (sourceZoneId !== targetZoneId) {
    maybeAutoDissolveStack(state, sourceZoneId);
    // Re-layout the source spread so the gap left by the departing entity closes.
    if (state.zones[sourceZoneId]?.type === 'spread') {
      layoutSpread(state, sourceZoneId);
    }
  }
}

/** Move a zone to a new world-space (x, y). Entities inside keep their local positions. */
export function moveZone(state: TabletopState, zoneId: string, x: number, y: number): void {
  const zone = getZone(state, zoneId);
  zone.x = x;
  zone.y = y;
}

/**
 * Find the zone whose rectangle contains a world-space point, or null if none.
 * If zones overlap, returns the one drawn on top (last in zoneOrder).
 * @param excludeZoneId  Optional zone to skip (e.g. the zone being dragged).
 */
export function findZoneAtPoint(
  state: TabletopState,
  worldX: number,
  worldY: number,
  excludeZoneId?: string
): Zone | null {
  for (let i = state.zoneOrder.length - 1; i >= 0; i--) {
    const zone = state.zones[state.zoneOrder[i]];
    if (!zone) continue;
    if (zone.id === excludeZoneId) continue;
    if (
      worldX >= zone.x &&
      worldX < zone.x + zone.width &&
      worldY >= zone.y &&
      worldY < zone.y + zone.height
    ) {
      return zone;
    }
  }
  return null;
}

/** Toggle an entity's flipped state (front ↔ back). */
export function flipEntity(state: TabletopState, instanceId: string): void {
  const entity = getEntity(state, instanceId);
  entity.isFlipped = !entity.isFlipped;
}

/**
 * Rotate an entity by a delta (degrees). Positive = clockwise.
 * Result is normalized to [0, 360).
 */
export function rotateEntity(
  state: TabletopState,
  instanceId: string,
  delta: number
): void {
  const entity = getEntity(state, instanceId);
  entity.rotation = normalizeDegrees(entity.rotation + delta);
}

/** Set absolute rotation (degrees, normalized to [0, 360)). */
export function setRotation(
  state: TabletopState,
  instanceId: string,
  degrees: number
): void {
  const entity = getEntity(state, instanceId);
  entity.rotation = normalizeDegrees(degrees);
}

/**
 * Rotate every entity in a stack by the same delta so the pile stays aligned.
 * When delta crosses a 90° boundary, the zone's width/height are swapped so
 * the stack's bounding box matches the rotated top card — otherwise the card
 * would overflow the zone and be clipped. The zone's centre is preserved so
 * the pile rotates in place rather than drifting.
 * No-op for non-stack zones.
 */
export function rotateStack(
  state: TabletopState,
  zoneId: string,
  delta: number
): void {
  const zone = getZone(state, zoneId);
  if (zone.type !== 'stack') return;
  for (const id of zone.entityIds) {
    const entity = state.entities[id];
    if (!entity) continue;
    entity.rotation = normalizeDegrees(entity.rotation + delta);
  }

  const quarterTurns = Math.round(delta / 90);
  if (Math.abs(quarterTurns) % 2 === 1) {
    const oldWidth = zone.width;
    const oldHeight = zone.height;
    zone.width = oldHeight;
    zone.height = oldWidth;
    zone.x += (oldWidth - zone.width) / 2;
    zone.y += (oldHeight - zone.height) / 2;
    if (zone.defaultSize) {
      zone.defaultSize = {
        width: zone.defaultSize.height,
        height: zone.defaultSize.width
      };
    }
  }
}

/** Fisher–Yates shuffle returning a new array; pure helper used by both
 *  the immediate shuffle and the animation orchestrator (which needs to
 *  know the post-shuffle order in advance to pre-select cards to animate). */
export function computeShuffledOrder<T>(ids: readonly T[]): T[] {
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Fisher–Yates shuffle of a stack's entity order. No-op for other zone types.
 *  Pass `presetOrder` to apply a previously computed shuffle (e.g. one whose
 *  top card was chosen for an animation). Falls back to a fresh shuffle if
 *  the preset doesn't match the current entities. */
export function shuffleStack(
  state: TabletopState,
  zoneId: string,
  presetOrder?: readonly string[]
): void {
  const zone = getZone(state, zoneId);
  if (zone.type !== 'stack') return;
  if (presetOrder && presetOrder.length === zone.entityIds.length) {
    const current = new Set(zone.entityIds);
    if (presetOrder.every((id) => current.has(id))) {
      zone.entityIds = [...presetOrder];
      return;
    }
  }
  zone.entityIds = computeShuffledOrder(zone.entityIds);
}

/**
 * Toggle a stack's persistent flag. When switching to non-persistent with
 * ≤1 entities already present, the stack immediately dissolves.
 */
export function setStackPersistent(
  state: TabletopState,
  zoneId: string,
  persistent: boolean
): void {
  const zone = getZone(state, zoneId);
  if (zone.type !== 'stack') return;
  zone.persistent = persistent;
  if (!persistent) {
    maybeAutoDissolveStack(state, zoneId);
  }
}

/** Flip every entity in a stack to face-down (or face-up), reversing the order as a physical flip would. */
export function setStackFaceDown(
  state: TabletopState,
  zoneId: string,
  faceDown: boolean
): void {
  const zone = getZone(state, zoneId);
  if (zone.type !== 'stack') return;
  zone.faceDown = faceDown;
  zone.entityIds = [...zone.entityIds].reverse();
  for (const id of zone.entityIds) {
    const entity = state.entities[id];
    if (entity) entity.isFlipped = faceDown;
  }
}

/**
 * Toggle isFlipped on every entity in a zone. Unlike {@link setStackFaceDown},
 * this does NOT reverse order — grid/spread layouts are positional, so a
 * physical-style flip-and-reverse would scramble them.
 */
export function flipZoneEntities(state: TabletopState, zoneId: string): void {
  const zone = getZone(state, zoneId);
  for (const id of zone.entityIds) {
    const entity = state.entities[id];
    if (entity) entity.isFlipped = !entity.isFlipped;
  }
}

/**
 * Rotate every entity in a zone by the same delta (degrees). No layout or
 * zone-bounds adjustments — intended for spread/grid where each entity has
 * its own visible position. For stacks use {@link rotateStack}, which also
 * swaps the zone's width/height on quarter turns.
 */
export function rotateZoneEntities(
  state: TabletopState,
  zoneId: string,
  delta: number
): void {
  const zone = getZone(state, zoneId);
  for (const id of zone.entityIds) {
    const entity = state.entities[id];
    if (!entity) continue;
    entity.rotation = normalizeDegrees(entity.rotation + delta);
  }
}

/**
 * Shuffle the order of entityIds in a zone. For spread/grid, entities are
 * re-laid out so their visual positions match the new order. For stacks,
 * prefer {@link shuffleStack} (same effect; exists for parity with the
 * animation orchestrator in the store).
 */
export function shuffleZoneEntities(state: TabletopState, zoneId: string): void {
  const zone = getZone(state, zoneId);
  zone.entityIds = computeShuffledOrder(zone.entityIds);
  if (zone.type === 'spread') {
    layoutSpread(state, zoneId);
  } else if (zone.type === 'grid') {
    layoutGrid(state, zoneId);
  }
}

/**
 * Move an entity to a specific index within its own zone (reordering).
 * Useful for "send to front/back" in freeform zones and restacking.
 */
export function reorderInZone(
  state: TabletopState,
  instanceId: string,
  newIndex: number
): void {
  const entity = getEntity(state, instanceId);
  const zone = getZone(state, entity.zoneId);
  const filtered = zone.entityIds.filter((id) => id !== instanceId);
  const clamped = Math.max(0, Math.min(filtered.length, newIndex));
  filtered.splice(clamped, 0, instanceId);
  zone.entityIds = filtered;
  if (zone.type === 'spread') {
    layoutSpread(state, zone.id);
  }
}

/** Select an entity (null clears selection). Also clears zone selection. */
export function selectEntity(state: TabletopState, instanceId: string | null): void {
  state.selectedEntityId = instanceId;
  if (instanceId !== null) {
    state.selectedZoneId = null;
  }
}

/** Select a zone (null clears selection). Also clears entity selection. */
export function selectZone(state: TabletopState, zoneId: string | null): void {
  state.selectedZoneId = zoneId;
  if (zoneId !== null) {
    state.selectedEntityId = null;
  }
}

/**
 * Spawn a new entity from a template into the target zone.
 * Returns the new instance ID.
 *
 * `insertIndex` controls the position within the zone's entityIds — defaults
 * to the end. Only meaningful for ordered layouts (stack / spread); for
 * freeform/grid, position within the array is just z-order.
 */
export function spawnEntity(
  state: TabletopState,
  template: EntityTemplate,
  targetZoneId: string,
  x: number,
  y: number,
  mergeData: Record<string, string> | null = null,
  insertIndex?: number
): string {
  const zone = getZone(state, targetZoneId);
  const instanceId = makeId();

  if (zone.type === 'spread') {
    ensureSpreadDefaultSize(state, targetZoneId, template);
  }

  let entityX = 0;
  let entityY = 0;
  if (zone.type === 'freeform') {
    entityX = x;
    entityY = y;
  } else if (zone.type === 'grid') {
    const snapped = snapToGrid(zone, x, y);
    entityX = snapped.x;
    entityY = snapped.y;
  }

  const entity: Entity = {
    instanceId,
    templateId: template.id,
    zoneId: targetZoneId,
    x: entityX,
    y: entityY,
    rotation: 0,
    isFlipped: zone.type === 'stack' ? zone.faceDown : false,
    mergeData,
    label: template.name,
    locked: false
  };

  state.entities[instanceId] = entity;
  const ids = [...zone.entityIds];
  const idx = insertIndex ?? ids.length;
  const clamped = Math.max(0, Math.min(ids.length, idx));
  ids.splice(clamped, 0, instanceId);
  zone.entityIds = ids;

  if (zone.type === 'spread') {
    layoutSpread(state, targetZoneId);
  }

  return instanceId;
}

/**
 * Spawn one entity per template.instances entry, all at the same drop point.
 * Cards with a data source produce a pile of per-row instances; templates
 * without a data source fall back to a single entity.
 * Pass `instances` to spawn a subset (e.g. only the unplaced ones).
 *
 * For ordered zones (spread/stack), `insertIndex` positions the first new
 * entity; subsequent entities are inserted after it so the batch lands
 * contiguously in the order provided.
 */
export function spawnFromTemplate(
  state: TabletopState,
  template: EntityTemplate,
  targetZoneId: string,
  x: number,
  y: number,
  instances?: (Record<string, string> | null)[],
  insertIndex?: number
): string[] {
  const ids: string[] = [];
  let idx = insertIndex;
  for (const mergeData of (instances ?? template.instances)) {
    ids.push(spawnEntity(state, template, targetZoneId, x, y, mergeData, idx));
    if (idx !== undefined) idx++;
  }
  return ids;
}

function serializeMergeData(mergeData: Record<string, string> | null): string {
  if (mergeData === null) return 'null';
  const sorted = Object.keys(mergeData).sort();
  return JSON.stringify(Object.fromEntries(sorted.map((k) => [k, mergeData[k]])));
}

/**
 * Return the subset of template.instances that are not yet on the tabletop.
 * For data-source templates, identity is determined by mergeData content.
 * For non-data-source templates (all null mergeData), identity is by count.
 */
export function getUnplacedInstances(
  state: TabletopState,
  template: EntityTemplate
): (Record<string, string> | null)[] {
  const placed = Object.values(state.entities).filter((e) => e.templateId === template.id);

  if (template.instances.every((inst) => inst === null)) {
    const remaining = template.instances.length - placed.length;
    return remaining > 0 ? template.instances.slice(0, remaining) : [];
  }

  const placedKeys = new Set(placed.map((e) => serializeMergeData(e.mergeData)));
  return template.instances.filter((inst) => !placedKeys.has(serializeMergeData(inst)));
}

/**
 * Create a face-down stack zone centered on (worldX, worldY) and spawn
 * instances from the template into it. Pass `instances` to spawn a subset
 * (e.g. only the unplaced ones). Used when dragging a multi-instance template
 * (e.g. a card backed by a data source) onto the tabletop — the whole set
 * lands as a real pile rather than a heap of overlapping entities.
 */
export function spawnStackZoneFromTemplate(
  state: TabletopState,
  template: EntityTemplate,
  worldX: number,
  worldY: number,
  displayWidth: number,
  displayHeight: number,
  instances?: (Record<string, string> | null)[]
): { zoneId: string; instanceIds: string[] } {
  const width = displayWidth + STACK_ZONE_PADDING * 2;
  const height = displayHeight + STACK_ZONE_PADDING * 2;

  const zone: StackZone = {
    id: makeId('zone'),
    name: template.name,
    type: 'stack',
    x: worldX - width / 2,
    y: worldY - height / 2,
    width,
    height,
    faceDown: true,
    defaultSize: { width: displayWidth, height: displayHeight },
    persistent: false,
    entityIds: [],
    locked: false
  };

  registerZone(state, zone);

  const instanceIds = spawnFromTemplate(state, template, zone.id, 0, 0, instances);
  return { zoneId: zone.id, instanceIds };
}

/**
 * Find the topmost entity whose bounding box contains a world-space point,
 * skipping stack zones (only top card is interactive there) and an optional
 * excluded instance (the entity being dragged).
 *
 * For entities rotated by an odd quarter turn (90° / 270°) the visual
 * footprint is transposed; the AABB test uses the swapped dimensions so the
 * hit region matches what the user actually sees.
 */
export function findEntityAtPoint(
  state: TabletopState,
  templates: Record<string, EntityTemplate>,
  worldX: number,
  worldY: number,
  excludeInstanceId?: string
): Entity | null {
  for (let i = state.zoneOrder.length - 1; i >= 0; i--) {
    const zone = state.zones[state.zoneOrder[i]];
    if (!zone || zone.type === 'stack') continue;
    for (let j = zone.entityIds.length - 1; j >= 0; j--) {
      const entityId = zone.entityIds[j];
      if (entityId === excludeInstanceId) continue;
      const entity = state.entities[entityId];
      if (!entity) continue;
      const template = templates[entity.templateId];
      if (!template) continue;
      const { width, height } = getTemplateDisplaySize(template);
      const quarterTurns = Math.round(entity.rotation / 90);
      const isOddQuarterTurn = Math.abs(quarterTurns) % 2 === 1;
      const hitW = isOddQuarterTurn ? height : width;
      const hitH = isOddQuarterTurn ? width : height;
      // Entities render rotated about their centre, so the AABB stays anchored
      // at the same centre — shift the origin to match.
      const cx = zone.x + entity.x + width / 2;
      const cy = zone.y + entity.y + height / 2;
      const ex = cx - hitW / 2;
      const ey = cy - hitH / 2;
      if (worldX >= ex && worldX < ex + hitW && worldY >= ey && worldY < ey + hitH) {
        return entity;
      }
    }
  }
  return null;
}

/**
 * Create a new non-persistent stack zone at the target entity's location and
 * move both the dragged entity and the target entity into it. The target lands
 * at the bottom; the dragged entity goes on top. Returns the new zone id, or
 * null if the merge cannot proceed (type mismatch, target already in a stack).
 */
export function mergeEntitiesIntoStack(
  state: TabletopState,
  templates: Record<string, EntityTemplate>,
  draggedId: string,
  targetId: string
): string | null {
  const dragged = state.entities[draggedId];
  const target = state.entities[targetId];
  if (!dragged || !target) return null;

  const draggedTemplate = templates[dragged.templateId];
  const targetTemplate = templates[target.templateId];
  if (!draggedTemplate || !targetTemplate) return null;
  if (draggedTemplate.type !== targetTemplate.type) return null;

  const targetZone = state.zones[target.zoneId];
  // A card already in an ordered zone (stack/spread) uses that zone's own
  // insertion semantics — never form a new stack on top of it.
  if (!targetZone || targetZone.type === 'stack' || targetZone.type === 'spread') return null;

  const { width, height } = getTemplateDisplaySize(draggedTemplate);

  // If the target card is rotated by an odd number of 90° turns, its visual
  // footprint is transposed — the zone must match.
  const quarterTurns = Math.round(target.rotation / 90);
  const isOddQuarterTurn = Math.abs(quarterTurns) % 2 === 1;
  const zoneW = isOddQuarterTurn ? height : width;
  const zoneH = isOddQuarterTurn ? width : height;

  // Center the stack on the target entity's world position.
  const cx = targetZone.x + target.x + width / 2;
  const cy = targetZone.y + target.y + height / 2;

  const zone: StackZone = {
    id: makeId('zone'),
    name: draggedTemplate.name,
    type: 'stack',
    x: cx - zoneW / 2,
    y: cy - zoneH / 2,
    width: zoneW,
    height: zoneH,
    faceDown: false,
    defaultSize: { width: zoneW, height: zoneH },
    persistent: false,
    entityIds: [],
    locked: false
  };

  registerZone(state, zone);

  // Target goes first (bottom), dragged goes second (top).
  moveEntityToZone(state, targetId, zone.id);
  moveEntityToZone(state, draggedId, zone.id);

  return zone.id;
}

/**
 * Merge all entities from a dragged stack zone onto the top of a destination
 * stack zone, then remove the (now-empty) dragged zone. Both zones must have
 * matching defaultSize dimensions. Returns true on success, false if the merge
 * cannot proceed (type mismatch, same zone, missing defaultSize).
 */
export function mergeStackOntoStack(
  state: TabletopState,
  draggedZoneId: string,
  targetZoneId: string
): boolean {
  if (draggedZoneId === targetZoneId) return false;
  const draggedZone = state.zones[draggedZoneId];
  const targetZone = state.zones[targetZoneId];
  if (!draggedZone || !targetZone) return false;
  if (draggedZone.type !== 'stack' || targetZone.type !== 'stack') return false;

  const ds1 = draggedZone.defaultSize;
  const ds2 = targetZone.defaultSize;
  if (!ds1 || !ds2) return false;
  if (ds1.width !== ds2.width || ds1.height !== ds2.height) return false;

  // Align dragged entities to the target stack's rotation, then append them
  // on top (end of entityIds = top of stack).
  const referenceId = targetZone.entityIds[0];
  const referenceRotation = referenceId ? (state.entities[referenceId]?.rotation ?? 0) : null;

  for (const id of draggedZone.entityIds) {
    const entity = state.entities[id];
    if (!entity) continue;
    entity.zoneId = targetZoneId;
    entity.x = 0;
    entity.y = 0;
    if (referenceRotation !== null) entity.rotation = referenceRotation;
    targetZone.entityIds.push(id);
  }

  draggedZone.entityIds = [];
  delete state.zones[draggedZoneId];
  state.zoneOrder = state.zoneOrder.filter((id) => id !== draggedZoneId);
  if (state.selectedZoneId === draggedZoneId) state.selectedZoneId = null;
  if (state.editingZoneId === draggedZoneId) state.editingZoneId = null;

  return true;
}

/** Remove an entity entirely from the tabletop. */
export function removeEntity(state: TabletopState, instanceId: string): void {
  const entity = getEntity(state, instanceId);
  const zone = getZone(state, entity.zoneId);
  zone.entityIds = zone.entityIds.filter((id) => id !== instanceId);
  delete state.entities[instanceId];
  if (state.selectedEntityId === instanceId) {
    state.selectedEntityId = null;
  }
  maybeAutoDissolveStack(state, zone.id);
  if (state.zones[zone.id]?.type === 'spread') {
    layoutSpread(state, zone.id);
  }
}

/**
 * Remove all entities with the given templateId from the tabletop.
 * Empty non-persistent stacks are auto-dissolved afterward.
 */
export function removeAllEntitiesForTemplate(state: TabletopState, templateId: string): void {
  const toRemove = Object.values(state.entities)
    .filter((e) => e.templateId === templateId)
    .map((e) => e.instanceId);

  const affectedZoneIds = new Set<string>();
  for (const instanceId of toRemove) {
    const entity = state.entities[instanceId];
    if (!entity) continue;
    affectedZoneIds.add(entity.zoneId);
    const zone = state.zones[entity.zoneId];
    if (zone) zone.entityIds = zone.entityIds.filter((id) => id !== instanceId);
    delete state.entities[instanceId];
  }

  if (state.selectedEntityId && toRemove.includes(state.selectedEntityId)) {
    state.selectedEntityId = null;
  }

  for (const zoneId of affectedZoneIds) {
    maybeAutoDissolveStack(state, zoneId);
    if (state.zones[zoneId]?.type === 'spread') {
      layoutSpread(state, zoneId);
    }
  }
}

/**
 * Create a new spread zone and add it to the tabletop. The new zone is
 * returned with `locked: false` and with `editingZoneId` set so the UI
 * renders it in edit mode immediately.
 *
 * defaultSize is filled in lazily from the first entity that lands in the
 * spread (see `ensureSpreadDefaultSize`).
 */
export function createSpreadZone(
  state: TabletopState,
  x: number,
  y: number,
  width: number,
  height: number,
  direction: 'row' | 'column' = 'row',
  overlap = 40,
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
    direction,
    overlap,
    entityIds: [],
    locked: false
  };
  registerZone(state, zone, { edit: true, select: true });
  return zone.id;
}

/** Switch a spread zone's direction (row/column) and re-layout. No-op for other zone types. */
export function setSpreadDirection(
  state: TabletopState,
  zoneId: string,
  direction: 'row' | 'column'
): void {
  const zone = getZone(state, zoneId);
  if (zone.type !== 'spread') return;
  zone.direction = direction;
  layoutSpread(state, zoneId);
}

/** Update a spread zone's overlap (px) and re-layout. No-op for other zone types. */
export function setSpreadOverlap(
  state: TabletopState,
  zoneId: string,
  overlap: number
): void {
  const zone = getZone(state, zoneId);
  if (zone.type !== 'spread') return;
  zone.overlap = overlap;
  layoutSpread(state, zoneId);
}

/**
 * Create a new freeform zone and add it to the tabletop. The new zone is
 * returned with `locked: false` and with `editingZoneId` set so the UI
 * renders it in edit mode immediately.
 */
export function createFreeformZone(
  state: TabletopState,
  x: number,
  y: number,
  width: number,
  height: number,
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
    entityIds: [],
    locked: false
  };
  registerZone(state, zone, { edit: true, select: true });
  return zone.id;
}

/** Rename a zone. */
export function renameZone(state: TabletopState, zoneId: string, name: string): void {
  const zone = getZone(state, zoneId);
  zone.name = name;
}

/**
 * Resize a zone. Optional x/y accept a new top-left position, so drag-resize
 * from the top-left corner can shift the origin as well.
 */
export function resizeZone(
  state: TabletopState,
  zoneId: string,
  width: number,
  height: number,
  x?: number,
  y?: number
): void {
  const zone = getZone(state, zoneId);
  const MIN = 40;
  zone.width = Math.max(MIN, width);
  zone.height = Math.max(MIN, height);
  if (x !== undefined) zone.x = x;
  if (y !== undefined) zone.y = y;
}

/** Delete a zone and every entity it contains. */
export function deleteZone(state: TabletopState, zoneId: string): void {
  const zone = state.zones[zoneId];
  if (!zone) return;
  for (const id of [...zone.entityIds]) {
    delete state.entities[id];
  }
  delete state.zones[zoneId];
  state.zoneOrder = state.zoneOrder.filter((id) => id !== zoneId);
  if (state.selectedZoneId === zoneId) state.selectedZoneId = null;
  if (state.editingZoneId === zoneId) state.editingZoneId = null;
}

/** Enter/leave edit mode for a zone. Pass null to exit. */
export function setEditingZone(state: TabletopState, zoneId: string | null): void {
  state.editingZoneId = zoneId;
  if (zoneId !== null) {
    state.selectedZoneId = zoneId;
    state.selectedEntityId = null;
  }
}

/** Toggle lock on an entity. Locked entities cannot be dragged. */
export function setEntityLocked(
  state: TabletopState,
  instanceId: string,
  locked: boolean
): void {
  const entity = getEntity(state, instanceId);
  entity.locked = locked;
}

/** Toggle lock on a zone. Locked zones cannot be dragged or edited. */
export function setZoneLocked(state: TabletopState, zoneId: string, locked: boolean): void {
  const zone = getZone(state, zoneId);
  zone.locked = locked;
  if (locked && state.editingZoneId === zoneId) {
    state.editingZoneId = null;
  }
}

/**
 * Derive a defaultSize for a spread or stack zone from its first entity's
 * template, if any. Used when converting from a layout that doesn't track
 * entity sizes (freeform/grid) so the new layout has something to work with.
 */
function deriveDefaultSizeFromEntities(
  state: TabletopState,
  zone: Zone,
  templates: Record<string, EntityTemplate> | undefined
): { width: number; height: number } | undefined {
  if (!templates) return undefined;
  for (const entityId of zone.entityIds) {
    const entity = state.entities[entityId];
    if (!entity) continue;
    const template = templates[entity.templateId];
    if (!template) continue;
    return getTemplateDisplaySize(template);
  }
  return undefined;
}

/**
 * Convert a zone to a different type in-place, preserving its id, name,
 * position, dimensions, entities, and locked state. Type-specific settings
 * (face-down / persistent / direction / overlap / grid cell dims) are
 * preserved across round-trips via the zone's `typeSettings` cache; defaults
 * apply the first time a type is seen. `defaultSize` is carried forward from
 * the previous zone where applicable, and derived from the first entity's
 * template when converting from a layout without one.
 *
 * @param templates  Optional — needed to seed defaultSize from entities when
 *                   converting from freeform/grid into spread/stack.
 */
export function changeZoneType(
  state: TabletopState,
  zoneId: string,
  newType: ZoneType,
  templates?: Record<string, EntityTemplate>
): void {
  const zone = getZone(state, zoneId);
  if (zone.type === newType) return;

  const { id, name, x, y, width, height, entityIds, locked } = zone;
  const existingDefaultSize =
    'defaultSize' in zone && zone.defaultSize ? zone.defaultSize : undefined;

  // Snapshot the current type's settings into the cache so a later conversion
  // back to this type restores them.
  const cache: ZoneTypeSettingsCache = { ...(zone.typeSettings ?? {}) };
  if (zone.type === 'stack') {
    cache.stack = { faceDown: zone.faceDown, persistent: zone.persistent };
  } else if (zone.type === 'spread') {
    cache.spread = { direction: zone.direction, overlap: zone.overlap };
  } else if (zone.type === 'grid') {
    cache.grid = {
      cellWidth: zone.cellWidth,
      cellHeight: zone.cellHeight,
      columns: zone.columns
    };
  }

  const base = { id, name, x, y, width, height, entityIds, locked, typeSettings: cache };
  const defaultSize =
    existingDefaultSize ?? deriveDefaultSizeFromEntities(state, zone, templates);

  let newZone: Zone;
  switch (newType) {
    case 'freeform':
      newZone = { ...base, type: 'freeform' };
      break;
    case 'grid': {
      const prev = cache.grid;
      newZone = {
        ...base, type: 'grid',
        cellWidth: prev?.cellWidth ?? 80,
        cellHeight: prev?.cellHeight ?? 80,
        columns: prev?.columns ?? 5
      };
      break;
    }
    case 'stack': {
      const prev = cache.stack;
      newZone = {
        ...base, type: 'stack',
        faceDown: prev?.faceDown ?? false,
        persistent: prev?.persistent ?? true,
        defaultSize
      };
      break;
    }
    case 'spread': {
      const prev = cache.spread;
      newZone = {
        ...base, type: 'spread',
        direction: prev?.direction ?? 'row',
        overlap: prev?.overlap ?? 40,
        defaultSize
      };
      break;
    }
  }
  state.zones[zoneId] = newZone;
  if (newType === 'spread') {
    layoutSpread(state, zoneId);
  } else if (newType === 'grid') {
    layoutGrid(state, zoneId);
  } else if (newType === 'stack') {
    for (const id of newZone.entityIds) {
      const entity = state.entities[id];
      if (entity) { entity.x = 0; entity.y = 0; }
    }
  }
}

/** Update grid cell dimensions and column count, then reflow entities. No-op for non-grid zones. */
export function setGridCellSize(
  state: TabletopState,
  zoneId: string,
  cellWidth: number,
  cellHeight: number,
  columns: number
): void {
  const zone = getZone(state, zoneId);
  if (zone.type !== 'grid') return;
  zone.cellWidth = Math.max(1, cellWidth);
  zone.cellHeight = Math.max(1, cellHeight);
  zone.columns = Math.max(1, columns);
  layoutGrid(state, zoneId);
}

/** Draw the top card from a stack onto a target zone at (x, y). */
export function drawFromStack(
  state: TabletopState,
  stackZoneId: string,
  targetZoneId: string,
  x: number,
  y: number
): string | null {
  const stack = getZone(state, stackZoneId);
  if (stack.type !== 'stack' || stack.entityIds.length === 0) return null;
  const topId = stack.entityIds[stack.entityIds.length - 1];
  moveEntityToZone(state, topId, targetZoneId, { x, y });
  // Drawn cards face-up by default
  const entity = state.entities[topId];
  if (entity) entity.isFlipped = false;
  return topId;
}
