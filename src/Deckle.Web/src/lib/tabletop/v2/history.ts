// Pure transaction-based history. One-shot `record` for atomic operations;
// `begin` → transient update frames → `commitTransaction` (single history
// entry) or rollback (restore the transaction's base) for drags and
// zone-edit sessions.
//
// States are treated as opaque immutable snapshots — callers pass plain
// (already-cloned) values and every function returns fresh structures, so
// the module is trivially testable and the reactive store stays a shell.

export const MAX_HISTORY = 100;

export interface History<S> {
  /** Snapshots to return to on undo, oldest first. */
  past: S[];
  /** Snapshots to return to on redo, most recent undo last. */
  future: S[];
}

/** A pending multi-frame gesture; `base` is the state to restore on rollback. */
export interface Transaction<S> {
  base: S;
}

export function createHistory<S>(): History<S> {
  return { past: [], future: [] };
}

/**
 * Record an atomic (one-shot) change: `before` is the snapshot taken before
 * the mutation was applied. Clears the redo stack and caps the undo stack.
 */
export function record<S>(history: History<S>, before: S): History<S> {
  const past = [...history.past, before];
  if (past.length > MAX_HISTORY) past.shift();
  return { past, future: [] };
}

/** Start a transaction from a snapshot of the current state. */
export function begin<S>(current: S): Transaction<S> {
  return { base: current };
}

/**
 * Commit a transaction as a single history entry — however many transient
 * update frames happened in between.
 */
export function commitTransaction<S>(history: History<S>, tx: Transaction<S>): History<S> {
  return record(history, tx.base);
}

/**
 * Roll a transaction back: returns the state to restore. No history entry
 * is created.
 */
export function rollbackTransaction<S>(tx: Transaction<S>): S {
  return tx.base;
}

export function canUndo<S>(history: History<S>): boolean {
  return history.past.length > 0;
}

export function canRedo<S>(history: History<S>): boolean {
  return history.future.length > 0;
}

/** Step back one entry. `current` is the live state, pushed onto the redo stack. */
export function undo<S>(history: History<S>, current: S): { history: History<S>; state: S } | null {
  if (history.past.length === 0) return null;
  const state = history.past[history.past.length - 1];
  return {
    history: { past: history.past.slice(0, -1), future: [...history.future, current] },
    state
  };
}

/** Step forward one undone entry. `current` is the live state, pushed onto the undo stack. */
export function redo<S>(history: History<S>, current: S): { history: History<S>; state: S } | null {
  if (history.future.length === 0) return null;
  const state = history.future[history.future.length - 1];
  return {
    history: { past: [...history.past, current], future: history.future.slice(0, -1) },
    state
  };
}
