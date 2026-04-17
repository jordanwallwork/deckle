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
  function apply(mutator: (state: TabletopState) => void): void {
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
    const previous = history.past.pop()!;
    history.future.push(snapshotState());
    store.state = previous;
  }

  function redo(): void {
    if (history.future.length === 0) return;
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
    apply((s) => ops.moveEntity(s, instanceId, x, y));
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
    apply((s) => ops.moveEntityToZone(s, instanceId, zoneId, opts));
  }

  function flipEntity(instanceId: string): void {
    apply((s) => ops.flipEntity(s, instanceId));
  }

  function rotateEntity(instanceId: string, delta: number): void {
    apply((s) => ops.rotateEntity(s, instanceId, delta));
  }

  function setRotation(instanceId: string, degrees: number): void {
    apply((s) => ops.setRotation(s, instanceId, degrees));
  }

  function shuffleStack(zoneId: string): void {
    apply((s) => ops.shuffleStack(s, zoneId));
  }

  function setStackFaceDown(zoneId: string, faceDown: boolean): void {
    apply((s) => ops.setStackFaceDown(s, zoneId, faceDown));
  }

  function reorderInZone(instanceId: string, newIndex: number): void {
    apply((s) => ops.reorderInZone(s, instanceId, newIndex));
  }

  function drawFromStack(
    stackZoneId: string,
    targetZoneId: string,
    x: number,
    y: number
  ): void {
    apply((s) => ops.drawFromStack(s, stackZoneId, targetZoneId, x, y));
  }

  // Selection is ephemeral — no history needed.
  function selectEntity(instanceId: string | null): void {
    applyTransient((s) => ops.selectEntity(s, instanceId));
  }

  function selectZone(zoneId: string | null): void {
    applyTransient((s) => ops.selectZone(s, zoneId));
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
    flipEntity,
    rotateEntity,
    setRotation,
    shuffleStack,
    setStackFaceDown,
    reorderInZone,
    drawFromStack,
    selectEntity,
    selectZone
  };
}

export type TabletopStore = ReturnType<typeof createTabletopStore>;
