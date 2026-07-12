import { describe, it, expect } from 'vitest';
import { DRAG_THRESHOLD, step, type DragInputEvent, type DragMutation, type DragState } from './reducer';
import { applyDropPlan } from './drop';
import * as hist from './history';
import * as ops from './operations';
import {
  MIN_ZONE_SIZE,
  createFreeformZone,
  moveZoneTo,
  removeZone,
  reparentZone,
  setZoneRect
} from './zones';
import { zoneWorldOrigin } from './geometry';
import { normalize } from './normalize';
import type { TabletopState, Templates } from './types';
import {
  cardTemplate,
  diceTemplate,
  makeCard,
  makePile,
  makeTemplates,
  singleCardPile,
  stateWithPiles,
  withZone
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
        case 'detach-pile':
          ops.detachPileToRoot(state, mutation.pileId);
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
        case 'move-zone':
          moveZoneTo(state, mutation.zoneId, mutation.x, mutation.y);
          break;
        case 'nest-zone':
          reparentZone(state, mutation.zoneId, mutation.parentZoneId);
          break;
        case 'resize-zone':
          setZoneRect(state, mutation.zoneId, mutation.rect);
          break;
        case 'remove-zone':
          removeZone(state, mutation.zoneId);
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

// Standard card footprint is 127 × 177.8px (63.5 × 88.9mm at 2px/mm), so a
// pile at (100, 100) covers x 36.5–163.5, y 11.1–188.9.
describe('drag reducer — marquee selection', () => {
  it('a drag on empty table selects exactly the unlocked piles intersecting the rectangle, in render order', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 400, 100),
      singleCardPile('p3', 'c3', 250, 100, { locked: true }), // inside the rect but locked
      singleCardPile('p4', 'c4', 900, 900) // far outside
    );

    const { state, drag, history, emitted } = run(initial, [
      { type: 'background-down', world: at(0, 0) },
      { type: 'move', world: at(470, 150) },
      { type: 'up', world: at(470, 150) }
    ]);

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1', 'p2'] });
    expect(drag).toEqual({ mode: 'idle' });
    // Selection is ephemeral: no transaction, no history entries.
    expect(history.past).toHaveLength(0);
    expect(emitted.filter((m) => m.type === 'begin')).toHaveLength(0);
  });

  it('the selection tracks the rectangle live while dragging', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 400, 100)
    );

    const { state } = run(initial, [
      { type: 'background-down', world: at(0, 0) },
      { type: 'move', world: at(200, 150) } // covers p1 only so far
    ]);

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
  });

  it('is rotation-aware: a sideways card is caught by the area it actually covers', () => {
    // Rotated 90°, the card at (300, 300) spans x 211.1–388.9; upright it
    // only reaches x 363.5. The marquee starts at x 380 — inside the
    // sideways footprint, outside the upright one.
    const marquee: DragInputEvent[] = [
      { type: 'background-down', world: at(380, 250) },
      { type: 'move', world: at(450, 340) },
      { type: 'up', world: at(450, 340) }
    ];

    const sideways = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1'], x: 300, y: 300 }),
      cards: [makeCard({ id: 'c1', rotation: 90 })]
    });
    expect(run(sideways, marquee).state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });

    const upright = stateWithPiles(singleCardPile('p1', 'c1', 300, 300));
    expect(run(upright, marquee).state.selection).toEqual({ kind: 'none' });
  });

  it('tests the true rotated rectangle, not its axis-aligned bounding box', () => {
    // A 45°-rotated card at (300, 300) has an axis-aligned bounding box out
    // to ≈(407.8, 407.8), but the card itself stops at the diagonal edge
    // x+y = 300+300+89.8. A marquee in the bounding box's empty corner
    // misses; one straddling the diagonal edge hits.
    const rotated = () =>
      stateWithPiles({
        pile: makePile({ id: 'p1', cardIds: ['c1'], x: 300, y: 300 }),
        cards: [makeCard({ id: 'c1', rotation: 45 })]
      });

    const inCorner = run(rotated(), [
      { type: 'background-down', world: at(390, 390) },
      { type: 'move', world: at(405, 405) },
      { type: 'up', world: at(405, 405) }
    ]);
    expect(inCorner.state.selection).toEqual({ kind: 'none' });

    const onEdge = run(rotated(), [
      { type: 'background-down', world: at(385, 300) },
      { type: 'move', world: at(400, 310) },
      { type: 'up', world: at(400, 310) }
    ]);
    expect(onEdge.state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
  });

  it('a plain background click clears the selection; Ctrl/Cmd background click keeps it', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));
    initial.selection = { kind: 'piles', pileIds: ['p1'] };

    const plain = run(structuredClone(initial), [
      { type: 'background-down', world: at(600, 600) },
      { type: 'up', world: at(600, 600) }
    ]);
    expect(plain.state.selection).toEqual({ kind: 'none' });

    const ctrl = run(structuredClone(initial), [
      { type: 'background-down', world: at(600, 600), ctrl: true },
      { type: 'up', world: at(600, 600) }
    ]);
    expect(ctrl.state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
  });

  it('Escape mid-marquee restores the selection that existed before it began', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 400, 100)
    );
    initial.selection = { kind: 'piles', pileIds: ['p2'] };

    const { state, drag, history } = run(initial, [
      { type: 'background-down', world: at(0, 0) },
      { type: 'move', world: at(470, 150) }, // live selection is now [p1, p2]
      { type: 'cancel' }
    ]);

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p2'] });
    expect(drag).toEqual({ mode: 'idle' });
    expect(history.past).toHaveLength(0);
  });

  it('Ctrl/Cmd+click adds and removes piles from a marquee-built selection', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 400, 100),
      singleCardPile('p3', 'c3', 900, 900)
    );

    const { state } = run(initial, [
      // Marquee over p1 and p2…
      { type: 'background-down', world: at(0, 0) },
      { type: 'move', world: at(470, 150) },
      { type: 'up', world: at(470, 150) },
      // …then Ctrl+click adds p3 and removes p1.
      { type: 'pile-down', pileId: 'p3', world: at(900, 900), ctrl: true },
      { type: 'up', world: at(900, 900) },
      { type: 'pile-down', pileId: 'p1', world: at(100, 100), ctrl: true },
      { type: 'up', world: at(100, 100) }
    ]);

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p2', 'p3'] });
  });
});

