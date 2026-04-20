// Svelte 5 runes-based store for the tabletop sandbox.
//
// Design note: the template editor's store uses manual immutable updates.
// For Phase 1 we use Svelte 5's deep-reactive `$state` proxies, which give
// us the same developer ergonomics as Immer (mutate the draft) without an
// extra dependency. For history snapshots we use `structuredClone` — same
// strategy as `templateElements.ts`.

import type { TabletopState, EntityTemplate } from './types';
import * as ops from './operations';

const MAX_HISTORY = 100;

export interface TabletopStoreSnapshot {
  state: TabletopState;
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
  // Each user-facing action wraps the pure operation with a history entry.

  function moveEntity(instanceId: string, x: number, y: number): void {
    apply((s) => ops.moveEntity(s, instanceId, x, y), `moveEntity ${instanceId} → (${x}, ${y})`);
  }

  /** Transient variant used by drag handlers; does not push history. */
  function moveEntityTransient(instanceId: string, x: number, y: number): void {
    applyTransient((s) => ops.moveEntity(s, instanceId, x, y));
  }

  function moveEntityToZone(
    instanceId: string,
    zoneId: string,
    opts: { insertIndex?: number; x?: number; y?: number } = {}
  ): void {
    apply((s) => ops.moveEntityToZone(s, instanceId, zoneId, opts), `moveEntityToZone ${instanceId} → zone:${zoneId}`);
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
    applyTransient((s) => ops.moveEntityToZone(s, instanceId, zoneId, opts));
  }

  function moveZone(zoneId: string, x: number, y: number): void {
    apply((s) => ops.moveZone(s, zoneId, x, y), `moveZone ${zoneId} → (${x}, ${y})`);
  }

  /** Transient variant used by drag handlers; does not push history. */
  function moveZoneTransient(zoneId: string, x: number, y: number): void {
    applyTransient((s) => ops.moveZone(s, zoneId, x, y));
  }

  function resizeZone(
    zoneId: string,
    width: number,
    height: number,
    x?: number,
    y?: number
  ): void {
    apply((s) => ops.resizeZone(s, zoneId, width, height, x, y), `resizeZone ${zoneId} → ${width}×${height}`);
  }

  /** Transient variant used by resize-handle drag handlers. */
  function resizeZoneTransient(
    zoneId: string,
    width: number,
    height: number,
    x?: number,
    y?: number
  ): void {
    applyTransient((s) => ops.resizeZone(s, zoneId, width, height, x, y));
  }

  function renameZone(zoneId: string, name: string): void {
    apply((s) => ops.renameZone(s, zoneId, name), `renameZone ${zoneId} → "${name}"`);
  }

  /**
   * Transient rename used by the in-edit name input. The surrounding edit
   * session already owns a single history entry via saveCheckpoint().
   */
  function renameZoneTransient(zoneId: string, name: string): void {
    applyTransient((s) => ops.renameZone(s, zoneId, name));
  }

  function createFreeformZone(
    x: number,
    y: number,
    width: number,
    height: number,
    name?: string
  ): string {
    let newId = '';
    apply((s) => {
      newId = ops.createFreeformZone(s, x, y, width, height, name);
    }, `createFreeformZone "${name ?? ''}" at (${x}, ${y}) ${width}×${height}`);
    return newId;
  }

  function deleteZone(zoneId: string): void {
    apply((s) => ops.deleteZone(s, zoneId), `deleteZone ${zoneId}`);
  }

  // Edit mode is UI state — no history entry needed.
  function setEditingZone(zoneId: string | null): void {
    applyTransient((s) => ops.setEditingZone(s, zoneId));
  }

  function setEntityLocked(instanceId: string, locked: boolean): void {
    apply((s) => ops.setEntityLocked(s, instanceId, locked), `setEntityLocked ${instanceId} → ${locked}`);
  }

  function setZoneLocked(zoneId: string, locked: boolean): void {
    apply((s) => ops.setZoneLocked(s, zoneId, locked), `setZoneLocked ${zoneId} → ${locked}`);
  }

