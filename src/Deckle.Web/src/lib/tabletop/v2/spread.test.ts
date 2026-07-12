// Ticket 07 — spread zones: layout math, the splay invariant from every
// entry path, insert-index derivation, and the zone-wide actions. All
// scenario-shaped: state in → state/plan out, at the pure-function seam.

import { describe, it, expect } from 'vitest';
import { applyDropPlan, movePileToZone, resolveDrop } from './drop';
import { detachPileToRoot, movePileTo, setPileLocked } from './operations';
import { normalize } from './normalize';
import {
  createSpreadZone,
  DEFAULT_SPREAD_OVERLAP,
  flipAllInZone,
  MIN_SPREAD_STEP,
  rotateAllInZone,
  selectAllInZone,
  setSpreadDirection,
  setSpreadOverlap,
  shuffleZoneContents,
  SPREAD_PADDING,
  spreadInsertIndex,
  zoneActions,
  zoneBehavior
} from './zones';
import { emptyTabletopState } from './initialization';
import type { SpreadZone, TabletopState } from './types';
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

const templates = makeTemplates(cardTemplate(), diceTemplate());

// Display sizes at 2px/mm: card 127×177.8, die 32×32.
const CARD_W = 127;
const CARD_H = 177.8;
const DIE = 32;

/** A row spread at world (1000, 1000), 600×220, default overlap 40. */
function addSpread(
  state: TabletopState,
  pileIds: string[] = [],
  overrides: Partial<SpreadZone> = {}
): TabletopState {
  return withZone(
    state,
    {
      id: 'hand',
      type: 'spread',
      direction: 'row',
      overlap: DEFAULT_SPREAD_OVERLAP,
      x: 1000,
      y: 1000,
      width: 600,
      height: 220,
      ...overrides
    },
    pileIds
  );
}

function spread(state: TabletopState): SpreadZone {
  return state.zones.hand as SpreadZone;
}

/** Zone-local primary-axis centres in zone order. */
function centres(state: TabletopState, axis: 'x' | 'y' = 'x'): number[] {
  return spread(state).pileIds.map((id) => state.piles[id][axis]);
}

/** A laid-out spread holding three single cards (h1, h2, h3 left to right). */
function threeCardSpread(): TabletopState {
  const state = addSpread(
    stateWithPiles(
      singleCardPile('h1', 'c1'),
      singleCardPile('h2', 'c2'),
      singleCardPile('h3', 'c3')
    ),
    ['h1', 'h2', 'h3']
  );
  normalize(state, templates, { dev: true });
  return state;
}

describe('spread creation', () => {
  it('creates an ordered, shuffleable strip with row/overlap defaults', () => {
    const state = emptyTabletopState();
    const id = createSpreadZone(state, 100, 50);
    normalize(state, templates, { dev: true });

    expect(state.zones[id]).toMatchObject({
      type: 'spread',
      direction: 'row',
      overlap: DEFAULT_SPREAD_OVERLAP,
      pileIds: [],
      locked: false
    });
    expect(state.zoneOrder).toEqual([id]);
    expect(zoneBehavior(state.zones[id]).ordered).toBe(true);
    expect(zoneBehavior(state.zones[id]).shuffleable).toBe(true);
  });
});

