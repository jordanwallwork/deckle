import { describe, it, expect } from 'vitest';
import { DRAG_THRESHOLD, step, type DragInputEvent, type DragMutation, type DragState } from './reducer';
import { applyDropPlan } from './drop';
import * as hist from './history';
import * as ops from './operations';
import { normalize } from './normalize';
import type { TabletopState, Templates } from './types';
import {
  cardTemplate,
  diceTemplate,
  makeCard,
  makePile,
  makeTemplates,
  singleCardPile,
  stateWithPiles
} from './fixtures';

const templates: Templates = makeTemplates(cardTemplate(), diceTemplate());

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
        case 'split-top':
          ops.splitTopCard(state, mutation.sourcePileId, mutation.newPileId);
          break;
        case 'move-pile':
          ops.movePileTo(state, mutation.pileId, mutation.x, mutation.y);
          break;
        case 'remove-pile':
          ops.removePile(state, mutation.pileId);
          break;
        case 'drop':
          applyDropPlan(state, templates, mutation.plan);
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

  it('a locked pile refuses the drag but the release still click-selects it', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100, { locked: true }));

    const { state, drag, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(200, 200) },
      { type: 'up', world: at(200, 200) }
    ]);

    expect(drag).toEqual({ mode: 'idle' });
    expect(state.piles.p1.x).toBe(100); // never moved
    expect(history.past).toHaveLength(0); // no transaction ever began
    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
  });

  it('a locked deck refuses the split — no card is pulled off it', () => {
    const initial = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1', 'c2'], x: 100, y: 100, locked: true }),
      cards: [makeCard({ id: 'c1' }), makeCard({ id: 'c2' })]
    });

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(400, 300) },
      { type: 'up', world: at(400, 300) }
    ]);

    expect(state.piles.p1.cardIds).toEqual(['c1', 'c2']);
    expect(state.rootPileIds).toEqual(['p1']); // no split pile appeared
  });

  it('Ctrl/Cmd+click builds a multi-selection one pile at a time', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1'), singleCardPile('p2', 'c2', 300, 0));

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(0, 0) },
      { type: 'up', world: at(0, 0) },
      { type: 'pile-down', pileId: 'p2', world: at(300, 0), ctrl: true },
      { type: 'up', world: at(300, 0) }
    ]);

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1', 'p2'] });
  });

  it('Ctrl/Cmd+click on a selected pile removes it; removing the last leaves no selection', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1'), singleCardPile('p2', 'c2', 300, 0));
    initial.selection = { kind: 'piles', pileIds: ['p1', 'p2'] };

    const first = run(initial, [
      { type: 'pile-down', pileId: 'p2', world: at(300, 0), ctrl: true },
      { type: 'up', world: at(300, 0) }
    ]);
    expect(first.state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });

    const second = run(first.state, [
      { type: 'pile-down', pileId: 'p1', world: at(0, 0), ctrl: true },
      { type: 'up', world: at(0, 0) }
    ]);
    expect(second.state.selection).toEqual({ kind: 'none' });
  });

  it('a plain click collapses a multi-selection to just the clicked pile', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1'), singleCardPile('p2', 'c2', 300, 0));
    initial.selection = { kind: 'piles', pileIds: ['p1', 'p2'] };

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(0, 0) },
      { type: 'up', world: at(0, 0) }
    ]);

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
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

/** A face-down 3-card deck at (x, y); card order bottom → top. */
function deck(pileId: string, cardIds: [string, string, string], x = 100, y = 100) {
  return {
    pile: makePile({ id: pileId, cardIds: [...cardIds], x, y }),
    cards: cardIds.map((id) => makeCard({ id, isFlipped: true }))
  };
}