  function flipEntity(instanceId: string): void {
    apply((s) => ops.flipEntity(s, instanceId), `flipEntity ${instanceId}`);
  }

  function rotateEntity(instanceId: string, delta: number): void {
    apply((s) => ops.rotateEntity(s, instanceId, delta), `rotateEntity ${instanceId} Δ${delta}°`);
  }

  function setRotation(instanceId: string, degrees: number): void {
    apply((s) => ops.setRotation(s, instanceId, degrees), `setRotation ${instanceId} → ${degrees}°`);
  }

  function rotateStack(zoneId: string, delta: number): void {
    apply((s) => ops.rotateStack(s, zoneId, delta), `rotateStack ${zoneId} Δ${delta}°`);
  }

  /**
   * Transient orchestration for the shuffle animation. The new order is
   * computed up-front so the renderer knows which card will end up on top
   * and can include it in the animation — preventing a visual pop when the
   * shuffle commits.
   *
   * `animatedIds` is rendered in array order: the first id is painted at
   * the bottom, the last at the top. Z-indices are reversed mid-animation
   * so the new top lands on top.
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
      apply((s) => ops.shuffleStack(s, zoneId), `shuffleStack ${zoneId}`);
      return;
    }

    // Don't re-trigger an animation for a stack that's already shuffling.
    if (shuffleAnimation?.zoneId === zoneId) return;

    // A shuffle on a different zone is already running — commit it now so
    // its result isn't lost when we replace the transient state below.
    if (shuffleAnimation) completeShuffleAnimation();

    const newOrder = ops.computeShuffledOrder(zone.entityIds);
    const newTop = newOrder[newOrder.length - 1];
    const oldTop = zone.entityIds[zone.entityIds.length - 1];

    // Pick the cards to animate. Must include both old top (to match what's
    // visible at t=0) and new top (to match what's visible at t=end). Fill
    // the rest with random others so the fan-out feels populated.
    const required: string[] = [];
    if (oldTop !== newTop) required.push(newTop, oldTop);
    else required.push(newTop);

    const requiredSet = new Set(required);
    const pool = newOrder.filter((id) => !requiredSet.has(id));
    const wantExtra = Math.min(
      SHUFFLE_ANIMATION_CARDS - required.length,
      pool.length
    );
    // Fisher–Yates partial sample
    for (let i = 0; i < wantExtra; i++) {
      const j = i + Math.floor(Math.random() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const extras = pool.slice(0, wantExtra);

    // Array order: [newTop, ...extras, oldTop]
    // - oldTop is last (highest paint order) → visible at start, matching the
    //   underlying stack-top that was just hidden when this state went live.
    // - newTop is first (lowest paint order initially) → animation swaps
    //   z-indices mid-flight so it lands on top at the end.
    const animatedIds: string[] =
      oldTop === newTop ? [newTop, ...extras] : [newTop, ...extras, oldTop];

    if (debugMode) console.log(`[tabletop] shuffleStack ${zoneId} (animated, ${animatedIds.length} cards)`);
    shuffleAnimation = { zoneId, newOrder, animatedIds };
  }

  /** Called by the renderer once the shuffle animation has completed. */
  function completeShuffleAnimation(): void {
    const pending = shuffleAnimation;
    if (!pending) return;
    shuffleAnimation = null;
    apply(
      (s) => ops.shuffleStack(s, pending.zoneId, pending.newOrder),
      `commit shuffleStack ${pending.zoneId}`
    );
  }

  function setStackFaceDown(zoneId: string, faceDown: boolean): void {
    apply((s) => ops.setStackFaceDown(s, zoneId, faceDown), `setStackFaceDown ${zoneId} → ${faceDown}`);
  }

  function setStackPersistent(zoneId: string, persistent: boolean): void {
    apply((s) => ops.setStackPersistent(s, zoneId, persistent), `setStackPersistent ${zoneId} → ${persistent}`);
  }

  function reorderInZone(instanceId: string, newIndex: number): void {
    apply((s) => ops.reorderInZone(s, instanceId, newIndex), `reorderInZone ${instanceId} → index ${newIndex}`);
  }