describe('spread layout — positions written into state', () => {
  it('advances by each pile’s own footprint minus the overlap (heterogeneous sizes)', () => {
    const state = addSpread(
      stateWithPiles(singleCardPile('card', 'c1'), {
        pile: makePile({ id: 'die', cardIds: ['d1'] }),
        cards: [makeCard({ id: 'd1', templateId: 'tpl-dice' })]
      }),
      ['card', 'die']
    );
    normalize(state, templates, { dev: true });

    // Card: centre at padding + half its width; die follows after the
    // card's step (its width minus overlap), not after a uniform slot.
    expect(state.piles.card.x).toBeCloseTo(SPREAD_PADDING + CARD_W / 2);
    expect(state.piles.die.x).toBeCloseTo(SPREAD_PADDING + (CARD_W - 40) + DIE / 2);
    // Both centred on the cross axis.
    expect(state.piles.card.y).toBeCloseTo(110);
    expect(state.piles.die.y).toBeCloseTo(110);
  });

  it('column direction lays out along y, centred on x — and relayouts immediately', () => {
    const state = addSpread(
      stateWithPiles(singleCardPile('card', 'c1'), {
        pile: makePile({ id: 'die', cardIds: ['d1'] }),
        cards: [makeCard({ id: 'd1', templateId: 'tpl-dice' })]
      }),
      ['card', 'die']
    );
    normalize(state, templates, { dev: true });

    setSpreadDirection(state, templates, 'hand', 'column');

    expect(state.piles.card.y).toBeCloseTo(SPREAD_PADDING + CARD_H / 2);
    expect(state.piles.die.y).toBeCloseTo(SPREAD_PADDING + (CARD_H - 40) + DIE / 2);
    expect(state.piles.card.x).toBeCloseTo(300);
    expect(state.piles.die.x).toBeCloseTo(300);
  });

  it('overlap changes relayout immediately; runaway overlap clamps to the minimum step', () => {
    const state = threeCardSpread();

    setSpreadOverlap(state, templates, 'hand', 100);
    expect(centres(state)).toEqual([
      SPREAD_PADDING + CARD_W / 2,
      SPREAD_PADDING + (CARD_W - 100) + CARD_W / 2,
      SPREAD_PADDING + 2 * (CARD_W - 100) + CARD_W / 2
    ]);

    // Overlap past the card width can't collapse the layout…
    setSpreadOverlap(state, templates, 'hand', 500);
    expect(centres(state)).toEqual([
      SPREAD_PADDING + CARD_W / 2,
      SPREAD_PADDING + MIN_SPREAD_STEP + CARD_W / 2,
      SPREAD_PADDING + 2 * MIN_SPREAD_STEP + CARD_W / 2
    ]);

    // …and a negative overlap clamps to zero (cards laid edge to edge).
    setSpreadOverlap(state, templates, 'hand', -10);
    expect(spread(state).overlap).toBe(0);
    expect(centres(state)[1]).toBeCloseTo(SPREAD_PADDING + CARD_W + CARD_W / 2);
  });

  it('rotating the contents relayouts on commit with the rotated footprints', () => {
    const state = threeCardSpread();

    rotateAllInZone(state, 'hand', 90);
    normalize(state, templates, { dev: true });

    // Sideways cards step by their rotated (height-first) footprint.
    const xs = centres(state);
    expect(xs[0]).toBeCloseTo(SPREAD_PADDING + CARD_H / 2);
    expect(xs[1]).toBeCloseTo(SPREAD_PADDING + (CARD_H - 40) + CARD_H / 2);
    expect(xs[2]).toBeCloseTo(SPREAD_PADDING + 2 * (CARD_H - 40) + CARD_H / 2);
    expect(Object.values(state.cards).every((c) => c.rotation === 90)).toBe(true);
  });
});

