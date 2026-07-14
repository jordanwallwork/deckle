// Ticket 08 — spread precision: merge-vs-insert disambiguation by pointer
// position (stories 24/25), the insertion-hint derivation the indicator
// renders from, and the resolver's behaviour at overlapped hitboxes and zone
// edges. All scenario-shaped: state in → plan/state out, at the seam.

import { describe, it, expect } from 'vitest';
import {
  applyDropPlan,
  dropTargetZoneAt,
  resolveDrop,
  spreadInsertHint
} from './drop';
import { detachPileToRoot, movePileTo, setPileLocked } from './operations';
import { normalize } from './normalize';
import {
  setSpreadOverlap,
  SPREAD_INSERT_BAND_MAX,
  spreadSlots
} from './zones';
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

// Display sizes at 2px/mm: card 127×177.8. Zone at world (1000, 1000), so
// world = zone-local + 1000 on both axes; the cards' cross-axis centre line
// is world y = 1110.
const MID_Y = 1110;

/** A row spread at world (1000, 1000) holding three single cards. */
function threeCardSpread(overrides: Partial<SpreadZone> = {}): TabletopState {
  const state = withZone(
    stateWithPiles(
      singleCardPile('h1', 'c1'),
      singleCardPile('h2', 'c2'),
      singleCardPile('h3', 'c3')
    ),
    {
      id: 'hand',
      type: 'spread',
      direction: 'row',
      overlap: 40,
      x: 1000,
      y: 1000,
      width: 600,
      height: 220,
      ...overrides
    },
    ['h1', 'h2', 'h3']
  );
  normalize(state, templates, { dev: true });
  return state;
}

/** Add a loose root card (rotated + flipped, so merge preservation shows). */
function withLooseCard(state: TabletopState): TabletopState {
  state.piles.loose = makePile({ id: 'loose', cardIds: ['c4'], x: 500, y: 500 });
  state.cards.c4 = makeCard({ id: 'c4', rotation: 90, isFlipped: true });
  state.rootPileIds.push('loose');
  return state;
}

/** Resolve dropping the loose card with the pointer at world (x, MID_Y). */
function dropLooseAt(state: TabletopState, x: number) {
  movePileTo(state, 'loose', x, MID_Y);
  return resolveDrop(state, templates, { kind: 'pile', pileId: 'loose' }, { x, y: MID_Y });
}

function order(state: TabletopState): string[][] {
  return (state.zones.hand as SpreadZone).pileIds.map((id) => state.piles[id].cardIds);
}

