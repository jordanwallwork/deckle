// Svelte 5 runes-based store for the tabletop sandbox.
//
// Design note: the template editor's store uses manual immutable updates.
// For Phase 1 we use Svelte 5's deep-reactive `$state` proxies, which give
// us the same developer ergonomics as Immer (mutate the draft) without an
// extra dependency. For history snapshots we use `structuredClone` — same
// strategy as `templateElements.ts`.

import type { TabletopState, EntityTemplate, ZoneType } from './types';
import * as ops from './operations';

const MAX_HISTORY = 100;

export interface TabletopStoreSnapshot {
  state: TabletopState;
}

/**
 * Pick which cards are rendered during the shuffle animation. The set must
 * include both the old top (visible before the shuffle) and the new top
 * (visible after); the rest is a random sample of the remaining stack to
 * make the fan-out feel populated.
 *
 * Returns the list in paint order: [newTop, ...extras, oldTop]. The old top
 * is painted last so the user sees what they were already looking at at t=0;
 * the renderer swaps z-indices mid-flight so the new top lands on top.
 */
export function pickShuffleAnimationCards(
  newOrder: readonly string[],
  oldTopId: string,
  maxCards: number
): string[] {
  const newTop = newOrder[newOrder.length - 1];
  const required = oldTopId === newTop ? [newTop] : [newTop, oldTopId];
  const requiredSet = new Set(required);

  const pool = newOrder.filter((id) => !requiredSet.has(id));
  const wantExtra = Math.min(Math.max(0, maxCards - required.length), pool.length);

  // Fisher–Yates partial sample
  for (let i = 0; i < wantExtra; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const extras = pool.slice(0, wantExtra);

  return oldTopId === newTop ? [newTop, ...extras] : [newTop, ...extras, oldTopId];
}

export function createTabletopStore(
  initialState: TabletopState,
  templates: Record<string, EntityTemplate>
) {
  // Deep-reactive state backing the whole tabletop.
  const store = $state<TabletopStoreSnapshot>({
    state: structuredClone(initialState)
  });

  let debugMode = $state(false);

  function toggleDebugMode(): void {
    debugMode = !debugMode;
    console.log(`[tabletop] debug mode ${debugMode ? 'enabled' : 'disabled'}`);
  }

  // Undo/redo stacks. Wrapped in $state so UI derivations
  // (canUndo/canRedo) react to pushes/pops.
  const history = $state<{ past: TabletopState[]; future: TabletopState[] }>({
    past: [],
    future: []
  });

  const canUndo = $derived(history.past.length > 0);
  const canRedo = $derived(history.future.length > 0);

  function snapshotState(): TabletopState {
    return structuredClone($state.snapshot(store.state)) as TabletopState;
  }

  function pushHistory(): void {
    history.past.push(snapshotState());
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.future.length = 0;
  }

  /**
   * Apply a mutation, saving the pre-mutation state to history.
   * Use `apply` for user-initiated actions that should be undoable.
   * Use `applyTransient` for drag updates; wrap those in saveCheckpoint()
   * at the start of the drag to get a single history entry per drag.
   */
  function apply(mutator: (state: TabletopState) => void, label?: string): void {
    if (debugMode && label) console.log(`[tabletop] ${label}`);
    pushHistory();
    mutator(store.state);
  }

  /** Apply without touching history. Use during drag to avoid flooding the stack. */
  function applyTransient(mutator: (state: TabletopState) => void): void {
    mutator(store.state);
  }

  /**
   * Wrap a pure operation so the store method pushes a history entry.
   * Result, if any, propagates to the caller.
   */
  function withHistory<Args extends unknown[], R>(
    op: (state: TabletopState, ...args: Args) => R,
    name: string
  ): (...args: Args) => R {
    return (...args: Args): R => {
      let result!: R;
      apply(
        (s) => {
          result = op(s, ...args);
        },
        `${name}(${args.join(', ')})`
      );
      return result;
    };
  }

  /** Wrap a pure operation so the store method skips history (drag-style). */
  function withoutHistory<Args extends unknown[], R>(
    op: (state: TabletopState, ...args: Args) => R
  ): (...args: Args) => R {
    return (...args: Args): R => {
      let result!: R;
      applyTransient((s) => {
        result = op(s, ...args);
      });
      return result;
    };
  }

  /**
   * Save the current state as a history entry. Call this at the start of
   * a transient sequence (e.g. on drag start) so undo returns to before it.
   */
  function saveCheckpoint(): void {
    pushHistory();
  }

  /** Discard the most recent history entry without mutating state. */
  function dropCheckpoint(): void {
    history.past.pop();
  }

  function undo(): void {
    if (history.past.length === 0) return;
    if (debugMode) console.log('[tabletop] undo');
    const previous = history.past.pop()!;
    history.future.push(snapshotState());
    store.state = previous;
  }

  function redo(): void {
    if (history.future.length === 0) return;
    if (debugMode) console.log('[tabletop] redo');
    const next = history.future.pop()!;
    history.past.push(snapshotState());
    store.state = next;
  }

  function reset(newState: TabletopState): void {
    history.past.length = 0;
    history.future.length = 0;
    store.state = structuredClone(newState);
  }

  // ─── Operation wrappers ────────────────────────────────────────────────
  // Each user-facing action wraps the pure operation with a history entry
  // (`withHistory`) or skips history for drag-style transient updates
  // (`withoutHistory`). Operations that need extra logic (template lookup,
  // animation orchestration, size seeding) stay as explicit functions below.

  const moveEntity = withHistory(ops.moveEntity, 'moveEntity');
  const moveEntityTransient = withoutHistory(ops.moveEntity);
  const moveZone = withHistory(ops.moveZone, 'moveZone');
  const moveZoneTransient = withoutHistory(ops.moveZone);
  const resizeZone = withHistory(ops.resizeZone, 'resizeZone');
  const resizeZoneTransient = withoutHistory(ops.resizeZone);
  const renameZone = withHistory(ops.renameZone, 'renameZone');
  const renameZoneTransient = withoutHistory(ops.renameZone);
  const setSpreadDirection = withHistory(ops.setSpreadDirection, 'setSpreadDirection');
  const setSpreadOverlap = withHistory(ops.setSpreadOverlap, 'setSpreadOverlap');
  const setSpreadOverlapTransient = withoutHistory(ops.setSpreadOverlap);
  const deleteZone = withHistory(ops.deleteZone, 'deleteZone');
  const nestZone = withHistory(ops.nestZone, 'nestZone');
  const unnestZone = withHistory(ops.unnestZone, 'unnestZone');
  const setEntityLocked = withHistory(ops.setEntityLocked, 'setEntityLocked');
  const setZoneLocked = withHistory(ops.setZoneLocked, 'setZoneLocked');
  const rollDie = withHistory(ops.rollDie, 'rollDie');
  const flipEntity = withHistory(ops.flipEntity, 'flipEntity');
  const rotateEntity = withHistory(ops.rotateEntity, 'rotateEntity');
  const rotateStack = withHistory(ops.rotateStack, 'rotateStack');
  const setRotation = withHistory(ops.setRotation, 'setRotation');
  const setStackFaceDown = withHistory(ops.setStackFaceDown, 'setStackFaceDown');
  const setStackFaceDownTransient = withoutHistory(ops.setStackFaceDown);
  const rotateZoneEntities = withHistory(ops.rotateZoneEntities, 'rotateZoneEntities');
  const shuffleZoneEntities = withHistory(ops.shuffleZoneEntities, 'shuffleZoneEntities');
  const setStackPersistent = withHistory(ops.setStackPersistent, 'setStackPersistent');
  const setStackPersistentTransient = withoutHistory(ops.setStackPersistent);
  const setGridCellSizeTransient = withoutHistory(ops.setGridCellSize);
  const reorderInZone = withHistory(ops.reorderInZone, 'reorderInZone');
  const createFreeformZone = withHistory(ops.createFreeformZone, 'createFreeformZone');
  const createSpreadZone = withHistory(ops.createSpreadZone, 'createSpreadZone');
  const createGroupZone = withHistory(ops.createGroupZone, 'createGroupZone');

  function spawnBoardZone(
    templateId: string,
    worldX: number,
    worldY: number,
    displayWidth: number,
    displayHeight: number
  ): string | null {
    const template = templates[templateId];
    if (!template) return null;
    let newId: string | null = null;
    apply((s) => {
      newId = ops.spawnBoardZone(s, template, worldX, worldY, displayWidth, displayHeight);
    }, `spawnBoardZone(${templateId})`);
    return newId;
  }

  function drawFromStack(stackZoneId: string, targetZoneId: string, x: number, y: number): string | null {
    let topId: string | null = null;
    apply((s) => {
      topId = ops.drawFromStack(s, stackZoneId, targetZoneId, x, y);
      ops.resizeStackZoneToContents(s, stackZoneId, templates);
    }, `drawFromStack(${stackZoneId}, ${targetZoneId})`);
    return topId;
  }

  function removeEntity(instanceId: string): void {
    const zoneId = store.state.entities[instanceId]?.zoneId;
    apply((s) => {
      ops.removeEntity(s, instanceId);
      if (zoneId) ops.resizeStackZoneToContents(s, zoneId, templates);
    }, `removeEntity(${instanceId})`);
  }

  function removeAllEntitiesForTemplate(templateId: string): void {
    const zoneIds = new Set<string>();
    for (const entity of Object.values(store.state.entities)) {
      if (entity.templateId === templateId) zoneIds.add(entity.zoneId);
    }
    apply((s) => {
      ops.removeAllEntitiesForTemplate(s, templateId);
      for (const zoneId of zoneIds) ops.resizeStackZoneToContents(s, zoneId, templates);
    }, `removeAllEntitiesForTemplate(${templateId})`);
  }

  // Selection is ephemeral — no history needed. Edit mode is UI state too.
  const selectEntity = withoutHistory(ops.selectEntity);
  const selectZone = withoutHistory(ops.selectZone);
  const setEditingZone = withoutHistory(ops.setEditingZone);

  // changeZoneType needs the templates record so it can seed defaultSize
  // from entities when converting freeform/grid → spread/stack.
  function changeZoneTypeTransient(zoneId: string, newType: ZoneType): void {
    applyTransient((s) => ops.changeZoneType(s, zoneId, newType, templates));
  }

  // ─── Operations that need more than a direct pass-through ──────────────

  // If the target is a spread that hasn't been sized yet, seed it from the
  // incoming entity's template before layout runs — otherwise `layoutSpread`
  // no-ops and all entities land at (0, 0).
  function ensureSpreadSizeFromEntity(s: TabletopState, instanceId: string, zoneId: string): void {
    const target = s.zones[zoneId];
    if (target?.type !== 'spread' || target.defaultSize) return;
    const entity = s.entities[instanceId];
    const template = entity ? templates[entity.templateId] : undefined;
    if (template) ops.ensureSpreadDefaultSize(s, zoneId, template);
  }

  // Template-bound spawn ops — can't use withHistory since they do a
  // templates lookup before dispatching to the pure operation.
  function moveEntityToZone(
    instanceId: string,
    zoneId: string,
    opts: { insertIndex?: number; x?: number; y?: number } = {}
  ): void {
    const entity = store.state.entities[instanceId];
    const template = entity ? templates[entity.templateId] : null;
    const targetZone = store.state.zones[zoneId];
    if (template && targetZone && !ops.isStackable(template) && targetZone.type !== 'freeform' && targetZone.type !== 'group') return;

    const sourceZoneId = store.state.entities[instanceId]?.zoneId;
    apply((s) => {
      ensureSpreadSizeFromEntity(s, instanceId, zoneId);
      ops.moveEntityToZone(s, instanceId, zoneId, opts);
      if (sourceZoneId && sourceZoneId !== zoneId) {
        ops.resizeStackZoneToContents(s, sourceZoneId, templates);
      }
      ops.resizeStackZoneToContents(s, zoneId, templates);
    }, `moveEntityToZone(${instanceId}, ${zoneId})`);
  }

  /**
   * Transient zone change during a drag (e.g. detaching the top of a stack).
   * Does not push history — the drag's initial saveCheckpoint covers the
   * whole interaction.
   */
  function moveEntityToZoneTransient(
    instanceId: string,
    zoneId: string,
    opts: { insertIndex?: number; x?: number; y?: number } = {}
  ): void {
    const entity = store.state.entities[instanceId];
    const template = entity ? templates[entity.templateId] : null;
    const targetZone = store.state.zones[zoneId];
    if (template && targetZone && !ops.isStackable(template) && targetZone.type !== 'freeform' && targetZone.type !== 'group') return;

    const sourceZoneId = store.state.entities[instanceId]?.zoneId;
    applyTransient((s) => {
      ensureSpreadSizeFromEntity(s, instanceId, zoneId);
      ops.moveEntityToZone(s, instanceId, zoneId, opts);
      if (sourceZoneId && sourceZoneId !== zoneId) {
        ops.resizeStackZoneToContents(s, sourceZoneId, templates);
      }
      ops.resizeStackZoneToContents(s, zoneId, templates);
    });
  }

  /**
   * Transient orchestration for the shuffle animation. The new order is
   * computed up-front so the renderer knows which card will end up on top
   * and can include it in the animation — preventing a visual pop when the
   * shuffle commits.
   */
  let shuffleAnimation = $state<{
    zoneId: string;
    newOrder: string[];
    animatedIds: string[];
  } | null>(null);

  /** Number of ghost cards rendered during the shuffle animation, capped by
   *  what the stack actually contains. Includes the old top + new top. */
  const SHUFFLE_ANIMATION_CARDS = 5;

  function shuffleStack(zoneId: string): void {
    const zone = store.state.zones[zoneId];
    if (!zone || zone.type !== 'stack') return;

    // Trivial cases — nothing visual to animate. Apply immediately.
    if (zone.entityIds.length < 2) {
      apply((s) => ops.shuffleStack(s, zoneId), `shuffleStack(${zoneId})`);
      return;
    }

    // Don't re-trigger an animation for a stack that's already shuffling.
    if (shuffleAnimation?.zoneId === zoneId) return;

    // A shuffle on a different zone is already running — commit it now so
    // its result isn't lost when we replace the transient state below.
    if (shuffleAnimation) completeShuffleAnimation();

    const newOrder = ops.computeShuffledOrder(zone.entityIds);
    const oldTop = zone.entityIds[zone.entityIds.length - 1];
    const animatedIds = pickShuffleAnimationCards(newOrder, oldTop, SHUFFLE_ANIMATION_CARDS);

    if (debugMode)
      console.log(`[tabletop] shuffleStack ${zoneId} (animated, ${animatedIds.length} cards)`);
    shuffleAnimation = { zoneId, newOrder, animatedIds };
  }

  /** Called by the renderer once the shuffle animation has completed. */
  function completeShuffleAnimation(): void {
    const pending = shuffleAnimation;
    if (!pending) return;
    shuffleAnimation = null;
    apply(
      (s) => ops.shuffleStack(s, pending.zoneId, pending.newOrder),
      `commit shuffleStack(${pending.zoneId})`
    );
  }

  /**
   * Transient animation hint for the wave flip on spread / grid zones.
   * `staggerMs` is the delay between consecutive entities in `zone.entityIds`
   * order; EntityWrapper applies it as `transition-delay`.
   */
  let zoneFlipAnimation = $state<{ zoneId: string; staggerMs: number } | null>(null);
  let zoneFlipAnimationTimer: ReturnType<typeof setTimeout> | null = null;

  const ZONE_FLIP_STAGGER_MS = 30;
  const ENTITY_FLIP_DURATION_MS = 350;

  function flipZoneEntities(zoneId: string): void {
    const zone = store.state.zones[zoneId];
    const count = zone?.entityIds.length ?? 0;
    const wave = (zone?.type === 'spread' || zone?.type === 'grid') && count > 1;

    if (wave) {
      zoneFlipAnimation = { zoneId, staggerMs: ZONE_FLIP_STAGGER_MS };
      if (zoneFlipAnimationTimer) clearTimeout(zoneFlipAnimationTimer);
      zoneFlipAnimationTimer = setTimeout(
        () => {
          zoneFlipAnimation = null;
          zoneFlipAnimationTimer = null;
        },
        ZONE_FLIP_STAGGER_MS * (count - 1) + ENTITY_FLIP_DURATION_MS
      );
    }

    apply((s) => ops.flipZoneEntities(s, zoneId), `flipZoneEntities(${zoneId})`);
  }

  function spawnEntity(templateId: string, zoneId: string, x: number, y: number): string | null {
    const template = templates[templateId];
    if (!template) return null;
    let newId: string | null = null;
    apply((s) => {
      newId = ops.spawnEntity(s, template, zoneId, x, y);
      ops.resizeStackZoneToContents(s, zoneId, templates);
    }, `spawnEntity(${templateId}, ${zoneId})`);
    return newId;
  }

  /**
   * Spawn instances at the drop point. Pass `instances` to spawn a subset
   * (e.g. only the unplaced ones); omit to spawn all template instances.
   * Cards with a data source expand to one entity per row; everything else
   * spawns a single entity. `insertIndex` positions the first new entity in
   * the zone's ordered array (default: append). Returns the new instance IDs.
   */
  function spawnFromTemplate(
    templateId: string,
    zoneId: string,
    x: number,
    y: number,
    instances?: (Record<string, string> | null)[],
    insertIndex?: number
  ): string[] {
    const template = templates[templateId];
    if (!template) return [];
    let newIds: string[] = [];
    apply(
      (s) => {
        newIds = ops.spawnFromTemplate(s, template, zoneId, x, y, instances, insertIndex);
        ops.resizeStackZoneToContents(s, zoneId, templates);
      },
      `spawnFromTemplate(${templateId}, ${zoneId}${insertIndex !== undefined ? `, @${insertIndex}` : ''})`
    );
    return newIds;
  }

  /**
   * Create a new group zone centered on (worldX, worldY) and spawn instances
   * from the template into it. Pass `instances` to spawn a subset (e.g. only
   * the unplaced ones); omit to spawn all template instances. Single undoable action.
   */
  function spawnGroupZoneFromTemplate(
    templateId: string,
    worldX: number,
    worldY: number,
    displayWidth: number,
    displayHeight: number,
    instances?: (Record<string, string> | null)[]
  ): { zoneId: string; instanceIds: string[] } | null {
    const template = templates[templateId];
    if (!template) return null;
    let result: { zoneId: string; instanceIds: string[] } | null = null;
    apply(
      (s) => {
        result = ops.spawnGroupZoneFromTemplate(s, template, worldX, worldY, displayWidth, displayHeight, instances);
      },
      `spawnGroupZoneFromTemplate(${templateId})`
    );
    return result;
  }

  /**
   * Create a new stack zone centered on (worldX, worldY) and spawn instances
   * from the template into it. Pass `instances` to spawn a subset (e.g. only
   * the unplaced ones); omit to spawn all template instances. Single undoable action.
   */
  function spawnStackZoneFromTemplate(
    templateId: string,
    worldX: number,
    worldY: number,
    displayWidth: number,
    displayHeight: number,
    instances?: (Record<string, string> | null)[]
  ): { zoneId: string; instanceIds: string[] } | null {
    const template = templates[templateId];
    if (!template) return null;
    if (!ops.isStackable(template)) return null;
    let result: { zoneId: string; instanceIds: string[] } | null = null;
    apply(
      (s) => {
        result = ops.spawnStackZoneFromTemplate(
          s,
          template,
          worldX,
          worldY,
          displayWidth,
          displayHeight,
          instances
        );
        if (result) ops.resizeStackZoneToContents(s, result.zoneId, templates);
      },
      `spawnStackZoneFromTemplate(${templateId})`
    );
    return result;
  }

  function mergeEntitiesIntoStack(draggedId: string, targetId: string): string | null {
    let zoneId: string | null = null;
    apply((s) => {
      zoneId = ops.mergeEntitiesIntoStack(s, templates, draggedId, targetId);
      if (zoneId) ops.resizeStackZoneToContents(s, zoneId, templates);
    }, `mergeEntitiesIntoStack(${draggedId}, ${targetId})`);
    return zoneId;
  }

  function mergeStackOntoStack(draggedZoneId: string, targetZoneId: string): boolean {
    let result = false;
    apply((s) => {
      result = ops.mergeStackOntoStack(s, draggedZoneId, targetZoneId);
      if (result) ops.resizeStackZoneToContents(s, targetZoneId, templates);
    }, `mergeStackOntoStack(${draggedZoneId}, ${targetZoneId})`);
    return result;
  }

  // Transient UI flag: an entity drag is currently hovering over the sidebar.
  // Used to show a visual removal indicator without touching undo history.
  let isDraggingOverSidebar = $state(false);

  function setDraggingOverSidebar(value: boolean): void {
    isDraggingOverSidebar = value;
  }

  /**
   * Transient UI hint: while an entity is being dragged over a spread zone,
   * record which zone and insertion index would receive it if dropped now.
   * Consumed by ZoneRenderer to draw a drop indicator between cards.
   */
  let spreadDropHover = $state<{ zoneId: string; index: number } | null>(null);

  function setSpreadDropHover(value: { zoneId: string; index: number } | null): void {
    spreadDropHover = value;
  }

  /**
   * Transient UI hint: the zone that would receive an entity/zone drop if
   * released now. Used by ZoneRenderer to highlight the destination zone
   * background during a drag.
   */
  let dropTargetZoneId = $state<string | null>(null);

  function setDropTargetZoneId(value: string | null): void {
    dropTargetZoneId = value;
  }

  return {
    /** The reactive state. Components may read but should mutate via methods. */
    get state() {
      return store.state;
    },
    get canUndo() {
      return canUndo;
    },
    get canRedo() {
      return canRedo;
    },
    templates,

    // History
    undo,
    redo,
    reset,
    saveCheckpoint,
    dropCheckpoint,

    // Operations
    moveEntity,
    moveEntityTransient,
    moveEntityToZone,
    moveEntityToZoneTransient,
    moveZone,
    moveZoneTransient,
    resizeZone,
    resizeZoneTransient,
    renameZone,
    renameZoneTransient,
    createFreeformZone,
    createSpreadZone,
    createGroupZone,
    spawnBoardZone,
    setSpreadDirection,
    setSpreadOverlap,
    setSpreadOverlapTransient,
    deleteZone,
    nestZone,
    unnestZone,
    setEditingZone,
    setEntityLocked,
    setZoneLocked,
    rollDie,
    flipEntity,
    rotateEntity,
    rotateStack,
    setRotation,
    shuffleStack,
    completeShuffleAnimation,
    get shuffleAnimation() {
      return shuffleAnimation;
    },
    get zoneFlipAnimation() {
      return zoneFlipAnimation;
    },
    setStackFaceDown,
    setStackFaceDownTransient,
    flipZoneEntities,
    rotateZoneEntities,
    shuffleZoneEntities,
    setStackPersistent,
    setStackPersistentTransient,
    changeZoneTypeTransient,
    setGridCellSizeTransient,
    reorderInZone,
    drawFromStack,
    spawnEntity,
    spawnFromTemplate,
    spawnGroupZoneFromTemplate,
    spawnStackZoneFromTemplate,
    mergeEntitiesIntoStack,
    mergeStackOntoStack,
    removeEntity,
    removeAllEntitiesForTemplate,
    selectEntity,
    selectZone,

    get isDraggingOverSidebar() {
      return isDraggingOverSidebar;
    },
    setDraggingOverSidebar,

    get spreadDropHover() {
      return spreadDropHover;
    },
    setSpreadDropHover,

    get dropTargetZoneId() {
      return dropTargetZoneId;
    },
    setDropTargetZoneId,

    toggleDebugMode
  };
}

export type TabletopStore = ReturnType<typeof createTabletopStore>;