describe('splay invariant — a spread only ever contains single-card piles', () => {
  it('dropping a 40-card deck splays it into 40 ordered single-card piles', () => {
    const cards = Array.from({ length: 40 }, (_, i) => makeCard({ id: `c${i}` }));
    const state = addSpread(
      stateWithPiles({
        pile: makePile({ id: 'deck', cardIds: cards.map((c) => c.id), x: 1100, y: 1010 }),
        cards
      })
    );

    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'deck' }, { x: 1100, y: 1010 });
    expect(plan).toMatchObject({ kind: 'place-pile', zoneId: 'hand', index: 0 });
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    // 40 single-card piles, in deck order: pile-bottom first, pile-top last,
    // so the deck's top card renders on top of the overlap (last in order).
    const zone = spread(state);
    expect(state.piles.deck).toBeUndefined();
    expect(zone.pileIds).toHaveLength(40);
    expect(zone.pileIds.map((id) => state.piles[id].cardIds)).toEqual(cards.map((c) => [c.id]));
    expect(zone.pileIds.every((id) => state.piles[id].zoneId === 'hand')).toBe(true);
    // Laid out left to right by the layout invariant.
    expect(centres(state)[0]).toBeCloseTo(SPREAD_PADDING + CARD_W / 2);
    expect(centres(state)[39]).toBeCloseTo(SPREAD_PADDING + 39 * (CARD_W - 40) + CARD_W / 2);
  });

  it('a sidebar deck drop (template spawn) splays through the same pipeline', () => {
    const template = cardTemplate({ instances: [null, null, null] });
    const state = addSpread(emptyTabletopState());
    const tpls = makeTemplates(template);

    const plan = resolveDrop(state, tpls, { kind: 'template', templateId: template.id }, { x: 1100, y: 1010 });
    expect(plan).toMatchObject({ kind: 'spawn-pile', zoneId: 'hand', index: 0 });
    applyDropPlan(state, tpls, plan);
    normalize(state, tpls, { dev: true });

    const zone = spread(state);
    expect(zone.pileIds).toHaveLength(3);
    expect(zone.pileIds.every((id) => state.piles[id].cardIds.length === 1)).toBe(true);
    // The multi-instance spawn heuristic (a deck arrives face-down) survives
    // the splay per card.
    expect(Object.values(state.cards).every((c) => c.isFlipped)).toBe(true);
  });

  it('a programmatic "Move to zone" splays like any other entry path', () => {
    const cards = [makeCard({ id: 'c1' }), makeCard({ id: 'c2' }), makeCard({ id: 'c3' })];
    const state = addSpread(
      stateWithPiles({
        pile: makePile({ id: 'deck', cardIds: ['c1', 'c2', 'c3'], x: 5000, y: 5000 }),
        cards
      })
    );

    movePileToZone(state, templates, 'deck', 'hand');
    normalize(state, templates, { dev: true });

    expect(spread(state).pileIds.map((id) => state.piles[id].cardIds)).toEqual([
      ['c1'],
      ['c2'],
      ['c3']
    ]);
  });

  it('normalize re-establishes the invariant on a raw state without throwing in dev', () => {
    // A multi-card pile placed straight into the zone list — the state a
    // conversion (ticket 12) or any missed path would produce.
    const cards = [makeCard({ id: 'c1' }), makeCard({ id: 'c2' })];
    const state = addSpread(
      stateWithPiles({ pile: makePile({ id: 'deck', cardIds: ['c1', 'c2'] }), cards }),
      ['deck']
    );

    expect(() => normalize(state, templates, { dev: true })).not.toThrow();

    const zone = spread(state);
    expect(zone.pileIds).toHaveLength(2);
    expect(zone.pileIds.map((id) => state.piles[id].cardIds)).toEqual([['c1'], ['c2']]);
    expect(centres(state)[0]).toBeCloseTo(SPREAD_PADDING + CARD_W / 2);
  });

  it('merging onto a card inside the spread splays back to singles beside it', () => {
    const state = threeCardSpread();
    const dropped = singleCardPile('loose', 'c4', 0, 0);
    state.piles.loose = dropped.pile;
    state.cards.c4 = dropped.cards[0];
    state.rootPileIds.push('loose');

    // Pointer on h1's face (world = zone origin + h1's centre): the
    // universal merge rule wins, then the splay invariant fans the merged
    // pair back out — the dropped card ends up directly after its target.
    const world = { x: 1000 + state.piles.h1.x, y: 1000 + state.piles.h1.y };
    movePileTo(state, 'loose', world.x, world.y);
    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'loose' }, world);
    expect(plan).toMatchObject({ kind: 'merge-piles', targetPileId: 'h1' });
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    expect(spread(state).pileIds.map((id) => state.piles[id].cardIds)).toEqual([
      ['c1'],
      ['c4'],
      ['c2'],
      ['c3']
    ]);
  });
});