describe('drag reducer — multi-pile drag', () => {
  /** Three cards: p1 and p2 selected, p3 a bystander. */
  function multiState() {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 400, 100),
      singleCardPile('p3', 'c3', 700, 700)
    );
    state.selection = { kind: 'piles', pileIds: ['p1', 'p2'] };
    return state;
  }

  it('dragging one selected pile moves the whole selection by the same delta as one undo step', () => {
    const initial = multiState();
    const before = structuredClone(initial);

    const result = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(150, 180) },
      { type: 'up', world: at(150, 180) }
    ]);

    expect(result.state.piles.p1).toMatchObject({ x: 150, y: 180 });
    expect(result.state.piles.p2).toMatchObject({ x: 450, y: 180 });
    expect(result.state.piles.p3).toMatchObject({ x: 700, y: 700 }); // bystander untouched
    // The dragged group raises above unselected neighbours, in selection order.
    expect(result.state.rootPileIds).toEqual(['p3', 'p1', 'p2']);
    expect(result.history.past).toHaveLength(1);

    // One undo rewinds the entire group move.
    const undone = hist.undo(result.history, structuredClone(result.state));
    expect(undone!.state).toEqual(before);
  });

  it('the selection stays selected after the group move', () => {
    const { state } = run(multiState(), [
      { type: 'pile-down', pileId: 'p2', world: at(400, 100) },
      { type: 'move', world: at(430, 120) },
      { type: 'up', world: at(430, 120) }
    ]);

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1', 'p2'] });
  });

  it('Escape mid-multi-drag restores every pile to its prior position', () => {
    const initial = multiState();
    const before = structuredClone(initial);

    const { state, drag, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(300, 400) },
      { type: 'cancel' }
    ]);

    expect(state).toEqual(before);
    expect(drag).toEqual({ mode: 'idle' });
    expect(history.past).toHaveLength(0);
  });

  it('a locked pile in the selection stays put while the rest move', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 400, 100, { locked: true })
    );
    initial.selection = { kind: 'piles', pileIds: ['p1', 'p2'] };

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(150, 100) },
      { type: 'up', world: at(150, 100) }
    ]);

    expect(state.piles.p1).toMatchObject({ x: 150, y: 100 });
    expect(state.piles.p2).toMatchObject({ x: 400, y: 100 });
    expect(history.past).toHaveLength(1);
  });

  it('grabbing a locked pile of the selection refuses the drag but still click-selects it', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100, { locked: true }),
      singleCardPile('p2', 'c2', 400, 100)
    );
    initial.selection = { kind: 'piles', pileIds: ['p1', 'p2'] };

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(300, 300) },
      { type: 'up', world: at(300, 300) }
    ]);

    expect(state.piles.p1).toMatchObject({ x: 100, y: 100 });
    expect(state.piles.p2).toMatchObject({ x: 400, y: 100 });
    expect(history.past).toHaveLength(0);
    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
  });

  it('dropping the group onto a pile merges every card pile into it in selection order', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 200, 300),
      singleCardPile('target', 'c3', 600, 100)
    );
    initial.selection = { kind: 'piles', pileIds: ['p1', 'p2'] };

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(600, 100) }, // pointer ends over the target
      { type: 'up', world: at(600, 100) }
    ]);

    expect(state.piles.p1).toBeUndefined();
    expect(state.piles.p2).toBeUndefined();
    expect(state.piles.target.cardIds).toEqual(['c3', 'c1', 'c2']);
    expect(state.rootPileIds).toEqual(['target']);
    expect(history.past).toHaveLength(1);
  });

  it('a mixed group dropped onto a pile merges the cards and places the die where it was dragged', () => {
    const initial = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      {
        pile: makePile({ id: 'die', cardIds: ['d1'], x: 150, y: 200 }),
        cards: [makeCard({ id: 'd1', templateId: 'tpl-dice' })]
      },
      singleCardPile('target', 'c3', 600, 100)
    );
    initial.selection = { kind: 'piles', pileIds: ['p1', 'die'] };

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(600, 100) }, // delta (500, 0)
      { type: 'up', world: at(600, 100) }
    ]);

    expect(state.piles.p1).toBeUndefined();
    expect(state.piles.target.cardIds).toEqual(['c3', 'c1']);
    expect(state.piles.die).toMatchObject({ x: 650, y: 200, cardIds: ['d1'] });
  });

  it('releasing the group over the sidebar removes every dragged pile as one undo step', () => {
    const initial = multiState();
    const before = structuredClone(initial);

    const result = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(20, 100) },
      { type: 'up', world: at(20, 100), overSidebar: true }
    ]);

    expect(result.state.piles.p1).toBeUndefined();
    expect(result.state.piles.p2).toBeUndefined();
    expect(result.state.cards.c1).toBeUndefined();
    expect(result.state.cards.c2).toBeUndefined();
    expect(result.state.rootPileIds).toEqual(['p3']);
    expect(result.history.past).toHaveLength(1);

    const undone = hist.undo(result.history, structuredClone(result.state));
    expect(undone!.state).toEqual(before);
  });
});

