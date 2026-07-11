import { describe, it, expect } from 'vitest';
import {
  begin,
  canRedo,
  canUndo,
  commitTransaction,
  createHistory,
  MAX_HISTORY,
  record,
  redo,
  rollbackTransaction,
  undo,
  type History
} from './history';

// History is generic over the state type; simple labelled snapshots keep the
// scenarios readable.
type S = string;

describe('one-shot commits', () => {
  it('undo returns to the pre-mutation snapshot; redo re-applies', () => {
    let h: History<S> = createHistory();
    // state: 'a' → mutate to 'b', recording the 'a' snapshot
    h = record(h, 'a');

    expect(canUndo(h)).toBe(true);
    const undone = undo(h, 'b')!;
    expect(undone.state).toBe('a');
    expect(canRedo(undone.history)).toBe(true);

    const redone = redo(undone.history, undone.state)!;
    expect(redone.state).toBe('b');
    expect(canUndo(redone.history)).toBe(true);
    expect(canRedo(redone.history)).toBe(false);
  });

  it('a new commit clears the redo stack', () => {
    let h: History<S> = createHistory();
    h = record(h, 'a');
    const undone = undo(h, 'b')!;
    expect(canRedo(undone.history)).toBe(true);

    const after = record(undone.history, 'a');
    expect(canRedo(after)).toBe(false);
  });

  it('undo/redo return null when their stack is empty', () => {
    const h: History<S> = createHistory();
    expect(undo(h, 'x')).toBeNull();
    expect(redo(h, 'x')).toBeNull();
  });

  it('caps the undo stack at MAX_HISTORY, discarding the oldest entries', () => {
    let h: History<S> = createHistory();
    for (let i = 0; i < MAX_HISTORY + 10; i++) {
      h = record(h, `s${i}`);
    }
    expect(h.past).toHaveLength(MAX_HISTORY);
    expect(h.past[0]).toBe('s10');
  });
});

describe('transactions', () => {
  it('begin → transient frames → commit is exactly one undo step', () => {
    let h: History<S> = createHistory();
    // Drag: state 'start', many transient frames, ends at 'end'.
    const tx = begin('start');
    h = commitTransaction(h, tx);

    expect(h.past).toHaveLength(1);
    const undone = undo(h, 'end')!;
    expect(undone.state).toBe('start');
    expect(canUndo(undone.history)).toBe(false);
  });

  it('rollback restores the transaction base and records nothing', () => {
    const h: History<S> = createHistory();
    const tx = begin('start');

    expect(rollbackTransaction(tx)).toBe('start');
    expect(canUndo(h)).toBe(false);
  });

  it('a drag sandwiched between atomic commits unwinds one gesture at a time', () => {
    let h: History<S> = createHistory();
    h = record(h, 'v0'); // atomic op: v0 → v1
    const tx = begin('v1'); // drag from v1 …
    h = commitTransaction(h, tx); // … lands on v2

    let current = 'v2';
    let r = undo(h, current)!;
    expect(r.state).toBe('v1');
    [h, current] = [r.history, r.state];
    r = undo(h, current)!;
    expect(r.state).toBe('v0');
  });
});
