import { describe, it, expect } from 'vitest';
import { emptyTabletopState } from './initialization';
import { normalize } from './normalize';
import {
  clearSelection,
  flipPile,
  flipTopCard,
  isPileFlippable,
  isPileMergeable,
  isPileSelected,
  lowerPile,
  mergePiles,
  movePileTo,
  normalizeDegrees,
  raisePile,
  rotatePile,
  setPileLocked,
  setSelection,
  shufflePile,
  spawnPileFromTemplate,
  splitTopCard
} from './operations';
import { cardTemplate, diceTemplate, makeTemplates, singleCardPile, stateWithPiles } from './fixtures';
import { cardAabbSize, pileFootprint, templateDisplaySize, PX_PER_MM } from './geometry';
import { makeCard, makePile } from './fixtures';

describe('spawnPileFromTemplate', () => {
  const template = cardTemplate();
  const templates = makeTemplates(template);

  it('spawns a single-instance component as one face-up card pile at the drop point', () => {
    const state = emptyTabletopState();

    const pileId = spawnPileFromTemplate(state, template, [null], 120, 80);

    expect(pileId).not.toBeNull();
    const pile = state.piles[pileId!];
    expect(pile).toMatchObject({ zoneId: null, x: 120, y: 80, locked: false });
    expect(pile.cardIds).toHaveLength(1);
    const card = state.cards[pile.cardIds[0]];
    expect(card.isFlipped).toBe(false);
    expect(card.rotation).toBe(0);
    expect(card.templateId).toBe(template.id);
    expect(state.rootPileIds).toEqual([pileId]);
    expect(() => normalize(state, templates, { dev: true })).not.toThrow();
  });

  it('spawns multiple instances as one face-down pile preserving instance order (last = top)', () => {
    const state = emptyTabletopState();
    const rows = [{ Name: 'A' }, { Name: 'B' }, { Name: 'C' }];

    const pileId = spawnPileFromTemplate(state, template, rows, 0, 0);

    const pile = state.piles[pileId!];
    expect(pile.cardIds).toHaveLength(3);
    const names = pile.cardIds.map((id) => state.cards[id].mergeData?.Name);
    expect(names).toEqual(['A', 'B', 'C']);
    for (const id of pile.cardIds) {
      expect(state.cards[id].isFlipped).toBe(true);
    }
    expect(() => normalize(state, templates, { dev: true })).not.toThrow();
  });

  it('spawning creates no zones', () => {
    const state = emptyTabletopState();
    spawnPileFromTemplate(state, template, [null, null], 0, 0);
    expect(Object.keys(state.zones)).toHaveLength(0);
    expect(state.zoneOrder).toHaveLength(0);
  });

  it('spawns nothing for an empty instance list', () => {
    const state = emptyTabletopState();
    expect(spawnPileFromTemplate(state, template, [], 0, 0)).toBeNull();
    expect(Object.keys(state.piles)).toHaveLength(0);
    expect(Object.keys(state.cards)).toHaveLength(0);
  });
});

describe('splitTopCard', () => {
  const templates = makeTemplates(cardTemplate());

  it('pulls the top card into a new single-card pile at the source centre, on top of the render order', () => {
    const state = stateWithPiles(
      {
        pile: makePile({ id: 'p1', cardIds: ['c1', 'c2', 'c3'], x: 150, y: 250 }),
        cards: [makeCard({ id: 'c1' }), makeCard({ id: 'c2' }), makeCard({ id: 'c3' })]
      },
      singleCardPile('p2', 'c4', 500, 0)
    );

    splitTopCard(state, 'p1', 'split');
    normalize(state, templates, { dev: true });

    expect(state.piles.p1.cardIds).toEqual(['c1', 'c2']);
    expect(state.piles.split).toMatchObject({
      zoneId: null,
      x: 150,
      y: 250,
      locked: false,
      cardIds: ['c3']
    });
    expect(state.rootPileIds).toEqual(['p1', 'p2', 'split']);
  });

  it('is a no-op on a pile of one — single cards move whole, never split', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'));
    const before = structuredClone(state);

    splitTopCard(state, 'p1', 'split');

    expect(state).toEqual(before);
  });
});