// ─── Ticket 06: zones ────────────────────────────────────────────────────────

describe('drag reducer — zone moves (header tab only)', () => {
  it('a click on the header selects the zone', () => {
    const initial = withZone(stateWithPiles(), { id: 'z1', x: 100, y: 100 });

    const { state, history } = run(initial, [
      { type: 'zone-down', zoneId: 'z1', world: at(110, 105) },
      { type: 'up', world: at(110, 105) }
    ]);

    expect(state.selection).toEqual({ kind: 'zone', zoneId: 'z1' });
    expect(history.past).toHaveLength(0); // selection is ephemeral — no history
  });

  it('dragging the header moves the zone with its piles visually stable, as one undo step', () => {
    const initial = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 150, 150)),
      { id: 'z1', x: 100, y: 100 },
      ['p1']
    );

    const { state, history, inTransaction } = run(initial, [
      { type: 'zone-down', zoneId: 'z1', world: at(110, 105) },
      { type: 'move', world: at(210, 155) },
      { type: 'up', world: at(210, 155) }
    ]);

    expect(state.zones.z1).toMatchObject({ x: 200, y: 150 });
    // The pile's zone-local position never changed — it travelled with the zone.
    expect(state.piles.p1).toMatchObject({ zoneId: 'z1', x: 50, y: 50 });
    expect(history.past).toHaveLength(1);
    expect(inTransaction).toBe(false);
  });

  it('a locked zone refuses the move but its header still click-selects', () => {
    const initial = withZone(stateWithPiles(), { id: 'z1', x: 100, y: 100, locked: true });

    const { state, history, emitted } = run(initial, [
      { type: 'zone-down', zoneId: 'z1', world: at(110, 105) },
      { type: 'move', world: at(400, 400) },
      { type: 'up', world: at(400, 400) }
    ]);

    expect(state.zones.z1).toMatchObject({ x: 100, y: 100 });
    expect(emitted.every((m) => m.type !== 'begin' && m.type !== 'move-zone')).toBe(true);
    expect(state.selection).toEqual({ kind: 'zone', zoneId: 'z1' });
    expect(history.past).toHaveLength(0);
  });

  it('releasing a zone drag over the sidebar deletes the zone with its contents', () => {
    const initial = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 150, 150), singleCardPile('p2', 'c2', 700, 700)),
      { id: 'z1', x: 100, y: 100 },
      ['p1']
    );

    const { state, history } = run(initial, [
      { type: 'zone-down', zoneId: 'z1', world: at(110, 105) },
      { type: 'move', world: at(10, 105) },
      { type: 'up', world: at(10, 105), overSidebar: true }
    ]);

    expect(state.zones.z1).toBeUndefined();
    expect(state.piles.p1).toBeUndefined();
    expect(state.cards.c1).toBeUndefined();
    expect(state.rootPileIds).toEqual(['p2']);
    expect(history.past).toHaveLength(1); // the whole gesture is one undo step
  });

  it('cancel mid-move restores the exact prior state', () => {
    const initial = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 150, 150)),
      { id: 'z1', x: 100, y: 100 },
      ['p1']
    );
    const before = structuredClone(initial);

    const { state, history } = run(initial, [
      { type: 'zone-down', zoneId: 'z1', world: at(110, 105) },
      { type: 'move', world: at(400, 400) },
      { type: 'cancel' }
    ]);

    expect(state).toEqual(before);
    expect(history.past).toHaveLength(0);
  });
});

