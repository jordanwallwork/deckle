import { describe, it, expect } from 'vitest';
import {
  applyPileAction,
  flipPiles,
  flippablePiles,
  pileActions,
  rotatablePiles,
  rotatePiles,
  selectedPileIds,
  shufflablePiles,
  shufflePiles
} from './actions';
import { flipPile, mergePiles, rotatePile, setSelection } from './operations';
import { normalize } from './normalize';
import { cardTemplate, diceTemplate, makeCard, makePile, makeTemplates, singleCardPile, stateWithPiles } from './fixtures';

const templates = makeTemplates(cardTemplate(), diceTemplate());

/** A face-down deck; card order bottom → top. */
function deck(pileId: string, cardIds: string[], x = 0, y = 0) {
  return {
    pile: makePile({ id: pileId, cardIds: [...cardIds], x, y }),
    cards: cardIds.map((id) => makeCard({ id, isFlipped: true }))
  };
}

function diePile(pileId: string, cardId: string) {
  return {
    pile: makePile({ id: pileId, cardIds: [cardId] }),
    cards: [makeCard({ id: cardId, templateId: 'tpl-dice' })]
  };
}

describe('the Scout scenario — relative orientation survives merge, flip and rotate', () => {
  it('keeps a 180°-rotated card oriented against its pile through every step', () => {
    // A face-up card deliberately turned 180° (Scout keeps cards this way)…
    const state = stateWithPiles(
      {
        pile: makePile({ id: 'hand', cardIds: ['h1'], x: 0, y: 0 }),
        cards: [makeCard({ id: 'h1' })]
      },
      {
        pile: makePile({ id: 'played', cardIds: ['p1'], x: 300, y: 0 }),
        cards: [makeCard({ id: 'p1', rotation: 180 })]
      }
    );

    // …merged into another pile: rotation and face state survive the merge.
    mergePiles(state, 'played', 'hand');
    normalize(state, templates, { dev: true });
    expect(state.piles.hand.cardIds).toEqual(['h1', 'p1']);
    expect(state.cards.p1.rotation).toBe(180);

    // Flipping the pile reverses order and toggles faces — rotations untouched.
    flipPile(state, templates, 'hand');
    expect(state.piles.hand.cardIds).toEqual(['p1', 'h1']);
    expect(state.cards.h1.rotation).toBe(0);
    expect(state.cards.p1.rotation).toBe(180);
    expect(state.cards.h1.isFlipped).toBe(true);
    expect(state.cards.p1.isFlipped).toBe(true);

    // Rotating the pile turns both cards together: still 180° apart.
    rotatePile(state, 'hand', 90);
    expect(state.cards.h1.rotation).toBe(90);
    expect(state.cards.p1.rotation).toBe(270);

    normalize(state, templates, { dev: true });
  });
});

describe('selection-wide F/R/S', () => {
  it('F flips every applicable selected pile, skipping dice and locked piles', () => {
    const state = stateWithPiles(
      deck('deck', ['c1', 'c2']),
      singleCardPile('card', 'c3'),
      diePile('die', 'd1'),
      singleCardPile('locked', 'c4', 0, 0, { locked: true })
    );
    setSelection(state, { kind: 'piles', pileIds: ['deck', 'card', 'die', 'locked'] });

    const applicable = flippablePiles(state, templates, selectedPileIds(state));
    expect(applicable).toEqual(['deck', 'card']);

    flipPiles(state, templates, selectedPileIds(state));
    normalize(state, templates, { dev: true });

    expect(state.piles.deck.cardIds).toEqual(['c2', 'c1']); // reversed
    expect(state.cards.c1.isFlipped).toBe(false);
    expect(state.cards.c2.isFlipped).toBe(false);
    expect(state.cards.c3.isFlipped).toBe(true);
    expect(state.cards.d1.isFlipped).toBe(false); // die untouched
    expect(state.cards.c4.isFlipped).toBe(false); // locked untouched
  });

  it('a selection of only dice is not flippable at all — no commit needed', () => {
    const state = stateWithPiles(diePile('die1', 'd1'), diePile('die2', 'd2'));
    expect(flippablePiles(state, templates, ['die1', 'die2'])).toEqual([]);
  });

  it('R rotates every unlocked selected pile by the same delta', () => {
    const state = stateWithPiles(
      singleCardPile('a', 'c1'),
      singleCardPile('b', 'c2'),
      singleCardPile('locked', 'c3', 0, 0, { locked: true })
    );
    state.cards.c2.rotation = 270;

    expect(rotatablePiles(state, ['a', 'b', 'locked'])).toEqual(['a', 'b']);
    rotatePiles(state, ['a', 'b', 'locked'], 90);

    expect(state.cards.c1.rotation).toBe(90);
    expect(state.cards.c2.rotation).toBe(0); // wrapped past 360
    expect(state.cards.c3.rotation).toBe(0); // locked untouched
  });

  it('S shuffles only unlocked multi-card piles, deterministically under an injected rng', () => {
    const state = stateWithPiles(
      deck('deck', ['c1', 'c2', 'c3']),
      singleCardPile('single', 'c4'),
      { ...deck('lockedDeck', ['c5', 'c6']), pile: makePile({ id: 'lockedDeck', cardIds: ['c5', 'c6'], locked: true }) }
    );

    expect(shufflablePiles(state, ['deck', 'single', 'lockedDeck'])).toEqual(['deck']);

    shufflePiles(state, ['deck', 'single', 'lockedDeck'], () => 0);
    normalize(state, templates, { dev: true });

    // Fisher–Yates with rng()=0 swaps each element with index 0 in turn.
    expect(state.piles.deck.cardIds).toEqual(['c2', 'c3', 'c1']);
    expect(state.piles.single.cardIds).toEqual(['c4']);
    expect(state.piles.lockedDeck.cardIds).toEqual(['c5', 'c6']);
  });
});