describe('merge vs insert by pointer position (stories 24/25)', () => {
  // Default overlap 40 → seams at zone-local 12, 99, 186, 313; each covered
  // card's visible sliver is 87px wide, so the flanking insert bands are the
  // capped SPREAD_INSERT_BAND_MAX = 16px.

  it('the middle of a card’s visible sliver merges onto it, face and rotation preserved', () => {
    const state = withLooseCard(threeCardSpread());

    const plan = dropLooseAt(state, 1050); // mid h1 sliver [12, 99]
    expect(plan).toMatchObject({ kind: 'merge-piles', sourcePileId: 'loose', targetPileId: 'h1' });

    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    // Splayed back to singles directly after its target, untouched.
    expect(order(state)).toEqual([['c1'], ['c4'], ['c2'], ['c3']]);
    expect(state.cards.c4).toMatchObject({ rotation: 90, isFlipped: true });
  });

  it('the bands flanking a seam insert at that slot — from either covering card', () => {
    // Seam 1 sits at zone-local 99 (h2's leading edge). Local 90 is over h1
    // (h2's rect starts at 99), local 105 is over h2 — both within 16px of
    // the seam, so both insert at slot 1.
    for (const x of [1090, 1105]) {
      const state = withLooseCard(threeCardSpread());
      const plan = dropLooseAt(state, x);
      expect(plan).toMatchObject({ kind: 'place-pile', pileId: 'loose', zoneId: 'hand', index: 1 });

      applyDropPlan(state, templates, plan);
      normalize(state, templates, { dev: true });
      expect(order(state)).toEqual([['c1'], ['c4'], ['c2'], ['c3']]);
    }
  });

  it('the last card offers merge on its body and insert-after at its trailing edge', () => {
    // h3's sliver is its full width [186, 313]; band 16px.
    expect(dropLooseAt(withLooseCard(threeCardSpread()), 1250)).toMatchObject({
      kind: 'merge-piles',
      targetPileId: 'h3'
    });
    expect(dropLooseAt(withLooseCard(threeCardSpread()), 1305)).toMatchObject({
      kind: 'place-pile',
      zoneId: 'hand',
      index: 3
    });
  });

  it('both gestures stay reachable in a tightly-overlapped spread', () => {
    // Overlap 500 clamps to the 8px minimum step: seams at 12, 20, 28, 155;
    // covered slivers are 8px, so the bands shrink to 2px each side and the
    // middle 4px still merge.
    const base = () => {
      const state = withLooseCard(threeCardSpread());
      setSpreadOverlap(state, templates, 'hand', 500);
      return state;
    };
    expect(SPREAD_INSERT_BAND_MAX).toBeGreaterThan(2); // the cap isn't what shrank them

    expect(dropLooseAt(base(), 1016)).toMatchObject({ kind: 'merge-piles', targetPileId: 'h1' });
    expect(dropLooseAt(base(), 1019)).toMatchObject({ kind: 'place-pile', index: 1 });
    expect(dropLooseAt(base(), 1021)).toMatchObject({ kind: 'place-pile', index: 1 });
    expect(dropLooseAt(base(), 1024)).toMatchObject({ kind: 'merge-piles', targetPileId: 'h2' });
    expect(dropLooseAt(base(), 1027)).toMatchObject({ kind: 'place-pile', index: 2 });
    expect(dropLooseAt(base(), 1100)).toMatchObject({ kind: 'merge-piles', targetPileId: 'h3' });
  });

  it('a refused merge over a card face still lands in the spread at the nearest slot', () => {
    // Locked target: the merge is refused, but the drop stays in the spread.
    const locked = withLooseCard(threeCardSpread());
    setPileLocked(locked, 'h2', true);
    expect(dropLooseAt(locked, 1140)).toMatchObject({
      kind: 'place-pile',
      pileId: 'loose',
      zoneId: 'hand',
      index: 1 // nearest seam to local 140 (99 vs 186)
    });

    // Unmergeable payload: a die dropped on a card's face slots beside it.
    const state = threeCardSpread();
    state.piles.die = makePile({ id: 'die', cardIds: ['d1'], x: 500, y: 500 });
    state.cards.d1 = makeCard({ id: 'd1', templateId: 'tpl-dice' });
    state.rootPileIds.push('die');
    movePileTo(state, 'die', 1140, MID_Y);
    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'die' }, { x: 1140, y: MID_Y });
    expect(plan).toMatchObject({ kind: 'place-pile', pileId: 'die', zoneId: 'hand', index: 1 });

    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });
    expect((state.zones.hand as SpreadZone).pileIds).toEqual(['h1', 'die', 'h2', 'h3']);
  });

  it('cards overhanging the zone edge keep full precision (drop resolves against the spread)', () => {
    // A zone only 100px wide: its single card's rect [12, 139] overhangs the
    // right edge, so these pointers sit outside the zone rectangle entirely.
    const base = () => {
      const state = withZone(
        stateWithPiles(singleCardPile('h1', 'c1')),
        { id: 'hand', type: 'spread', direction: 'row', overlap: 40, x: 1000, y: 1000, width: 100, height: 220 },
        ['h1']
      );
      normalize(state, templates, { dev: true });
      return withLooseCard(state);
    };

    expect(dropLooseAt(base(), 1110)).toMatchObject({ kind: 'merge-piles', targetPileId: 'h1' });
    const insert = dropLooseAt(base(), 1130); // within 16px of the trailing edge 139
    expect(insert).toMatchObject({ kind: 'place-pile', zoneId: 'hand', index: 1 });
  });

  it('a multi-pile drop in a seam band inserts every pile instead of merging any', () => {
    const state = threeCardSpread();
    const extra1 = singleCardPile('m1', 'c4', 1090, MID_Y);
    const extra2 = singleCardPile('m2', 'c5', 1095, MID_Y);
    for (const { pile, cards } of [extra1, extra2]) {
      state.piles[pile.id] = pile;
      state.cards[cards[0].id] = cards[0];
      state.rootPileIds.push(pile.id);
    }

    // Pointer in the band beside seam 1: no merge; each pile slots by its
    // own centre (both nearest seam 1 here).
    const plan = resolveDrop(
      state,
      templates,
      { kind: 'piles', pileIds: ['m1', 'm2'] },
      { x: 1090, y: MID_Y }
    );
    expect(plan.kind).toBe('multi');
    if (plan.kind !== 'multi') return;
    expect(plan.plans).toHaveLength(2);
    for (const sub of plan.plans) {
      expect(sub).toMatchObject({ kind: 'place-pile', zoneId: 'hand', index: 1 });
    }
  });
});

