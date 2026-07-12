// Ticket 12 — zone type conversion: converting a populated zone between all
// four types in place, keeping id/name/position/contents. Scenario-shaped at
// the pure seam: state + target type in → state out, with normalize run
// exactly as the store runs it (so each case doubles as an invariant test).

import { describe, it, expect } from 'vitest';
import { normalize } from './normalize';
import {
  convertZone,
  createFreeformZone,
  createSpreadZone,
  DEFAULT_GRID_CELL_HEIGHT,
  DEFAULT_GRID_CELL_WIDTH,
  DEFAULT_GRID_COLUMNS,
  DEFAULT_SPREAD_OVERLAP,
  SPREAD_PADDING,
  setGridCellHeight,
  setGridCellWidth,
  setGridColumns
} from './zones';
import { zoneWorldOrigin } from './geometry';
import { emptyTabletopState } from './initialization';
import type { GridZone, SpreadZone, TabletopState, Zone, ZoneType } from './types';
import {
  cardTemplate,
  makeCard,
  makePile,
  makeTemplates,
  singleCardPile,
  stateWithPiles,
  withZone
} from './fixtures';

const templates = makeTemplates(cardTemplate());

// Card display size at 2px/mm: 127×177.8.
const CARD_W = 127;

/** Run normalize the way the store does after a committed mutation (dev). */
function settle(state: TabletopState): void {
  normalize(state, templates, { dev: true });
}

/** A multi-card pile (a deck) and its cards, ready for stateWithPiles/withZone. */
function deckPile(pileId: string, cardIds: string[], x = 0, y = 0) {
  return {
    pile: makePile({ id: pileId, cardIds, x, y }),
    cards: cardIds.map((id) => makeCard({ id }))
  };
}

describe('convertZone — invariants: same/missing zone', () => {
  it('is a no-op when the zone is already the target type', () => {
    const state = emptyTabletopState();
    const id = createSpreadZone(state, 0, 0);
    const before = structuredClone(state.zones[id]);
    convertZone(state, templates, id, 'spread');
    expect(state.zones[id]).toEqual(before);
  });

  it('is a no-op for a missing zone', () => {
    const state = emptyTabletopState();
    expect(() => convertZone(state, templates, 'nope', 'grid')).not.toThrow();
    expect(state.zones.nope).toBeUndefined();
  });
});

describe('convertZone — settings cache round-trips', () => {
  it('restores spread and grid settings across a spread → grid → group → spread cycle', () => {
    // A spread with non-default settings.
    const state = withZone(stateWithPiles(), {
      id: 'z',
      type: 'spread',
      direction: 'column',
      overlap: 25,
      x: 100,
      y: 100
    });

    convertZone(state, templates, 'z', 'grid');
    settle(state);
    // Grid takes defaults the first time it is seen…
    expect(state.zones.z).toMatchObject({
      type: 'grid',
      cellWidth: DEFAULT_GRID_CELL_WIDTH,
      cellHeight: DEFAULT_GRID_CELL_HEIGHT,
      columns: DEFAULT_GRID_COLUMNS
    });
    // …then the user configures it.
    setGridCellWidth(state, 'z', 120);
    setGridCellHeight(state, 'z', 140);
    setGridColumns(state, 'z', 5);

    convertZone(state, templates, 'z', 'group');
    settle(state);
    expect(state.zones.z.type).toBe('group');

    convertZone(state, templates, 'z', 'spread');
    settle(state);
    // Spread settings are exactly what they were configured to.
    expect(state.zones.z).toMatchObject({ type: 'spread', direction: 'column', overlap: 25 });

    convertZone(state, templates, 'z', 'grid');
    settle(state);
    // Grid settings survived the round-trip too.
    expect(state.zones.z).toMatchObject({
      type: 'grid',
      cellWidth: 120,
      cellHeight: 140,
      columns: 5
    });
  });

  it('applies type defaults the first time a type is seen', () => {
    const state = withZone(stateWithPiles(), { id: 'z', type: 'freeform', x: 0, y: 0 });
    convertZone(state, templates, 'z', 'spread');
    settle(state);
    expect(state.zones.z).toMatchObject({
      type: 'spread',
      direction: 'row',
      overlap: DEFAULT_SPREAD_OVERLAP
    });
  });
});

