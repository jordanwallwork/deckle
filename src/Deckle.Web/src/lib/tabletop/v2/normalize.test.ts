import { describe, it, expect } from 'vitest';
import { normalize } from './normalize';
import { emptyTabletopState } from './initialization';
import type { FreeformZone, TabletopState } from './types';
import { cardTemplate, makeCard, makePile, makeTemplates, singleCardPile, stateWithPiles } from './fixtures';

const templates = makeTemplates(cardTemplate());

function expectThrowsInDevRepairsInProd(
  build: () => TabletopState,
  assertRepaired: (state: TabletopState) => void
): void {
  expect(() => normalize(build(), templates, { dev: true })).toThrow(/invariant violation/);

  const state = build();
  normalize(state, templates, { dev: false });
  assertRepaired(state);
  // A repaired state must itself pass the dev sweep.
  expect(() => normalize(state, templates, { dev: true })).not.toThrow();
}

describe('normalize — referential integrity', () => {
  it('accepts a clean state', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'), singleCardPile('p2', 'c2', 100, 0));
    expect(() => normalize(state, templates, { dev: true })).not.toThrow();
  });

  it('a pile referencing a missing card: throws in dev, drops the reference in prod', () => {
    expectThrowsInDevRepairsInProd(
      () => {
        const state = stateWithPiles(singleCardPile('p1', 'c1'));
        state.piles.p1.cardIds.push('ghost');
        return state;
      },
      (state) => {
        expect(state.piles.p1.cardIds).toEqual(['c1']);
      }
    );
  });

  it('a card in two piles: throws in dev, keeps a single owner in prod', () => {
    expectThrowsInDevRepairsInProd(
      () => {
        const state = stateWithPiles(singleCardPile('p1', 'c1'), singleCardPile('p2', 'c2'));
        state.piles.p2.cardIds.push('c1');
        return state;
      },
      (state) => {
        const owners = Object.values(state.piles).filter((p) => p.cardIds.includes('c1'));
        expect(owners).toHaveLength(1);
      }
    );
  });

  it('an orphaned card: throws in dev, is deleted in prod', () => {
    expectThrowsInDevRepairsInProd(
      () => {
        const state = stateWithPiles(singleCardPile('p1', 'c1'));
        state.cards.orphan = makeCard({ id: 'orphan' });
        return state;
      },
      (state) => {
        expect(state.cards.orphan).toBeUndefined();
        expect(state.cards.c1).toBeDefined();
      }
    );
  });

  it('a pile pointing at a missing zone: throws in dev, adopts onto the root in prod', () => {
    expectThrowsInDevRepairsInProd(
      () => {
        const state = emptyTabletopState();
        state.cards.c1 = makeCard({ id: 'c1' });
        state.piles.p1 = makePile({ id: 'p1', cardIds: ['c1'], zoneId: 'gone' });
        return state;
      },
      (state) => {
        expect(state.piles.p1.zoneId).toBeNull();
        expect(state.rootPileIds).toContain('p1');
      }
    );
  });

  it('a pile missing from its container list: throws in dev, is re-listed in prod', () => {
    expectThrowsInDevRepairsInProd(
      () => {
        const state = stateWithPiles(singleCardPile('p1', 'c1'));
        state.rootPileIds.length = 0;
        return state;
      },
      (state) => {
        expect(state.rootPileIds).toEqual(['p1']);
      }
    );
  });

  it('a dangling id in rootPileIds: throws in dev, is removed in prod', () => {
    expectThrowsInDevRepairsInProd(
      () => {
        const state = stateWithPiles(singleCardPile('p1', 'c1'));
        state.rootPileIds.push('ghost');
        return state;
      },
      (state) => {
        expect(state.rootPileIds).toEqual(['p1']);
      }
    );
  });

  it('a pile listed twice: throws in dev, is deduped in prod', () => {
    expectThrowsInDevRepairsInProd(
      () => {
        const state = stateWithPiles(singleCardPile('p1', 'c1'));
        state.rootPileIds.push('p1');
        return state;
      },
      (state) => {
        expect(state.rootPileIds).toEqual(['p1']);
      }
    );
  });

  it('a zoneOrder entry for a missing zone: throws in dev, is removed in prod', () => {
    expectThrowsInDevRepairsInProd(
      () => {
        const state = emptyTabletopState();
        state.zoneOrder.push('ghost-zone');
        return state;
      },
      (state) => {
        expect(state.zoneOrder).toEqual([]);
      }
    );
  });

  it('a pile listed in a zone it does not belong to: throws in dev, single listing in prod', () => {
    expectThrowsInDevRepairsInProd(
      () => {
        const state = stateWithPiles(singleCardPile('p1', 'c1'));
        const zone: FreeformZone = {
          id: 'z1',
          name: 'Zone',
          type: 'freeform',
          x: 0,
          y: 0,
          width: 200,
          height: 200,
          pileIds: ['p1'],
          locked: false
        };
        state.zones.z1 = zone;
        state.zoneOrder.push('z1');
        return state;
      },
      (state) => {
        const listings =
          state.rootPileIds.filter((id) => id === 'p1').length +
          state.zones.z1.pileIds.filter((id) => id === 'p1').length;
        expect(listings).toBe(1);
      }
    );
  });
});

describe('normalize — ephemeral state pruning', () => {
  it('drops deleted piles from the selection without throwing', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'));
    state.selection = { kind: 'piles', pileIds: ['p1', 'gone'] };

    normalize(state, templates, { dev: true });

    expect(state.selection).toEqual({ kind: 'piles', pileIds: ['p1'] });
  });

  it('clears a selection whose piles are all gone', () => {
    const state = emptyTabletopState();
    state.selection = { kind: 'piles', pileIds: ['gone'] };

    normalize(state, templates, { dev: true });

    expect(state.selection).toEqual({ kind: 'none' });
  });

  it('clears zone selection and editing id for missing zones', () => {
    const state = emptyTabletopState();
    state.selection = { kind: 'zone', zoneId: 'gone' };
    state.editingZoneId = 'gone';

    normalize(state, templates, { dev: true });

    expect(state.selection).toEqual({ kind: 'none' });
    expect(state.editingZoneId).toBeNull();
  });
});