// ─── Ticket 11: boards & nesting ─────────────────────────────────────────────

describe('drag reducer — zone nesting via the header drag', () => {
  /** A big freeform board plus a small free zone beside it, both top-level. */
  function boardAndPanel() {
    const state = stateWithPiles();
    const board = createFreeformZone(state, 0, 0, 600, 400, 'Board');
    const panel = createFreeformZone(state, 700, 0, 100, 100, 'Panel');
    return { state, board, panel };
  }

  it('dropping a zone with its centre inside a freeform zone nests it, visually stationary', () => {
    const { state, board, panel } = boardAndPanel();

    // Header grab at (750,10); drag so the panel's top-left lands at (250,150)
    // → centre (300,200), inside the board.
    const { state: out, history, inTransaction } = run(state, [
      { type: 'zone-down', zoneId: panel, world: at(750, 10) },
      { type: 'move', world: at(300, 160) },
      { type: 'up', world: at(300, 160) }
    ]);

    expect(out.zones[panel].parentZoneId).toBe(board);
    // Parent-local coordinates, but the world origin is where it was dropped.
    expect(out.zones[panel]).toMatchObject({ x: 250, y: 150 });
    expect(zoneWorldOrigin(out, out.zones[panel])).toEqual({ x: 250, y: 150 });
    expect(out.zoneOrder).toEqual([board]);
    expect((out.zones[board] as { childZoneIds?: string[] }).childZoneIds).toEqual([panel]);
    expect(history.past).toHaveLength(1); // move + nest = one undo step
    expect(inTransaction).toBe(false);
  });

  it('dragging a nested zone off its parent un-nests it back onto the table', () => {
    const { state, board, panel } = boardAndPanel();
    reparentZone(state, panel, board);
    moveZoneTo(state, panel, 200, 150); // world origin inside the board

    // Drag it far outside the board's rectangle.
    const { state: out, history } = run(state, [
      { type: 'zone-down', zoneId: panel, world: at(210, 160) },
      { type: 'move', world: at(1010, 660) },
      { type: 'up', world: at(1010, 660) }
    ]);

    expect(out.zones[panel].parentZoneId).toBeUndefined();
    expect(out.zoneOrder).toContain(panel);
    expect((out.zones[board] as { childZoneIds?: string[] }).childZoneIds).toEqual([]);
    expect(zoneWorldOrigin(out, out.zones[panel])).toEqual({ x: 1000, y: 650 });
    expect(history.past).toHaveLength(1);
  });

  it('dragging a parent so its centre is over its own child does not nest (no corruption)', () => {
    const { state, board, panel } = boardAndPanel();
    reparentZone(state, panel, board); // panel now nested in board
    moveZoneTo(state, panel, 100, 100); // panel world (100,100)..(200,200)

    // Drag the board a little; its centre passes over the nested panel.
    const { state: out } = run(state, [
      { type: 'zone-down', zoneId: board, world: at(10, 10) },
      { type: 'move', world: at(60, 60) },
      { type: 'up', world: at(60, 60) }
    ]);

    // The board stays top-level; the panel stays its child (never inverted).
    expect(out.zones[board].parentZoneId).toBeUndefined();
    expect(out.zones[panel].parentZoneId).toBe(board);
    expect(out.zoneOrder).toEqual([board]);
  });

  it('cancel mid-nest-drag restores the exact prior state (no reparent)', () => {
    const { state, panel } = boardAndPanel();
    const before = structuredClone(state);

    const { state: out, history } = run(state, [
      { type: 'zone-down', zoneId: panel, world: at(750, 10) },
      { type: 'move', world: at(300, 160) }, // hovering over the board
      { type: 'cancel' }
    ]);

    expect(out).toEqual(before);
    expect(out.zones[panel].parentZoneId).toBeUndefined();
    expect(history.past).toHaveLength(0);
  });
});

