// Pure operations on TabletopState. Each function mutates the passed state
// in place — callers are responsible for wrapping in history management
// (see store.svelte.ts). Keeping these outside the store means they stay
// unit-testable and can be reused by the boardgame.io adapter in Phase 3.

import type {
  Entity,
  EntityTemplate,
  FreeformZone,
  GridZone,
  StackZone,
  TabletopState,
  Zone
} from './types';
import { getTemplateDisplaySize } from './initialization';

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
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
  } else if (zone.type === 'stack') {
    // Stack positions are derived from the stack — ignore free movement.
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
      const displayW = zone.defaultSize?.width ?? Math.max(0, zone.width - 40);
      const displayH = zone.defaultSize?.height ?? Math.max(0, zone.height - 40);
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
  } else {
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
  }

  // Source stack may need to dissolve now that an entity has left it.
  if (sourceZoneId !== targetZoneId) {
    maybeAutoDissolveStack(state, sourceZoneId);
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
  const next = (entity.rotation + delta) % 360;
  entity.rotation = next < 0 ? next + 360 : next;
}

/** Set absolute rotation (degrees, normalized to [0, 360)). */
export function setRotation(
  state: TabletopState,
  instanceId: string,
  degrees: number
): void {
  const entity = getEntity(state, instanceId);
  const next = degrees % 360;
  entity.rotation = next < 0 ? next + 360 : next;
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
    const next = (entity.rotation + delta) % 360;
    entity.rotation = next < 0 ? next + 360 : next;
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
 */
export function spawnEntity(
  state: TabletopState,
  template: EntityTemplate,
  targetZoneId: string,
  x: number,
  y: number,
  mergeData: Record<string, string> | null = null
): string {
  const zone = getZone(state, targetZoneId);
  const instanceId = makeId();

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
    isFlipped: zone.type === 'stack' ? (zone as StackZone).faceDown : false,
    mergeData,
    label: template.name,
    locked: false
  };

  state.entities[instanceId] = entity;
  zone.entityIds.push(instanceId);
  return instanceId;
}

/**
 * Spawn one entity per template.instances entry, all at the same drop point.
 * Cards with a data source produce a pile of per-row instances; templates
 * without a data source fall back to a single entity.
 * Pass `instances` to spawn a subset (e.g. only the unplaced ones).
 */
export function spawnFromTemplate(
  state: TabletopState,
  template: EntityTemplate,
  targetZoneId: string,
  x: number,
  y: number,
  instances?: (Record<string, string> | null)[]
): string[] {
  const ids: string[] = [];
  for (const mergeData of (instances ?? template.instances)) {
    ids.push(spawnEntity(state, template, targetZoneId, x, y, mergeData));
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
  const width = displayWidth;
  const height = displayHeight;

  const zone: StackZone = {
    id: makeId(),
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

  state.zones[zone.id] = zone;
  state.zoneOrder.push(zone.id);

  const instanceIds = spawnFromTemplate(state, template, zone.id, 0, 0, instances);
  return { zoneId: zone.id, instanceIds };
}

/**
 * Find the topmost entity whose bounding box contains a world-space point,
 * skipping stack zones (only top card is interactive there) and an optional
 * excluded instance (the entity being dragged).
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
      const ex = zone.x + entity.x;
      const ey = zone.y + entity.y;
      if (worldX >= ex && worldX < ex + width && worldY >= ey && worldY < ey + height) {
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
  if (!targetZone || targetZone.type === 'stack') return null;

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
    id: makeId(),
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

  state.zones[zone.id] = zone;
  state.zoneOrder.push(zone.id);

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

  const ds1 = (draggedZone as StackZone).defaultSize;
  const ds2 = (targetZone as StackZone).defaultSize;
  if (!ds1 || !ds2) return false;
  if (ds1.width !== ds2.width || ds1.height !== ds2.height) return false;

  // Align dragged entities to the target stack's rotation, then append them
  // on top (end of entityIds = top of stack).
  const referenceId = (targetZone as StackZone).entityIds[0];
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
  }
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
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? `zone-${crypto.randomUUID()}`
      : `zone-${Math.random().toString(36).slice(2)}`,
    name,
    type: 'freeform',
    x,
    y,
    width,
    height,
    entityIds: [],
    locked: false
  };
  state.zones[zone.id] = zone;
  state.zoneOrder.push(zone.id);
  state.editingZoneId = zone.id;
  state.selectedZoneId = zone.id;
  state.selectedEntityId = null;
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