describe('convertZone — spread ⇄ freeform', () => {
  it('spread → freeform freezes every card exactly where it lies', () => {
    const state = withZone(
      stateWithPiles(
        singleCardPile('p1', 'c1'),
        singleCardPile('p2', 'c2'),
        singleCardPile('p3', 'c3')
      ),
      { id: 'z', type: 'spread', direction: 'row', overlap: DEFAULT_SPREAD_OVERLAP, x: 500, y: 500 },
      ['p1', 'p2', 'p3']
    );
    settle(state); // lay the spread out
    const frozen = ['p1', 'p2', 'p3'].map((id) => ({ ...state.piles[id] }));

    convertZone(state, templates, 'z', 'freeform');
    settle(state);

    expect(state.zones.z.type).toBe('freeform');
    for (const before of frozen) {
      expect(state.piles[before.id].x).toBe(before.x);
      expect(state.piles[before.id].y).toBe(before.y);
    }
  });

  it('freeform → spread orders the piles and lays them out', () => {
    // Three single-card piles at scattered positions, in this order.
    const state = withZone(
      stateWithPiles(
        singleCardPile('a', 'ca', 300, 40),
        singleCardPile('b', 'cb', 10, 200),
        singleCardPile('c', 'cc', 150, 90)
      ),
      { id: 'z', type: 'freeform', x: 0, y: 0, width: 600, height: 220 },
      ['a', 'b', 'c']
    );

    convertZone(state, templates, 'z', 'spread');
    settle(state);

    const zone = state.zones.z as SpreadZone;
    expect(zone.pileIds).toEqual(['a', 'b', 'c']); // order preserved
    // A row spread advances along x; first pile centred SPREAD_PADDING in.
    const xs = zone.pileIds.map((id) => state.piles[id].x);
    expect(xs[0]).toBeCloseTo(SPREAD_PADDING + CARD_W / 2);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    // All centred on the cross axis.
    for (const id of zone.pileIds) expect(state.piles[id].y).toBeCloseTo(zone.height / 2);
  });
});

describe('convertZone — decks into layout zones', () => {
  it('into a spread splays a deck into ordered single-card piles', () => {
    const state = withZone(stateWithPiles(deckPile('deck', ['c1', 'c2', 'c3'])), {
      id: 'z',
      type: 'freeform',
      x: 0,
      y: 0,
      width: 600,
      height: 220
    });
    // Adopt the deck into the freeform zone.
    state.zones.z.pileIds = ['deck'];
    state.piles.deck.zoneId = 'z';
    state.rootPileIds = [];

    convertZone(state, templates, 'z', 'spread');
    settle(state);

    const zone = state.zones.z as SpreadZone;
    expect(zone.pileIds.length).toBe(3);
    // Bottom card first, top card last (physical layering under overlap).
    const cardOrder = zone.pileIds.map((id) => {
      const pile = state.piles[id];
      expect(pile.cardIds.length).toBe(1);
      return pile.cardIds[0];
    });
    expect(cardOrder).toEqual(['c1', 'c2', 'c3']);
    expect(state.piles.deck).toBeUndefined(); // the multi-card pile is gone
  });

  it('into a grid seats a deck on a single cell as one pile', () => {
    const state = withZone(stateWithPiles(deckPile('deck', ['c1', 'c2', 'c3'], 210, 260)), {
      id: 'z',
      type: 'freeform',
      x: 0,
      y: 0,
      width: 600,
      height: 600
    });
    state.zones.z.pileIds = ['deck'];
    state.piles.deck.zoneId = 'z';
    state.piles.deck.x = 210;
    state.piles.deck.y = 260;
    state.rootPileIds = [];

    convertZone(state, templates, 'z', 'grid');
    settle(state);

    const zone = state.zones.z as GridZone;
    expect(zone.pileIds).toEqual(['deck']); // still one pile — grids don't splay
    expect(state.piles.deck.cardIds).toEqual(['c1', 'c2', 'c3']);
    // Seated on a cell centre: (n + 0.5) * cellSize on each axis.
    const onCell = (coord: number, size: number) => (coord - size / 2) % size;
    expect(onCell(state.piles.deck.x, zone.cellWidth)).toBeCloseTo(0);
    expect(onCell(state.piles.deck.y, zone.cellHeight)).toBeCloseTo(0);
  });
});

