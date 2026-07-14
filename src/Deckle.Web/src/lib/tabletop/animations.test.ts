import { describe, it, expect } from 'vitest';
import {
  applyPendingShuffle,
  pendingShuffleDuration,
  pendingShuffleFor,
  pickShuffleAnimationCards,
  planShuffle,
  planZoneFlip,
  requestShuffle,
  SHUFFLE_ANIMATION_CARDS,
  shuffleAnimationDuration,
  zoneFlipDuration,
  type PendingShuffle
} from './animations';
import { normalize } from './normalize';
import {
  cardTemplate,
  diceTemplate,
  makeCard,
  makePile,
  makeTemplates,
  stateWithPiles,
  withZone
} from './fixtures';

const templates = makeTemplates(cardTemplate(), diceTemplate());

/** A pile of `n` cards named c1..cn, bottom → top. */
function pile(id: string, cardIds: string[]) {
  return {
    pile: makePile({ id, cardIds: [...cardIds] }),
    cards: cardIds.map((cid) => makeCard({ id: cid }))
  };
}

/** A deterministic rng cycling through the given values. */
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

// ─── pickShuffleAnimationCards (the sampling) ──────────────────────────────────

describe('pickShuffleAnimationCards', () => {
  it('always includes the old top and the new top', () => {
    const newOrder = ['c2', 'c3', 'c4', 'c1']; // new top = c1
    const picked = pickShuffleAnimationCards(newOrder, 'c3', SHUFFLE_ANIMATION_CARDS, () => 0);
    expect(picked).toContain('c1'); // new top
    expect(picked).toContain('c3'); // old top
  });

  it('paints the old top last and the new top first', () => {
    const newOrder = ['b', 'c', 'a']; // new top = a
    const picked = pickShuffleAnimationCards(newOrder, 'b', 5, () => 0);
    expect(picked[0]).toBe('a'); // new top painted first
    expect(picked[picked.length - 1]).toBe('b'); // old top painted last
  });

  it('caps the sample at maxCards while keeping both required tops', () => {
    const newOrder = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']; // new top = c8
    const picked = pickShuffleAnimationCards(newOrder, 'c1', 4, () => 0);
    expect(picked.length).toBe(4);
    expect(picked).toContain('c8');
    expect(picked).toContain('c1');
    expect(new Set(picked).size).toBe(picked.length); // no duplicates
  });

  it('collapses the required set when the old top is also the new top', () => {
    const newOrder = ['c2', 'c3', 'c1'];
    const picked = pickShuffleAnimationCards(newOrder, 'c1', 5, () => 0);
    // c1 is both tops → it appears once, painted first, no trailing old top.
    expect(picked.filter((id) => id === 'c1').length).toBe(1);
    expect(picked[0]).toBe('c1');
  });

  it('never samples more than the pool holds', () => {
    const picked = pickShuffleAnimationCards(['b', 'a'], 'b', 5, () => 0);
    expect(picked.sort()).toEqual(['a', 'b']);
  });
});

// ─── planShuffle (the pre-computation) ─────────────────────────────────────────

describe('planShuffle', () => {
  it('precomputes a permuting order and a sample per multi-card pile', () => {
    const state = stateWithPiles(pile('p', ['c1', 'c2', 'c3']));
    const pending = planShuffle(state, ['p'], () => 0);

    expect(pending).not.toBeNull();
    const plan = pending!.piles[0];
    expect(plan.pileId).toBe('p');
    // Same cards, reordered.
    expect([...plan.newOrder].sort()).toEqual(['c1', 'c2', 'c3']);
    expect(plan.newOrder).not.toEqual(['c1', 'c2', 'c3']);
    // The sample covers the pre-shuffle top and the post-shuffle top.
    const oldTop = 'c3';
    const newTop = plan.newOrder[plan.newOrder.length - 1];
    expect(plan.animatedCardIds).toContain(oldTop);
    expect(plan.animatedCardIds).toContain(newTop);
  });

  it('skips single-card piles and returns null when nothing is shufflable', () => {
    const state = stateWithPiles(pile('lone', ['c1']), pile('deck', ['d1', 'd2']));
    const pending = planShuffle(state, ['lone', 'deck'], () => 0);
    expect(pending!.piles.map((p) => p.pileId)).toEqual(['deck']);

    expect(planShuffle(state, ['lone'], () => 0)).toBeNull();
    expect(planShuffle(state, [], () => 0)).toBeNull();
  });

  it('does not mutate state (the order is deferred, not applied)', () => {
    const state = stateWithPiles(pile('p', ['c1', 'c2', 'c3']));
    planShuffle(state, ['p'], () => 0);
    expect(state.piles.p.cardIds).toEqual(['c1', 'c2', 'c3']);
  });
});