  function drawFromStack(
    stackZoneId: string,
    targetZoneId: string,
    x: number,
    y: number
  ): void {
    apply((s) => ops.drawFromStack(s, stackZoneId, targetZoneId, x, y), `drawFromStack ${stackZoneId} → zone:${targetZoneId}`);
  }

  function spawnEntity(
    templateId: string,
    zoneId: string,
    x: number,
    y: number
  ): string | null {
    const template = templates[templateId];
    if (!template) return null;
    let newId: string | null = null;
    apply((s) => {
      newId = ops.spawnEntity(s, template, zoneId, x, y);
    }, `spawnEntity template:${templateId} → zone:${zoneId}`);
    return newId;
  }

  /**
   * Spawn instances at the drop point. Pass `instances` to spawn a subset
   * (e.g. only the unplaced ones); omit to spawn all template instances.
   * Cards with a data source expand to one entity per row; everything else
   * spawns a single entity. Returns the new instance IDs.
   */
  function spawnFromTemplate(
    templateId: string,
    zoneId: string,
    x: number,
    y: number,
    instances?: (Record<string, string> | null)[]
  ): string[] {
    const template = templates[templateId];
    if (!template) return [];
    let newIds: string[] = [];
    apply((s) => {
      newIds = ops.spawnFromTemplate(s, template, zoneId, x, y, instances);
    }, `spawnFromTemplate template:${templateId} → zone:${zoneId}`);
    return newIds;
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
    let result: { zoneId: string; instanceIds: string[] } | null = null;
    apply((s) => {
      result = ops.spawnStackZoneFromTemplate(
        s,
        template,
        worldX,
        worldY,
        displayWidth,
        displayHeight,
        instances
      );
    }, `spawnStackZoneFromTemplate template:${templateId} at (${worldX}, ${worldY})`);
    return result;
  }

  function mergeEntitiesIntoStack(draggedId: string, targetId: string): string | null {
    let zoneId: string | null = null;
    apply((s) => {
      zoneId = ops.mergeEntitiesIntoStack(s, templates, draggedId, targetId);
    }, `mergeEntitiesIntoStack ${draggedId} → ${targetId}`);
    return zoneId;
  }

  function mergeStackOntoStack(draggedZoneId: string, targetZoneId: string): boolean {
    let result = false;
    apply((s) => {
      result = ops.mergeStackOntoStack(s, draggedZoneId, targetZoneId);
    }, `mergeStackOntoStack ${draggedZoneId} → ${targetZoneId}`);
    return result;
  }

  function removeEntity(instanceId: string): void {
    apply((s) => ops.removeEntity(s, instanceId), `removeEntity ${instanceId}`);
  }

  function removeAllEntitiesForTemplate(templateId: string): void {
    apply((s) => ops.removeAllEntitiesForTemplate(s, templateId), `removeAllEntitiesForTemplate template:${templateId}`);
  }

  // Selection is ephemeral — no history needed.
  function selectEntity(instanceId: string | null): void {
    applyTransient((s) => ops.selectEntity(s, instanceId));
  }

  function selectZone(zoneId: string | null): void {
    applyTransient((s) => ops.selectZone(s, zoneId));
  }

  // Transient UI flag: an entity drag is currently hovering over the sidebar.
  // Used to show a visual removal indicator without touching undo history.
  let isDraggingOverSidebar = $state(false);

  function setDraggingOverSidebar(value: boolean): void {
    isDraggingOverSidebar = value;
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
    deleteZone,
    setEditingZone,
    setEntityLocked,
    setZoneLocked,
    flipEntity,
    rotateEntity,
    rotateStack,
    setRotation,
    shuffleStack,
    completeShuffleAnimation,
    get shuffleAnimation() {
      return shuffleAnimation;
    },
    setStackFaceDown,
    setStackPersistent,
    reorderInZone,
    drawFromStack,
    spawnEntity,
    spawnFromTemplate,
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

    toggleDebugMode
  };
}

export type TabletopStore = ReturnType<typeof createTabletopStore>;