describe('convertZone — leaving a group', () => {
  it('snaps each card rotation to the nearest 90° (the onLeave rule)', () => {
    const state = withZone(
      stateWithPiles({
        pile: makePile({ id: 'p', cardIds: ['c1', 'c2'], x: 50, y: 50 }),
        cards: [makeCard({ id: 'c1', rotation: 12 }), makeCard({ id: 'c2', rotation: 100 })]
      }),
      { id: 'z', type: 'group', x: 0, y: 0 },
      ['p']
    );

    convertZone(state, templates, 'z', 'freeform');
    settle(state);

    expect(state.zones.z.type).toBe('freeform');
    expect(state.cards.c1.rotation).toBe(0); // 12 → 0
    expect(state.cards.c2.rotation).toBe(90); // 100 → 90
  });
});

describe('convertZone — preserves identity and structure', () => {
  it('keeps id, name, position, size, lock and contents', () => {
    const state = withZone(
      stateWithPiles(singleCardPile('p1', 'c1')),
      {
        id: 'z',
        name: 'My Hand',
        type: 'spread',
        direction: 'row',
        overlap: DEFAULT_SPREAD_OVERLAP,
        x: 320,
        y: 240,
        width: 640,
        height: 260,
        locked: true
      },
      ['p1']
    );

    convertZone(state, templates, 'z', 'group');
    settle(state);

    expect(state.zones.z).toMatchObject({
      id: 'z',
      name: 'My Hand',
      type: 'group',
      x: 320,
      y: 240,
      width: 640,
      height: 260,
      locked: true,
      pileIds: ['p1']
    });
  });

  it('un-nests child zones to the root when converting a freeform parent away', () => {
    // A freeform parent at world (200, 200) with a child nested at parent-local
    // (50, 50) — so the child's world origin is (250, 250).
    const state = emptyTabletopState();
    const parentId = createFreeformZone(state, 200, 200, 400, 400, 'Board');
    state.zones[parentId] = { ...state.zones[parentId], childZoneIds: [] } as Zone;
    const childId = createFreeformZone(state, 0, 0, 100, 100, 'Cell');
    // Nest the child (createFreeformZone put it in zoneOrder; move it under the
    // parent at parent-local (50, 50)).
    const childZone = state.zones[childId] as Zone;
    childZone.parentZoneId = parentId;
    childZone.x = 50;
    childZone.y = 50;
    state.zoneOrder = state.zoneOrder.filter((id) => id !== childId);
    (state.zones[parentId] as { childZoneIds: string[] }).childZoneIds = [childId];
    const childWorldBefore = zoneWorldOrigin(state, state.zones[childId]);

    convertZone(state, templates, parentId, 'grid');
    settle(state);

    expect(state.zones[parentId].type).toBe('grid');
    // Child is now a top-level zone, visually stationary.
    expect(state.zones[childId].parentZoneId).toBeUndefined();
    expect(state.zoneOrder).toContain(childId);
    const childWorldAfter = zoneWorldOrigin(state, state.zones[childId]);
    expect(childWorldAfter.x).toBeCloseTo(childWorldBefore.x);
    expect(childWorldAfter.y).toBeCloseTo(childWorldBefore.y);
  });
});

describe('convertZone — every source/target pair settles cleanly', () => {
  const TYPES: ZoneType[] = ['freeform', 'grid', 'spread', 'group'];

  /**
   * A populated zone of `type` holding two single cards and a small deck.
   * Built as a freeform zone (so every type-specific field is defaulted
   * through convertZone) then converted to the source type — the same path a
   * real zone reaches these types by.
   */
  function populated(type: ZoneType): TabletopState {
    const state = withZone(
      stateWithPiles(
        singleCardPile('p1', 'c1', 40, 40),
        singleCardPile('p2', 'c2', 220, 60),
        deckPile('deck', ['d1', 'd2'], 120, 240)
      ),
      { id: 'z', type: 'freeform', x: 0, y: 0, width: 600, height: 600 },
      ['p1', 'p2', 'deck']
    );
    settle(state);
    if (type !== 'freeform') {
      convertZone(state, templates, 'z', type);
      settle(state);
    }
    return state;
  }

  for (const from of TYPES) {
    for (const to of TYPES) {
      if (from === to) continue;
      it(`${from} → ${to} yields a valid, dev-normalizable state`, () => {
        const state = populated(from);
        convertZone(state, templates, 'z', to);
        // Dev normalize throws on any invariant violation — the assertion.
        expect(() => settle(state)).not.toThrow();
        expect(state.zones.z.type).toBe(to);
        // Every card is still on the table (none lost in conversion).
        expect(Object.keys(state.cards).sort()).toEqual(['c1', 'c2', 'd1', 'd2']);
      });
    }
  }
});