// ─── applyPendingShuffle (finalisation) ────────────────────────────────────────

describe('applyPendingShuffle', () => {
  it('commits the precomputed order, and the result passes normalize', () => {
    const state = stateWithPiles(pile('p', ['c1', 'c2', 'c3']));
    const pending = planShuffle(state, ['p'], () => 0)!;

    applyPendingShuffle(state, pending);

    expect(state.piles.p.cardIds).toEqual(pending.piles[0].newOrder);
    expect(() => normalize(state, templates, { dev: true })).not.toThrow();
  });

  it('no-ops a stale plan whose cards changed under it (never scrambles)', () => {
    const state = stateWithPiles(pile('p', ['c1', 'c2', 'c3']));
    const stale: PendingShuffle = {
      piles: [{ pileId: 'p', newOrder: ['c1', 'c2', 'gone'], animatedCardIds: [] }]
    };
    applyPendingShuffle(state, stale);
    expect(state.piles.p.cardIds).toEqual(['c1', 'c2', 'c3']);
  });

  it('ignores a plan for a pile that no longer exists', () => {
    const state = stateWithPiles(pile('p', ['c1', 'c2']));
    const pending: PendingShuffle = {
      piles: [{ pileId: 'ghost', newOrder: ['x', 'y'], animatedCardIds: [] }]
    };
    expect(() => applyPendingShuffle(state, pending)).not.toThrow();
    expect(state.piles.p.cardIds).toEqual(['c1', 'c2']);
  });
});

// ─── requestShuffle (finalisation on interrupt) ────────────────────────────────

describe('requestShuffle', () => {
  it('renders the request when nothing is pending', () => {
    const requested: PendingShuffle = { piles: [] };
    expect(requestShuffle(null, requested)).toEqual({ finalize: null, next: requested });
  });

  it('keeps the pending untouched when nothing is requested', () => {
    const current: PendingShuffle = { piles: [{ pileId: 'a', newOrder: [], animatedCardIds: [] }] };
    expect(requestShuffle(current, null)).toEqual({ finalize: null, next: current });
  });

  it('finalises the in-flight shuffle before starting one on a different pile', () => {
    const current: PendingShuffle = { piles: [{ pileId: 'a', newOrder: [], animatedCardIds: [] }] };
    const requested: PendingShuffle = {
      piles: [{ pileId: 'b', newOrder: [], animatedCardIds: [] }]
    };
    expect(requestShuffle(current, requested)).toEqual({ finalize: current, next: requested });
  });

  it('ignores a re-triggered shuffle on a pile already animating', () => {
    const current: PendingShuffle = { piles: [{ pileId: 'a', newOrder: [], animatedCardIds: [] }] };
    const requested: PendingShuffle = {
      piles: [{ pileId: 'a', newOrder: [], animatedCardIds: [] }]
    };
    expect(requestShuffle(current, requested)).toEqual({ finalize: null, next: current });
  });

  it('two rapid shuffles on different piles both apply — no order is lost', () => {
    const state = stateWithPiles(pile('A', ['a1', 'a2', 'a3']), pile('B', ['b1', 'b2', 'b3']));

    // Shuffle A: nothing pending, so it just becomes the pending animation.
    const pendingA = planShuffle(state, ['A'], seq([0.9, 0.1, 0.5]))!;
    const d1 = requestShuffle(null, pendingA);
    expect(d1.finalize).toBeNull();

    // Shuffle B before A's fan lands: A must finalise first, then B animates.
    const pendingB = planShuffle(state, ['B'], seq([0.3, 0.7, 0.2]))!;
    const d2 = requestShuffle(d1.next, pendingB);
    expect(d2.finalize).toBe(pendingA);
    expect(d2.next).toBe(pendingB);

    // The interrupt commits A; B's fan later commits B.
    applyPendingShuffle(state, d2.finalize!);
    applyPendingShuffle(state, d2.next!);

    expect(state.piles.A.cardIds).toEqual(pendingA.piles[0].newOrder);
    expect(state.piles.B.cardIds).toEqual(pendingB.piles[0].newOrder);
    // Both remain the same three cards, nothing dropped.
    expect([...state.piles.A.cardIds].sort()).toEqual(['a1', 'a2', 'a3']);
    expect([...state.piles.B.cardIds].sort()).toEqual(['b1', 'b2', 'b3']);
  });
});