describe('mergePiles', () => {
  const templates = makeTemplates(cardTemplate());

  it('stacks the source\'s cards on top of the target in order, each keeping rotation and face state', () => {
    const state = stateWithPiles(
      {
        pile: makePile({ id: 'target', cardIds: ['t1'], x: 0, y: 0 }),
        cards: [makeCard({ id: 't1' })]
      },
      {
        pile: makePile({ id: 'source', cardIds: ['s1', 's2'], x: 10, y: 10 }),
        cards: [
          makeCard({ id: 's1', rotation: 90, isFlipped: true }),
          makeCard({ id: 's2', rotation: 180 })
        ]
      }
    );

    mergePiles(state, 'source', 'target');
    normalize(state, templates, { dev: true });

    expect(state.piles.source).toBeUndefined();
    expect(state.piles.target.cardIds).toEqual(['t1', 's1', 's2']);
    expect(state.cards.s1).toMatchObject({ rotation: 90, isFlipped: true });
    expect(state.cards.s2).toMatchObject({ rotation: 180, isFlipped: false });
    expect(state.rootPileIds).toEqual(['target']);
  });

  it('merging a pile into itself is a no-op', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'));
    const before = structuredClone(state);

    mergePiles(state, 'p1', 'p1');

    expect(state).toEqual(before);
  });
});

describe('isPileMergeable', () => {
  const templates = makeTemplates(cardTemplate(), diceTemplate());

  it('card piles are mergeable; dice piles and mixed piles are not', () => {
    const state = stateWithPiles(
      singleCardPile('cards', 'c1'),
      {
        pile: makePile({ id: 'die', cardIds: ['d1'] }),
        cards: [makeCard({ id: 'd1', templateId: 'tpl-dice' })]
      },
      {
        pile: makePile({ id: 'mixed', cardIds: ['c2', 'd2'] }),
        cards: [makeCard({ id: 'c2' }), makeCard({ id: 'd2', templateId: 'tpl-dice' })]
      }
    );

    expect(isPileMergeable(state, templates, state.piles.cards)).toBe(true);
    expect(isPileMergeable(state, templates, state.piles.die)).toBe(false);
    expect(isPileMergeable(state, templates, state.piles.mixed)).toBe(false);
  });
});

describe('flipPile', () => {
  const templates = makeTemplates(cardTemplate(), diceTemplate());

  it('reverses the card order and toggles every face — like physically turning the deck over', () => {
    const state = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1', 'c2', 'c3'] }),
      cards: [
        makeCard({ id: 'c1', isFlipped: true }),
        makeCard({ id: 'c2', isFlipped: true }),
        makeCard({ id: 'c3', isFlipped: false })
      ]
    });

    flipPile(state, templates, 'p1');
    normalize(state, templates, { dev: true });

    expect(state.piles.p1.cardIds).toEqual(['c3', 'c2', 'c1']);
    expect(state.cards.c1.isFlipped).toBe(false);
    expect(state.cards.c2.isFlipped).toBe(false);
    expect(state.cards.c3.isFlipped).toBe(true);
  });

  it('degenerates to a plain flip for a pile of one', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'));

    flipPile(state, templates, 'p1');

    expect(state.piles.p1.cardIds).toEqual(['c1']);
    expect(state.cards.c1.isFlipped).toBe(true);
  });

  it('skips a pile with nothing flippable in it (a die)', () => {
    const state = stateWithPiles({
      pile: makePile({ id: 'die', cardIds: ['d1'] }),
      cards: [makeCard({ id: 'd1', templateId: 'tpl-dice' })]
    });

    expect(isPileFlippable(state, templates, state.piles.die)).toBe(false);
    flipPile(state, templates, 'die');
    expect(state.cards.d1.isFlipped).toBe(false);
  });
});

describe('flipTopCard', () => {
  const templates = makeTemplates(cardTemplate(), diceTemplate());

  it('toggles only the top card, preserving order and the rest of the deck', () => {
    const state = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1', 'c2'] }),
      cards: [makeCard({ id: 'c1', isFlipped: true }), makeCard({ id: 'c2', isFlipped: true })]
    });

    flipTopCard(state, templates, 'p1');

    expect(state.piles.p1.cardIds).toEqual(['c1', 'c2']);
    expect(state.cards.c1.isFlipped).toBe(true);
    expect(state.cards.c2.isFlipped).toBe(false);
  });

  it('skips a non-flippable top card (a die)', () => {
    const state = stateWithPiles({
      pile: makePile({ id: 'die', cardIds: ['d1'] }),
      cards: [makeCard({ id: 'd1', templateId: 'tpl-dice' })]
    });

    flipTopCard(state, templates, 'die');

    expect(state.cards.d1.isFlipped).toBe(false);
  });
});

describe('rotatePile', () => {
  it('rotates every card by the same delta, preserving relative orientations', () => {
    const state = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1', 'c2'] }),
      cards: [makeCard({ id: 'c1', rotation: 0 }), makeCard({ id: 'c2', rotation: 180 })]
    });

    rotatePile(state, 'p1', 90);

    expect(state.cards.c1.rotation).toBe(90);
    expect(state.cards.c2.rotation).toBe(270);
  });

  it('wraps rotations into [0, 360)', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'));
    state.cards.c1.rotation = 270;

    rotatePile(state, 'p1', 90);

    expect(state.cards.c1.rotation).toBe(0);
  });
});