describe('insert-index derivation and gap closing', () => {
  it('derives the slot from the point along the primary axis', () => {
    const state = threeCardSpread();
    const zone = spread(state);
    // Laid-out centres: 75.5, 162.5, 249.5 (zone-local, +1000 world).

    expect(spreadInsertIndex(state, zone, { x: 1050, y: 1010 })).toBe(0);
    expect(spreadInsertIndex(state, zone, { x: 1100, y: 1010 })).toBe(1);
    expect(spreadInsertIndex(state, zone, { x: 1200, y: 1010 })).toBe(2);
    expect(spreadInsertIndex(state, zone, { x: 1900, y: 1010 })).toBe(3);
  });

  it('a die drops between two cards at the indicated slot — no content restrictions', () => {
    const state = threeCardSpread();
    state.piles.die = makePile({ id: 'die', cardIds: ['d1'], x: 1100, y: 1010 });
    state.cards.d1 = makeCard({ id: 'd1', templateId: 'tpl-dice' });
    state.rootPileIds.push('die');

    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'die' }, { x: 1100, y: 1010 });
    expect(plan).toMatchObject({ kind: 'place-pile', zoneId: 'hand', index: 1 });
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    expect(spread(state).pileIds).toEqual(['h1', 'die', 'h2', 'h3']);
    // The die sits in the row, stepped after the first card.
    expect(state.piles.die.x).toBeCloseTo(SPREAD_PADDING + (CARD_W - 40) + DIE / 2);
  });

  it('dragging a card out closes the gap; dropping it back at an index inserts there', () => {
    const state = threeCardSpread();

    // Pick the middle card up (what drag activation does) and commit.
    detachPileToRoot(state, 'h2');
    normalize(state, templates, { dev: true });

    expect(spread(state).pileIds).toEqual(['h1', 'h3']);
    expect(centres(state)).toEqual([
      SPREAD_PADDING + CARD_W / 2,
      SPREAD_PADDING + (CARD_W - 40) + CARD_W / 2
    ]);

    // Drop it back before the first card (pointer above the cards' band, so
    // no merge target under it).
    movePileTo(state, 'h2', 1030, 1010);
    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'h2' }, { x: 1030, y: 1010 });
    expect(plan).toMatchObject({ kind: 'place-pile', zoneId: 'hand', index: 0 });
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    expect(spread(state).pileIds).toEqual(['h2', 'h1', 'h3']);
  });
});

describe('zone-wide actions', () => {
  it('shuffle permutes the order and relayouts; injectable random is deterministic', () => {
    const state = threeCardSpread();

    // random() = 0 drives Fisher–Yates [h1,h2,h3] → [h2,h3,h1].
    shuffleZoneContents(state, templates, 'hand', () => 0);

    expect(spread(state).pileIds).toEqual(['h2', 'h3', 'h1']);
    // Relaid immediately: positions are the canonical layout sequence again.
    expect(centres(state)).toEqual([
      SPREAD_PADDING + CARD_W / 2,
      SPREAD_PADDING + (CARD_W - 40) + CARD_W / 2,
      SPREAD_PADDING + 2 * (CARD_W - 40) + CARD_W / 2
    ]);
  });

  it('shuffling a freeform zone is a no-op (behaviour table dispatch)', () => {
    const state = withZone(
      stateWithPiles(singleCardPile('p1', 'c1', 50, 50), singleCardPile('p2', 'c2', 150, 50)),
      { id: 'z1', x: 0, y: 0 },
      ['p1', 'p2']
    );
    const before = structuredClone(state);

    shuffleZoneContents(state, templates, 'z1', () => 0);

    expect(state).toEqual(before);
  });

  it('flip-all flips every card once; rotate-all skips locked piles', () => {
    const state = threeCardSpread();
    setPileLocked(state, 'h2', true);

    flipAllInZone(state, templates, 'hand');
    rotateAllInZone(state, 'hand', 90);
    normalize(state, templates, { dev: true });

    // Flip-all skips the locked pile too — locked means inert.
    expect(state.cards.c1.isFlipped).toBe(true);
    expect(state.cards.c2.isFlipped).toBe(false);
    expect(state.cards.c3.isFlipped).toBe(true);
    expect(state.cards.c1.rotation).toBe(90);
    expect(state.cards.c2.rotation).toBe(0);
    expect(state.cards.c3.rotation).toBe(90);
  });

  it('select-all selects the unlocked piles in zone order', () => {
    const state = threeCardSpread();
    setPileLocked(state, 'h1', true);

    selectAllInZone(state, 'hand');

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['h2', 'h3'] });
  });

  it('a populated spread offers the zone-wide actions, shuffle included', () => {
    const state = threeCardSpread();

    expect(zoneActions(state, templates, 'hand')).toEqual([
      'edit',
      'select-all',
      'flip-all',
      'rotate-all',
      'shuffle',
      'lock',
      'delete'
    ]);
  });
});