describe('pendingShuffleFor / duration helpers', () => {
  it('finds a pile in the batch and reports the batch as its longest fan', () => {
    const state = stateWithPiles(pile('A', ['a1', 'a2']), pile('B', ['b1', 'b2', 'b3', 'b4', 'b5']));
    const pending = planShuffle(state, ['A', 'B'], () => 0)!;

    expect(pendingShuffleFor(pending, 'A')?.pileId).toBe('A');
    expect(pendingShuffleFor(pending, 'missing')).toBeNull();
    expect(pendingShuffleFor(null, 'A')).toBeNull();

    const expected = Math.max(
      shuffleAnimationDuration(pending.piles[0].animatedCardIds.length),
      shuffleAnimationDuration(pending.piles[1].animatedCardIds.length)
    );
    expect(pendingShuffleDuration(pending)).toBe(expected);
  });
});

// ─── planZoneFlip (the wave) ───────────────────────────────────────────────────

describe('planZoneFlip', () => {
  function zoneState(type: 'spread' | 'grid' | 'freeform' | 'group', pileIds: string[]) {
    const piles = pileIds.map((id) => pile(id, [`${id}c`]));
    const state = stateWithPiles(...piles);
    const overrides: Record<string, unknown> = { id: 'z', type };
    if (type === 'spread') Object.assign(overrides, { direction: 'row', overlap: 0 });
    if (type === 'grid') Object.assign(overrides, { cellWidth: 80, cellHeight: 100, columns: 3 });
    return withZone(state, overrides as never, pileIds);
  }

  it('waves a spread with more than one flippable pile', () => {
    const state = zoneState('spread', ['p1', 'p2', 'p3']);
    expect(planZoneFlip(state, templates, 'z')).toEqual({ zoneId: 'z', staggerMs: 30 });
  });

  it('waves a grid with more than one flippable pile', () => {
    const state = zoneState('grid', ['p1', 'p2']);
    expect(planZoneFlip(state, templates, 'z')).not.toBeNull();
  });

  it('does not wave freeform or group zones', () => {
    expect(planZoneFlip(zoneState('freeform', ['p1', 'p2']), templates, 'z')).toBeNull();
    expect(planZoneFlip(zoneState('group', ['p1', 'p2']), templates, 'z')).toBeNull();
  });

  it('does not wave a spread with a single flippable pile', () => {
    expect(planZoneFlip(zoneState('spread', ['p1']), templates, 'z')).toBeNull();
  });

  it('excludes non-flippable piles from the wave threshold', () => {
    // One card pile + one die pile → only one flippable → no wave.
    const state = stateWithPiles(pile('card', ['c']), {
      pile: makePile({ id: 'die', cardIds: ['d'] }),
      cards: [makeCard({ id: 'd', templateId: 'tpl-dice' })]
    });
    withZone(state, { id: 'z', type: 'spread', direction: 'row', overlap: 0 } as never, [
      'card',
      'die'
    ]);
    expect(planZoneFlip(state, templates, 'z')).toBeNull();
  });

  it('excludes locked piles from the wave threshold', () => {
    // Two card piles, but one is locked → only one flippable → no wave.
    const state = stateWithPiles(pile('p1', ['c1']), {
      pile: makePile({ id: 'p2', cardIds: ['c2'], locked: true }),
      cards: [makeCard({ id: 'c2' })]
    });
    withZone(state, { id: 'z', type: 'spread', direction: 'row', overlap: 0 } as never, [
      'p1',
      'p2'
    ]);
    expect(planZoneFlip(state, templates, 'z')).toBeNull();
  });

  it('scales the wave duration with pile count and stagger', () => {
    expect(zoneFlipDuration(1, 30)).toBe(350); // one pile: just the flip
    expect(zoneFlipDuration(4, 30)).toBe(30 * 3 + 350);
  });
});