describe('shufflePile', () => {
  it('permutes the card order deterministically under an injected rng', () => {
    const state = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1', 'c2', 'c3'] }),
      cards: [makeCard({ id: 'c1' }), makeCard({ id: 'c2' }), makeCard({ id: 'c3' })]
    });

    shufflePile(state, 'p1', () => 0);

    expect(state.piles.p1.cardIds).toEqual(['c2', 'c3', 'c1']);
    expect([...state.piles.p1.cardIds].sort()).toEqual(['c1', 'c2', 'c3']); // same cards
  });

  it('is a no-op on a pile of one', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'));
    const before = structuredClone(state);

    shufflePile(state, 'p1', () => 0);

    expect(state).toEqual(before);
  });
});

describe('setPileLocked', () => {
  it('locks and unlocks a pile', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'));

    setPileLocked(state, 'p1', true);
    expect(state.piles.p1.locked).toBe(true);

    setPileLocked(state, 'p1', false);
    expect(state.piles.p1.locked).toBe(false);
  });
});

describe('lowerPile', () => {
  it('moves the pile to the bottom of the root render order', () => {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1'),
      singleCardPile('p2', 'c2'),
      singleCardPile('p3', 'c3')
    );

    lowerPile(state, 'p3');

    expect(state.rootPileIds).toEqual(['p3', 'p1', 'p2']);
  });

  it('leaves an already-bottom pile untouched', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'), singleCardPile('p2', 'c2'));
    lowerPile(state, 'p1');
    expect(state.rootPileIds).toEqual(['p1', 'p2']);
  });
});

describe('movePileTo', () => {
  it('moves a root pile to new world coordinates', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1', 10, 20));

    movePileTo(state, 'p1', 300, -40);

    expect(state.piles.p1.x).toBe(300);
    expect(state.piles.p1.y).toBe(-40);
  });

  it('throws for an unknown pile', () => {
    const state = emptyTabletopState();
    expect(() => movePileTo(state, 'nope', 0, 0)).toThrow(/Pile not found/);
  });
});

describe('raisePile', () => {
  it('moves the pile to the top of the root render order', () => {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1'),
      singleCardPile('p2', 'c2'),
      singleCardPile('p3', 'c3')
    );

    raisePile(state, 'p1');

    expect(state.rootPileIds).toEqual(['p2', 'p3', 'p1']);
  });

  it('leaves an already-top pile untouched', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'), singleCardPile('p2', 'c2'));
    raisePile(state, 'p2');
    expect(state.rootPileIds).toEqual(['p1', 'p2']);
  });
});

describe('selection', () => {
  it('selects piles and reports membership', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'), singleCardPile('p2', 'c2'));

    setSelection(state, { kind: 'piles', pileIds: ['p1'] });

    expect(isPileSelected(state, 'p1')).toBe(true);
    expect(isPileSelected(state, 'p2')).toBe(false);

    clearSelection(state);
    expect(state.selection).toEqual({ kind: 'none' });
    expect(isPileSelected(state, 'p1')).toBe(false);
  });
});

describe('geometry', () => {
  const template = cardTemplate();

  it('derives display size from physical mm at the tabletop scale', () => {
    expect(templateDisplaySize(template)).toEqual({
      width: 63.5 * PX_PER_MM,
      height: 88.9 * PX_PER_MM
    });
  });

  it('swaps card AABB width/height on odd quarter turns', () => {
    const upright = makeCard({ id: 'c', rotation: 0 });
    const sideways = makeCard({ id: 'c', rotation: 90 });
    const flipped180 = makeCard({ id: 'c', rotation: 180 });

    const size = templateDisplaySize(template);
    expect(cardAabbSize(upright, template)).toEqual(size);
    expect(cardAabbSize(sideways, template)).toEqual({ width: size.height, height: size.width });
    expect(cardAabbSize(flipped180, template)).toEqual(size);
  });

  it('derives a pile footprint from all cards — a sideways card grows it', () => {
    const state = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['top', 'under'] }),
      cards: [makeCard({ id: 'top' }), makeCard({ id: 'under', rotation: 90 })]
    });
    const templates = makeTemplates(template);

    const footprint = pileFootprint(state, templates, state.piles.p1);
    const size = templateDisplaySize(template);

    // Union of upright (w×h) and sideways (h×w): h×h for a portrait card.
    expect(footprint).toEqual({ width: size.height, height: size.height });
  });
});

describe('normalizeDegrees', () => {
  it('maps angles into [0, 360)', () => {
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(450)).toBe(90);
    expect(normalizeDegrees(-90)).toBe(270);
  });
});