describe('drag reducer — zone body: click selects, drag marquees', () => {
  it('a click on the zone body selects the zone; Ctrl/Cmd+click leaves the selection alone', () => {
    const initial = withZone(stateWithPiles(singleCardPile('p1', 'c1', 700, 700)), {
      id: 'z1',
      x: 100,
      y: 100
    });
    initial.selection = { kind: 'piles', pileIds: ['p1'] };

    const clicked = run(structuredClone(initial), [
      { type: 'background-down', world: at(200, 200), zoneId: 'z1' },
      { type: 'up', world: at(200, 200) }
    ]);
    expect(clicked.state.selection).toEqual({ kind: 'zone', zoneId: 'z1' });

    const ctrlClicked = run(structuredClone(initial), [
      { type: 'background-down', world: at(200, 200), ctrl: true, zoneId: 'z1' },
      { type: 'up', world: at(200, 200) }
    ]);
    expect(ctrlClicked.state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
  });

  it('a body drag marquees, catching zone piles (in world space) and root piles alike', () => {
    const initial = withZone(
      stateWithPiles(singleCardPile('inZone', 'c1', 150, 150), singleCardPile('onTable', 'c2', 600, 150)),
      { id: 'z1', x: 100, y: 100 },
      ['inZone']
    );

    const { state } = run(initial, [
      { type: 'background-down', world: at(120, 120), zoneId: 'z1' },
      { type: 'move', world: at(700, 300) },
      { type: 'up', world: at(700, 300) }
    ]);

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['inZone', 'onTable'] });
  });
});