describe('drag reducer — grab gestures (split and merge)', () => {
  it('plain drag on a deck pulls exactly the top card; the remaining deck decrements', () => {
    const initial = stateWithPiles(deck('p1', ['c1', 'c2', 'c3']));

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(600, 150) },
      { type: 'up', world: at(600, 150) }
    ]);

    expect(state.piles.p1.cardIds).toEqual(['c1', 'c2']);
    expect(state.piles.p1.x).toBe(100); // the deck itself never moved

    const drawnId = state.rootPileIds.find((id) => id !== 'p1')!;
    const drawn = state.piles[drawnId];
    expect(drawn.cardIds).toEqual(['c3']);
    expect(drawn).toMatchObject({ x: 600, y: 150, zoneId: null });
    expect(state.rootPileIds).toEqual(['p1', drawnId]); // drawn card renders on top
    expect(history.past).toHaveLength(1); // the whole gesture is one undo step
  });

  it('undoing a draw puts the card back on the deck exactly as it was', () => {
    const initial = stateWithPiles(deck('p1', ['c1', 'c2', 'c3']));
    const before = structuredClone(initial);

    const result = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(600, 150) },
      { type: 'up', world: at(600, 150) }
    ]);

    const undone = hist.undo(result.history, structuredClone(result.state));
    expect(undone!.state).toEqual(before);
  });

  it('badge-drag moves the entire pile', () => {
    const initial = stateWithPiles(deck('p1', ['c1', 'c2', 'c3']));

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(110, 110), viaBadge: true },
      { type: 'move', world: at(610, 160) },
      { type: 'up', world: at(610, 160) }
    ]);

    expect(state.piles.p1.cardIds).toEqual(['c1', 'c2', 'c3']);
    expect(state.piles.p1.x).toBe(600);
    expect(state.piles.p1.y).toBe(150);
    expect(state.rootPileIds).toEqual(['p1']); // no split pile was created
    expect(history.past).toHaveLength(1);
  });

  it('Alt+drag anywhere on the pile moves the entire pile', () => {
    const initial = stateWithPiles(deck('p1', ['c1', 'c2', 'c3']));

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100), alt: true },
      { type: 'move', world: at(600, 150) },
      { type: 'up', world: at(600, 150) }
    ]);

    expect(state.piles.p1.cardIds).toEqual(['c1', 'c2', 'c3']);
    expect(state.piles.p1).toMatchObject({ x: 600, y: 150 });
  });

  it('plain drag on a single-card pile moves the pile itself — nothing to split', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(600, 150) },
      { type: 'up', world: at(600, 150) }
    ]);

    expect(state.rootPileIds).toEqual(['p1']);
    expect(state.piles.p1).toMatchObject({ x: 600, y: 150, cardIds: ['c1'] });
  });

  it('dropping a card onto another pile merges it on top, keeping rotation and face state', () => {
    const initial = stateWithPiles(
      {
        pile: makePile({ id: 'p1', cardIds: ['c1', 'c2'], x: 100, y: 100 }),
        cards: [
          makeCard({ id: 'c1', isFlipped: true }),
          // The drawn card: deliberately rotated and face-up (the Scout case).
          makeCard({ id: 'c2', rotation: 180, isFlipped: false })
        ]
      },
      singleCardPile('p2', 'c3', 600, 100)
    );

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(600, 100) },
      { type: 'up', world: at(600, 100) } // pointer inside p2's footprint
    ]);

    expect(state.piles.p1.cardIds).toEqual(['c1']);
    expect(state.piles.p2.cardIds).toEqual(['c3', 'c2']); // dropped card lands on top
    expect(state.cards.c2.rotation).toBe(180);
    expect(state.cards.c2.isFlipped).toBe(false);
    expect(state.rootPileIds).toEqual(['p1', 'p2']); // the split pile is gone
    expect(history.past).toHaveLength(1);
  });

  it('badge-dragging a whole deck onto another pile merges the deck on top', () => {
    const initial = stateWithPiles(
      deck('p1', ['c1', 'c2', 'c3']),
      singleCardPile('p2', 'c4', 600, 100)
    );

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100), viaBadge: true },
      { type: 'move', world: at(600, 100) },
      { type: 'up', world: at(600, 100) }
    ]);

    expect(state.piles.p1).toBeUndefined();
    expect(state.piles.p2.cardIds).toEqual(['c4', 'c1', 'c2', 'c3']);
    expect(state.rootPileIds).toEqual(['p2']);
  });

  it('dropping the drawn card back onto its source deck restores the deck exactly', () => {
    const initial = stateWithPiles(deck('p1', ['c1', 'c2', 'c3']), singleCardPile('p2', 'c4', 600, 100));
    const before = structuredClone(initial);

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(130, 120) }, // wander a little…
      { type: 'up', world: at(110, 105) } // …and release back over the deck
    ]);

    expect(state).toEqual(before); // order, face state, render order — everything
    expect(history.past).toHaveLength(1);
  });

  it('Escape mid-gesture restores the pre-drag state including the split', () => {
    const initial = stateWithPiles(deck('p1', ['c1', 'c2', 'c3']));
    const before = structuredClone(initial);

    const { state, drag, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(400, 300) },
      { type: 'cancel' }
    ]);

    expect(state).toEqual(before);
    expect(drag).toEqual({ mode: 'idle' });
    expect(history.past).toHaveLength(0);
  });

  it('a locked pile under the drop point refuses the merge — the card lands beside it as its own pile', () => {
    const initial = stateWithPiles(
      deck('p1', ['c1', 'c2', 'c3']),
      singleCardPile('p2', 'c4', 600, 100, { locked: true })
    );

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(600, 100) },
      { type: 'up', world: at(600, 100) }
    ]);

    expect(state.piles.p2.cardIds).toEqual(['c4']); // untouched
    const drawnId = state.rootPileIds.find((id) => id !== 'p1' && id !== 'p2')!;
    expect(state.piles[drawnId]).toMatchObject({ x: 600, y: 100, cardIds: ['c3'] });
  });

  it('dragging the drawn card over the sidebar removes just that card as one undo step', () => {
    const initial = stateWithPiles(deck('p1', ['c1', 'c2', 'c3']));
    const before = structuredClone(initial);

    const result = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(20, 100) },
      { type: 'up', world: at(20, 100), overSidebar: true }
    ]);

    expect(result.state.piles.p1.cardIds).toEqual(['c1', 'c2']);
    expect(result.state.cards.c3).toBeUndefined();
    expect(result.history.past).toHaveLength(1);

    const undone = hist.undo(result.history, structuredClone(result.state));
    expect(undone!.state).toEqual(before);
  });
});