describe('pileActions — the context menu shows exactly the applicable actions', () => {
  it('a single-card pile: flip, rotate, lock (plus reorder when it has neighbours)', () => {
    const alone = stateWithPiles(singleCardPile('p1', 'c1'));
    expect(pileActions(alone, templates, 'p1')).toEqual(['flip', 'rotate', 'lock']);

    const crowded = stateWithPiles(singleCardPile('p1', 'c1'), singleCardPile('p2', 'c2'));
    expect(pileActions(crowded, templates, 'p1')).toEqual([
      'flip',
      'rotate',
      'lock',
      'send-front',
      'send-back'
    ]);
  });

  it('a multi-card pile adds shuffle and flip-top', () => {
    const state = stateWithPiles(deck('deck', ['c1', 'c2']));
    expect(pileActions(state, templates, 'deck')).toEqual([
      'flip',
      'rotate',
      'shuffle',
      'flip-top',
      'lock'
    ]);
  });

  it('a locked pile offers only unlock', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1', 0, 0, { locked: true }));
    expect(pileActions(state, templates, 'p1')).toEqual(['unlock']);
  });

  it('a die pile skips flip and flip-top (not flippable)', () => {
    const state = stateWithPiles(diePile('die', 'd1'));
    expect(pileActions(state, templates, 'die')).toEqual(['rotate', 'lock']);
  });
});

describe('applyPileAction', () => {
  it('flip-top reveals only the top card, leaving the rest of the deck untouched', () => {
    const state = stateWithPiles(deck('deck', ['c1', 'c2', 'c3']));

    applyPileAction(state, templates, 'deck', 'flip-top');
    normalize(state, templates, { dev: true });

    expect(state.piles.deck.cardIds).toEqual(['c1', 'c2', 'c3']); // order intact
    expect(state.cards.c3.isFlipped).toBe(false); // top revealed
    expect(state.cards.c1.isFlipped).toBe(true);
    expect(state.cards.c2.isFlipped).toBe(true);
  });

  it('lock then unlock round-trips the locked flag', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'));

    applyPileAction(state, templates, 'p1', 'lock');
    expect(state.piles.p1.locked).toBe(true);

    applyPileAction(state, templates, 'p1', 'unlock');
    expect(state.piles.p1.locked).toBe(false);
  });

  it('send-front and send-back reorder the pile within its container', () => {
    const state = stateWithPiles(
      singleCardPile('a', 'c1'),
      singleCardPile('b', 'c2'),
      singleCardPile('c', 'c3')
    );

    applyPileAction(state, templates, 'a', 'send-front');
    expect(state.rootPileIds).toEqual(['b', 'c', 'a']);

    applyPileAction(state, templates, 'c', 'send-back');
    expect(state.rootPileIds).toEqual(['c', 'b', 'a']);
  });

  it('is a safe no-op for a pile that no longer exists', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'));
    const before = structuredClone(state);

    applyPileAction(state, templates, 'ghost', 'flip');

    expect(state).toEqual(before);
  });
});
