// Pure operations on TabletopState. Each function mutates the passed state
// in place — callers are responsible for wrapping in history management
// (see store.svelte.ts). Keeping these outside the store means they stay
// unit-testable and can be reused by the boardgame.io adapter in Phase 3.

import type { Entity, EntityTemplate, GridZone, StackZone, TabletopState, Zone } from './types';

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
    // Entities added to a face-down stack inherit its face-down state.
    entity.isFlipped = targetZone.faceDown;
  }
}

/**
 * Find the zone whose rectangle contains a world-space point, or null if none.
 * If zones overlap, returns the one drawn on top (last in zoneOrder).
 */
export function findZoneAtPoint(
  state: TabletopState,
  worldX: number,
  worldY: number
): Zone | null {
  for (let i = state.zoneOrder.length - 1; i >= 0; i--) {
    const zone = state.zones[state.zoneOrder[i]];
    if (!zone) continue;
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

/** Fisher–Yates shuffle of a stack's entity order. No-op for other zone types. */
export function shuffleStack(state: TabletopState, zoneId: string): void {
  const zone = getZone(state, zoneId);
  if (zone.type !== 'stack') return;
  const ids = [...zone.entityIds];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  zone.entityIds = ids;
}

/** Flip every entity in a stack to face-down (or face-up). */
export function setStackFaceDown(
  state: TabletopState,
  zoneId: string,
  faceDown: boolean
): void {
  const zone = getZone(state, zoneId);
  if (zone.type !== 'stack') return;
  zone.faceDown = faceDown;
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
  y: number
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
    mergeData: null,
    label: template.name
  };

  state.entities[instanceId] = entity;
  zone.entityIds.push(instanceId);
  return instanceId;
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