describe('drag reducer — dragging piles across zones', () => {
  it('a whole-pile grab inside a zone detaches at its world position and drops onto the open table', () => {
    const initial = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 150, 150)),
      { id: 'z1', x: 100, y: 100 },
      ['p1']
    );

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(150, 150), alt: true },
      { type: 'move', world: at(600, 150) },
      { type: 'up', world: at(600, 150) }
    ]);

    expect(state.piles.p1).toMatchObject({ zoneId: null, x: 600, y: 150 });
    expect(state.zones.z1.pileIds).toEqual([]);
    expect(state.rootPileIds).toEqual(['p1']);
    expect(history.past).toHaveLength(1);
  });

  it('a drag within the zone re-enters it, keeping the visual position at the drop', () => {
    const initial = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 150, 150)),
      { id: 'z1', x: 100, y: 100 },
      ['p1']
    );

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(150, 150), alt: true },
      { type: 'move', world: at(200, 180) },
      { type: 'up', world: at(200, 180) }
    ]);

    expect(state.piles.p1).toMatchObject({ zoneId: 'z1', x: 100, y: 80 }); // world (200, 180)
    expect(state.zones.z1.pileIds).toEqual(['p1']);
  });

  it('a plain grab on a deck inside a zone splits the top card off at its world centre', () => {
    const initial = withZone(
      stateWithPiles({
        pile: makePile({ id: 'deck', cardIds: ['c1', 'c2', 'c3'], x: 150, y: 150 }),
        cards: [makeCard({ id: 'c1' }), makeCard({ id: 'c2' }), makeCard({ id: 'c3' })]
      }),
      { id: 'z1', x: 100, y: 100 },
      ['deck']
    );

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'deck', world: at(150, 150) },
      { type: 'move', world: at(650, 150) },
      { type: 'up', world: at(650, 150) }
    ]);

    // The deck stays in the zone minus its top card; the drawn card sits on
    // the open table where it was dropped.
    expect(state.piles.deck).toMatchObject({ zoneId: 'z1', cardIds: ['c1', 'c2'] });
    const drawnId = state.rootPileIds[0];
    expect(state.piles[drawnId]).toMatchObject({ zoneId: null, x: 650, y: 150, cardIds: ['c3'] });
  });

  it('cancel mid-drag restores zone membership exactly', () => {
    const initial = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 150, 150)),
      { id: 'z1', x: 100, y: 100 },
      ['p1']
    );
    const before = structuredClone(initial);

    const { state } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(150, 150), alt: true },
      { type: 'move', world: at(900, 900) },
      { type: 'cancel' }
    ]);

    expect(state).toEqual(before);
  });

  it('a multi-selection dragged over a zone lands every pile in it (story 41)', () => {
    const initial = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 600, 150), singleCardPile('p2', 'c2', 700, 150)),
      { id: 'z1', x: 100, y: 100 }
    );
    initial.selection = { kind: 'piles', pileIds: ['p1', 'p2'] };

    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(600, 150) },
      { type: 'move', world: at(250, 150) }, // pointer ends inside z1
      { type: 'up', world: at(250, 150) }
    ]);

    expect(state.piles.p1).toMatchObject({ zoneId: 'z1', x: 150, y: 50 }); // world (250, 150)
    expect(state.piles.p2).toMatchObject({ zoneId: 'z1', x: 250, y: 50 }); // world (350, 150)
    expect(state.zones.z1.pileIds).toEqual(['p1', 'p2']);
    expect(state.rootPileIds).toEqual([]);
    expect(history.past).toHaveLength(1);
  });
});

