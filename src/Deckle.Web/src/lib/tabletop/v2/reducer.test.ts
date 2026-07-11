import { describe, it, expect } from 'vitest';
import { DRAG_THRESHOLD, step, type DragInputEvent, type DragMutation, type DragState } from './reducer';
import * as hist from './history';
import * as ops from './operations';
import { normalize } from './normalize';
import type { TabletopState, Templates } from './types';
import { cardTemplate, makeTemplates, singleCardPile, stateWithPiles } from './fixtures';

const templates: Templates = makeTemplates(cardTemplate());

/**
 * Drive the reducer with a synthetic event sequence, applying mutations the
 * way the interaction shell does (operations + pure history transactions).
 * Returns the final state, drag state, resulting history, and every mutation
 * emitted — so scenarios assert external behaviour only.
 */
function run(state: TabletopState, events: DragInputEvent[]) {
  let drag: DragState = { mode: 'idle' };
  let history = hist.createHistory<TabletopState>();
  let tx: hist.Transaction<TabletopState> | null = null;
  const emitted: DragMutation[] = [];

  for (const event of events) {
    const result = step(drag, event, { state, templates });
    drag = result.drag;
    for (const mutation of result.mutations) {
      emitted.push(mutation);
      switch (mutation.type) {
        case 'begin':
          tx = hist.begin(structuredClone(state));
          break;
        case 'raise-pile':
          ops.raisePile(state, mutation.pileId);
          break;
        case 'move-pile':
          ops.movePileTo(state, mutation.pileId, mutation.x, mutation.y);
          break;
        case 'remove-pile':
          ops.removePile(state, mutation.pileId);
          break;
        case 'commit':
          normalize(state, templates, { dev: true });
          history = hist.commitTransaction(history, tx!);
          tx = null;
          break;
        case 'rollback':
          state = hist.rollbackTransaction(tx!);
          tx = null;
          break;
        case 'select':
          ops.setSelection(state, mutation.selection);
          break;
      }
    }
  }

  return { state, drag, history, emitted, inTransaction: tx !== null };
}

const at = (x: number, y: number) => ({ x, y });

describe('drag reducer — moving a pile', () => {
  it('down → move → up moves the pile by the pointer delta as exactly one undo step', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));

    const { state, drag, history, inTransaction } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(110, 110) },
      { type: 'move', world: at(160, 130) },
      { type: 'move', world: at(210, 150) },
      { type: 'up', world: at(210, 150) }
    ]);

    expect(state.piles.p1.x).toBe(200); // 100 + (210 - 110)
    expect(state.piles.p1.y).toBe(140); // 100 + (150 - 110)
    expect(drag).toEqual({ mode: 'idle' });
    expect(history.past).toHaveLength(1);
    expect(inTransaction).toBe(false);
  });

  it('dragging raises the pile above its neighbours', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 0, 0),
      singleCardPile('p2', 'c2', 300, 0)
    );

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(0, 0) },
      { type: 'move', world: at(50, 0) },
      { type: 'up', world: at(50, 0) }
    ]);

    expect(state.rootPileIds).toEqual(['p2', 'p1']);
  });

  it('movement below the drag threshold begins no transaction and moves nothing', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));

    const { state, emitted, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(100 + DRAG_THRESHOLD - 1, 100) },
      { type: 'up', world: at(100 + DRAG_THRESHOLD - 1, 100) }
    ]);

    expect(state.piles.p1.x).toBe(100);
    expect(history.past).toHaveLength(0);
    expect(emitted.filter((m) => m.type === 'begin')).toHaveLength(0);
    // A sub-threshold press-and-release is a click: it selects the pile.
    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
  });

  it('press-and-release without movement selects the pile and records nothing', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'up', world: at(100, 100) }
    ]);

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
    expect(history.past).toHaveLength(0);
  });

  it('cancel mid-drag restores the exact pre-drag state and records nothing', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 300, 0)
    );
    const before = structuredClone(initial);

    const { state, drag, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(250, 180) },
      { type: 'cancel' }
    ]);

    expect(state).toEqual(before); // position AND render order restored
    expect(drag).toEqual({ mode: 'idle' });
    expect(history.past).toHaveLength(0);
  });

  it('cancel before any movement is a no-op', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));

    const { state, emitted } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'cancel' }
    ]);

    expect(emitted).toHaveLength(0);
    expect(state.piles.p1.x).toBe(100);
  });

  it('releasing a drag over the sidebar removes the pile and its cards as one undo step', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 300, 0)
    );
    const before = structuredClone(initial);

    const result = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(20, 100) },
      { type: 'up', world: at(20, 100), overSidebar: true }
    ]);

    expect(result.state.piles.p1).toBeUndefined();
    expect(result.state.cards.c1).toBeUndefined();
    expect(result.state.rootPileIds).toEqual(['p2']);
    expect(result.history.past).toHaveLength(1);

    // One undo restores the pile exactly as it was before the gesture.
    const undone = hist.undo(result.history, structuredClone(result.state));
    expect(undone!.state).toEqual(before);
  });

  it('a sub-threshold release over the sidebar is still just a click — nothing is removed', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'up', world: at(100, 100), overSidebar: true }
    ]);

    expect(state.piles.p1).toBeDefined();
    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
    expect(history.past).toHaveLength(0);
  });

  it('a locked pile refuses the grab entirely', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100, { locked: true }));

    const { state, drag, emitted } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(200, 200) },
      { type: 'up', world: at(200, 200) }
    ]);

    expect(drag).toEqual({ mode: 'idle' });
    expect(emitted).toHaveLength(0);
    expect(state.piles.p1.x).toBe(100);
  });

  it('ignores stray move/up/cancel events while idle', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));

    const { state, drag, emitted } = run(initial, [
      { type: 'move', world: at(50, 50) },
      { type: 'up', world: at(50, 50) },
      { type: 'cancel' }
    ]);

    expect(drag).toEqual({ mode: 'idle' });
    expect(emitted).toHaveLength(0);
    expect(state.piles.p1.x).toBe(100);
  });

  it('ignores a pointer-down on a pile that does not exist', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1'));

    const { drag, emitted } = run(initial, [
      { type: 'pile-down', pileId: 'ghost', world: at(0, 0) }
    ]);

    expect(drag).toEqual({ mode: 'idle' });
    expect(emitted).toHaveLength(0);
  });

  it('a second pointer-down mid-drag rolls the active drag back', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 300, 0)
    );
    const before = structuredClone(initial);

    const { state, drag } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(200, 100) },
      { type: 'pile-down', pileId: 'p2', world: at(300, 0) }
    ]);

    expect(state).toEqual(before);
    expect(drag).toEqual({ mode: 'idle' });
  });
});