describe('mid-drag gaps — slots follow what the user sees', () => {
  it('a card lifted out leaves its slot open until commit, and drops back into it', () => {
    const state = threeCardSpread();

    // What drag activation does: detach, no normalize (transient frames).
    detachPileToRoot(state, 'h2');

    // The gap is real: slots derive from the un-relaid positions.
    expect(spreadSlots(state, templates, state.zones.hand as SpreadZone)).toEqual([12, 186, 313]);

    // Dropping into the visible gap inserts exactly there.
    movePileTo(state, 'h2', 1150, MID_Y);
    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'h2' }, { x: 1150, y: MID_Y });
    expect(plan).toMatchObject({ kind: 'place-pile', pileId: 'h2', zoneId: 'hand', index: 1 });

    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });
    expect(order(state)).toEqual([['c1'], ['c2'], ['c3']]);
  });
});

describe('insertion hint — the indicator’s data, derived from the resolver', () => {
  it('matches the resolved plan: an index in the bands, null on a merge or off-spread', () => {
    const state = withLooseCard(threeCardSpread());
    const payload = { kind: 'pile', pileId: 'loose' } as const;

    // In the seam band: hint present, at the plan's slot.
    expect(spreadInsertHint(state, templates, payload, { x: 1090, y: MID_Y })).toEqual({
      zoneId: 'hand',
      index: 1
    });
    // Over a card's face the drop merges — no indicator.
    expect(spreadInsertHint(state, templates, payload, { x: 1050, y: MID_Y })).toBeNull();
    // Over the open table — no indicator.
    expect(spreadInsertHint(state, templates, payload, { x: 100, y: 100 })).toBeNull();
  });

  it('the hint index is exactly where the card lands after commit', () => {
    for (const [x, expectedIndex] of [
      [1025, 0],
      [1105, 1],
      [1190, 2],
      [1400, 3]
    ] as const) {
      const state = withLooseCard(threeCardSpread());
      const world = { x, y: MID_Y };
      movePileTo(state, 'loose', x, MID_Y);

      const hint = spreadInsertHint(state, templates, { kind: 'pile', pileId: 'loose' }, world);
      expect(hint).toEqual({ zoneId: 'hand', index: expectedIndex });

      applyDropPlan(
        state,
        templates,
        resolveDrop(state, templates, { kind: 'pile', pileId: 'loose' }, world)
      );
      normalize(state, templates, { dev: true });
      expect((state.zones.hand as SpreadZone).pileIds[expectedIndex]).toBe('loose');
    }
  });

  it('a sidebar deck drop hints and splays at the pointer-derived slot', () => {
    const deck = cardTemplate({ id: 'tpl-deck', instances: [null, null] });
    const tpls = makeTemplates(cardTemplate(), deck);
    const state = threeCardSpread();
    const payload = { kind: 'template', templateId: 'tpl-deck' } as const;
    const world = { x: 1105, y: MID_Y };

    expect(spreadInsertHint(state, tpls, payload, world)).toEqual({ zoneId: 'hand', index: 1 });

    const plan = resolveDrop(state, tpls, payload, world);
    expect(plan).toMatchObject({ kind: 'spawn-pile', zoneId: 'hand', index: 1 });
    applyDropPlan(state, tpls, plan);
    normalize(state, tpls, { dev: true });

    // Both spawned cards sit between h1 and h2, in deck order.
    const zone = state.zones.hand as SpreadZone;
    expect(zone.pileIds).toHaveLength(5);
    expect(zone.pileIds[0]).toBe('h1');
    expect(zone.pileIds[3]).toBe('h2');
    expect(zone.pileIds[4]).toBe('h3');
  });

  it('multi-pile payloads produce no hint (each pile derives its own slot)', () => {
    const state = threeCardSpread();
    const extra = singleCardPile('m1', 'c4', 1090, MID_Y);
    state.piles.m1 = extra.pile;
    state.cards.c4 = extra.cards[0];
    state.rootPileIds.push('m1');

    expect(
      spreadInsertHint(state, templates, { kind: 'piles', pileIds: ['m1'] }, { x: 1090, y: MID_Y })
    ).toBeNull();
  });
});

describe('drop-target hover region', () => {
  it('names the zone under the point, the root elsewhere, and skips locked zones', () => {
    const state = threeCardSpread();
    expect(dropTargetZoneAt(state, { x: 1100, y: 1100 })).toBe('hand');
    expect(dropTargetZoneAt(state, { x: 100, y: 100 })).toBeNull();

    state.zones.hand.locked = true;
    expect(dropTargetZoneAt(state, { x: 1100, y: 1100 })).toBeNull();
  });
});
