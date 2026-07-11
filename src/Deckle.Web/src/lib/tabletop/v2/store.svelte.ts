// Thin reactive shell over the pure modules: deep-reactive state, the
// transaction-based history API, and the normalize pass after every commit.
// All behaviour lives in operations/normalize/history — this file only wires
// them to Svelte reactivity.

import type { Selection, TabletopState, Templates } from './types';
import * as hist from './history';
import { normalize } from './normalize';
import { createFreeformZone, NEW_ZONE_HEIGHT, NEW_ZONE_WIDTH } from './zones';

export function createTabletopStore(initialState: TabletopState, templates: Templates) {
  const store = $state<{ state: TabletopState }>({
    state: structuredClone(initialState)
  });

  let history = $state.raw<hist.History<TabletopState>>(hist.createHistory());
  let transaction: hist.Transaction<TabletopState> | null = null;

  const canUndo = $derived(hist.canUndo(history));
  const canRedo = $derived(hist.canRedo(history));

  function snapshotState(): TabletopState {
    return structuredClone($state.snapshot(store.state)) as TabletopState;
  }

  function runNormalize(): void {
    normalize(store.state, templates, { dev: import.meta.env.DEV });
  }

  /**
   * Apply an atomic mutation as one history entry: snapshot → mutate →
   * normalize → record.
   */
  function commit(mutator: (state: TabletopState) => void): void {
    const before = snapshotState();
    mutator(store.state);
    runNormalize();
    history = hist.record(history, before);
  }

  /** Open a transaction (e.g. at drag start). One at a time. */
  function beginTransaction(): void {
    if (transaction) return;
    transaction = hist.begin(snapshotState());
  }

  /**
   * Apply a transient frame — no history, no normalize. Also used for
   * ephemeral UI state (selection) outside transactions.
   */
  function updateTransient(mutator: (state: TabletopState) => void): void {
    mutator(store.state);
  }

  /** Close the transaction as a single history entry and normalize once. */
  function commitTransaction(): void {
    if (!transaction) return;
    runNormalize();
    history = hist.commitTransaction(history, transaction);
    transaction = null;
  }

  /** Abort the transaction, restoring the exact pre-transaction state. */
  function rollbackTransaction(): void {
    if (!transaction) return;
    store.state = hist.rollbackTransaction(transaction);
    transaction = null;
  }

  function undo(): void {
    const result = hist.undo(history, snapshotState());
    if (!result) return;
    history = result.history;
    store.state = result.state;
  }

  function redo(): void {
    const result = hist.redo(history, snapshotState());
    if (!result) return;
    history = result.history;
    store.state = result.state;
  }

  function setSelection(selection: Selection): void {
    store.state.selection = selection;
  }

  // ─── Zone edit sessions ───────────────────────────────────────────────────
  // Editing a zone is one transaction: everything from entering edit mode to
  // Done lands as a single history entry, and Escape rolls the whole session
  // back — including the zone's creation when the session started from
  // "Add Zone".

  /** Create a freeform zone centred on a world point and open it for editing. */
  function createZoneAndEdit(worldX: number, worldY: number): void {
    if (transaction) return;
    beginTransaction();
    const id = createFreeformZone(
      store.state,
      worldX - NEW_ZONE_WIDTH / 2,
      worldY - NEW_ZONE_HEIGHT / 2
    );
    store.state.editingZoneId = id;
    store.state.selection = { kind: 'zone', zoneId: id };
  }

  /** Open an existing (unlocked) zone's edit session. */
  function startZoneEdit(zoneId: string): void {
    if (transaction) return;
    const zone = store.state.zones[zoneId];
    if (!zone || zone.locked) return;
    beginTransaction();
    store.state.editingZoneId = zoneId;
    store.state.selection = { kind: 'zone', zoneId };
  }

  /**
   * End the edit session: Done commits it as one history entry; Escape
   * (commit = false) restores the exact pre-session state.
   */
  function endZoneEdit(commitSession: boolean): void {
    if (store.state.editingZoneId === null || !transaction) return;
    if (commitSession) {
      store.state.editingZoneId = null;
      commitTransaction();
    } else {
      rollbackTransaction();
    }
  }

  return {
    /** The reactive state. Components read it; mutations go through the API. */
    get state() {
      return store.state;
    },
    templates,

    get canUndo() {
      return canUndo;
    },
    get canRedo() {
      return canRedo;
    },
    get inTransaction() {
      return transaction !== null;
    },

    commit,
    beginTransaction,
    updateTransient,
    commitTransaction,
    rollbackTransaction,
    undo,
    redo,
    setSelection,
    createZoneAndEdit,
    startZoneEdit,
    endZoneEdit
  };
}

export type TabletopStore = ReturnType<typeof createTabletopStore>;