describe('drag reducer — edit-mode corner resize (inside the session transaction)', () => {
  function editingState() {
    const state = withZone(stateWithPiles(), { id: 'z1', x: 100, y: 100, width: 400, height: 300 });
    state.editingZoneId = 'z1';
    return state;
  }

  it('resize frames are transient: the rect updates, but no transaction or history entry appears', () => {
    const { state, history, emitted, inTransaction } = run(editingState(), [
      { type: 'zone-resize-down', zoneId: 'z1', corner: 'se', world: at(500, 400) },
      { type: 'move', world: at(560, 450) },
      { type: 'up', world: at(560, 450) }
    ]);

    expect(state.zones.z1).toMatchObject({ x: 100, y: 100, width: 460, height: 350 });
    expect(emitted.every((m) => m.type !== 'begin' && m.type !== 'commit')).toBe(true);
    expect(history.past).toHaveLength(0);
    expect(inTransaction).toBe(false);
  });

  it('shrinking past the opposite corner clamps to the minimum size', () => {
    const { state } = run(editingState(), [
      { type: 'zone-resize-down', zoneId: 'z1', corner: 'se', world: at(500, 400) },
      { type: 'move', world: at(-1000, -1000) },
      { type: 'up', world: at(-1000, -1000) }
    ]);

    expect(state.zones.z1).toMatchObject({
      x: 100,
      y: 100,
      width: MIN_ZONE_SIZE,
      height: MIN_ZONE_SIZE
    });
  });

  it('cancel mid-resize restores the starting rect (the session stays open)', () => {
    const { state, drag } = run(editingState(), [
      { type: 'zone-resize-down', zoneId: 'z1', corner: 'nw', world: at(100, 100) },
      { type: 'move', world: at(50, 60) },
      { type: 'cancel' }
    ]);

    expect(state.zones.z1).toMatchObject({ x: 100, y: 100, width: 400, height: 300 });
    expect(state.editingZoneId).toBe('z1');
    expect(drag).toEqual({ mode: 'idle' });
  });

  it('while a zone-edit session is open, the rest of the table is inert', () => {
    const state = withZone(stateWithPiles(singleCardPile('p1', 'c1', 700, 700)), {
      id: 'z1',
      x: 100,
      y: 100
    });
    state.editingZoneId = 'z1';
    const before = structuredClone(state);

    const result = run(state, [
      { type: 'pile-down', pileId: 'p1', world: at(700, 700) },
      { type: 'move', world: at(900, 900) },
      { type: 'up', world: at(900, 900) },
      { type: 'background-down', world: at(20, 20) },
      { type: 'move', world: at(800, 800) },
      { type: 'up', world: at(800, 800) },
      { type: 'zone-down', zoneId: 'z1', world: at(110, 100) },
      { type: 'move', world: at(400, 400) },
      { type: 'up', world: at(400, 400) }
    ]);

    expect(result.state).toEqual(before);
    expect(result.emitted).toEqual([]);
  });
});

describe('drag reducer — middle-button pan', () => {
  it('emits incremental screen-space deltas for each move and ends idle on up', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));

    const { state, drag, emitted, history, inTransaction } = run(initial, [
      { type: 'pan-down', screen: at(200, 150) },
      { type: 'move', world: at(0, 0), screen: at(230, 150) },
      { type: 'move', world: at(0, 0), screen: at(230, 200) },
      { type: 'up', world: at(0, 0), screen: at(230, 200) }
    ]);

    // Pan is pure navigation: the table is untouched and nothing enters history.
    expect(state.piles.p1).toMatchObject({ x: 100, y: 100 });
    expect(history.past).toHaveLength(0);
    expect(inTransaction).toBe(false);
    expect(drag).toEqual({ mode: 'idle' });
    // Deltas accumulate frame-to-frame: (+30,0) then (0,+50).
    expect(emitted).toEqual([
      { type: 'pan', dx: 30, dy: 0 },
      { type: 'pan', dx: 0, dy: 50 }
    ]);
  });

  it('never opens a transaction — no begin/commit/select among its mutations', () => {
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 0, 0));
    const { emitted } = run(initial, [
      { type: 'pan-down', screen: at(0, 0) },
      { type: 'move', world: at(0, 0), screen: at(50, 40) },
      { type: 'up', world: at(0, 0), screen: at(50, 40) }
    ]);
    expect(emitted.every((m) => m.type === 'pan')).toBe(true);
  });

  it('pans even while a zone-edit session holds the rest of the table inert', () => {
    const state = withZone(stateWithPiles(), { id: 'z1', x: 100, y: 100 });
    state.editingZoneId = 'z1';

    const { drag, emitted } = run(state, [
      { type: 'pan-down', screen: at(10, 10) },
      { type: 'move', world: at(0, 0), screen: at(40, 10) },
      { type: 'up', world: at(0, 0), screen: at(40, 10) }
    ]);

    expect(emitted).toEqual([{ type: 'pan', dx: 30, dy: 0 }]);
    expect(drag).toEqual({ mode: 'idle' });
  });

  it('a left-button gesture is unaffected — a pile still moves as its own step', () => {
    // Middle-drag pan and left-drag move are distinct entry events, so they
    // never contend: the pile drag opens its own transaction as usual.
    const initial = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));
    const { state, history } = run(initial, [
      { type: 'pile-down', pileId: 'p1', world: at(100, 100) },
      { type: 'move', world: at(160, 100) },
      { type: 'up', world: at(160, 100) }
    ]);
    expect(state.piles.p1.x).toBe(160);
    expect(history.past).toHaveLength(1);
  });
});
