// Ticket 09 — grid zones as sparse boards: cell snap math, the nearest-free-
// cell search, the occupancy-preserving shuffle, and the grid invariant in
// normalize. Scenario-shaped: state in → state/plan out, at the pure seam.

import { describe, it, expect } from 'vitest';
import { applyDropPlan, resolveDrop } from './drop';
import { normalize } from './normalize';
import {
  DEFAULT_GRID_CELL_HEIGHT,
  DEFAULT_GRID_CELL_WIDTH,
  DEFAULT_GRID_COLUMNS,
  createGridZone,
  gridCellAt,
  gridCellCenter,
  gridRows,
  nearestFreeGridCell,
  occupiedGridCells,
  setGridCellWidth,
  setGridColumns,
  shuffleZoneContents,
  zoneActions,
  zoneBehavior
} from './zones';
import { emptyTabletopState } from './initialization';
import type { GridZone, TabletopState } from './types';
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

const templates = makeTemplates(
  cardTemplate(),
  diceTemplate(),
  // A token: non-mergeable and non-flippable, like a die but a distinct id.
  cardTemplate({ id: 'tpl-token', name: 'Token', mergeable: false, flippable: false })
);

/**
 * A 3×3 grid board at world (1000, 1000): 100px cells, 3 columns, 300px tall.
 * Cell (col, row) centre is world (1000 + (col+0.5)*100, 1000 + (row+0.5)*100).
 */
function addGrid(
  state: TabletopState,
  pileIds: string[] = [],
  overrides: Partial<GridZone> = {}
): TabletopState {
  return withZone(
    state,
    {
      id: 'board',
      type: 'grid',
      cellWidth: 100,
      cellHeight: 100,
      columns: 3,
      x: 1000,
      y: 1000,
      width: 300,
      height: 300,
      ...overrides
    },
    pileIds
  );
}

function board(state: TabletopState): GridZone {
  return state.zones.board as GridZone;
}

/** Zone-local cell centre → world point. */
function cellWorld(col: number, row: number): { x: number; y: number } {
  return { x: 1000 + (col + 0.5) * 100, y: 1000 + (row + 0.5) * 100 };
}

describe('grid creation', () => {
  it('creates a shuffleable, unordered board with cell defaults', () => {
    const state = emptyTabletopState();
    const id = createGridZone(state, 100, 50);
    normalize(state, templates, { dev: true });

    expect(state.zones[id]).toMatchObject({
      type: 'grid',
      cellWidth: DEFAULT_GRID_CELL_WIDTH,
      cellHeight: DEFAULT_GRID_CELL_HEIGHT,
      columns: DEFAULT_GRID_COLUMNS,
      pileIds: [],
      locked: false
    });
    expect(state.zoneOrder).toEqual([id]);
    expect(zoneBehavior(state.zones[id]).ordered).toBe(false);
    expect(zoneBehavior(state.zones[id]).shuffleable).toBe(true);
  });
});

describe('cell math', () => {
  it('maps a local point to the cell it falls in, clamped to the grid', () => {
    const zone = board(addGrid(emptyTabletopState()));
    expect(gridRows(zone)).toBe(3);

    expect(gridCellAt(zone, { x: 10, y: 10 })).toEqual({ col: 0, row: 0 });
    expect(gridCellAt(zone, { x: 140, y: 160 })).toEqual({ col: 1, row: 1 });
    expect(gridCellAt(zone, { x: 299, y: 299 })).toEqual({ col: 2, row: 2 });
    // Out of bounds clamps to the edge cells.
    expect(gridCellAt(zone, { x: -50, y: -50 })).toEqual({ col: 0, row: 0 });
    expect(gridCellAt(zone, { x: 9999, y: 9999 })).toEqual({ col: 2, row: 2 });
  });

  it('a cell centre round-trips back to its own cell (snap is idempotent)', () => {
    const zone = board(addGrid(emptyTabletopState()));
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        expect(gridCellAt(zone, gridCellCenter(zone, col, row))).toEqual({ col, row });
      }
    }
  });

  it('finds the nearest free cell, deterministic on ties (topmost-leftmost)', () => {
    const zone = board(addGrid(emptyTabletopState()));
    // (1,1) taken; the four orthogonal neighbours tie — row-major wins (1,0).
    expect(nearestFreeGridCell(zone, { col: 1, row: 1 }, new Set(['1,1']))).toEqual({
      col: 1,
      row: 0
    });
    // With the whole grid full there is nowhere free.
    const full = new Set<string>();
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) full.add(`${c},${r}`);
    expect(nearestFreeGridCell(zone, { col: 0, row: 0 }, full)).toBeNull();
  });
});

describe('snap-to-cell on drop and through unrelated operations', () => {
  it('a pile dropped over the grid snaps to the cell under the point', () => {
    const state = addGrid(
      stateWithPiles(singleCardPile('loose', 'c1', 1140, 1160)) // near cell (1,1)
    );

    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'loose' }, { x: 1140, y: 1160 });
    expect(plan).toMatchObject({ kind: 'place-pile', zoneId: 'board' });
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    // Stored zone-local at the cell (1,1) centre.
    expect(board(state).pileIds).toEqual(['loose']);
    expect(state.piles.loose).toMatchObject({ zoneId: 'board', x: 150, y: 150 });
  });

  it('keeps a pile on its cell through an unrelated commit (idempotent snap)', () => {
    const state = addGrid(
      stateWithPiles(singleCardPile('a', 'c1', 1050, 1050), singleCardPile('b', 'c2', 1250, 1250)),
      ['a', 'b']
    );
    normalize(state, templates, { dev: true });
    expect(state.piles.a).toMatchObject({ x: 50, y: 50 });
    expect(state.piles.b).toMatchObject({ x: 250, y: 250 });

    // An unrelated operation elsewhere + normalize must not move grid piles.
    const before = structuredClone(state.piles);
    normalize(state, templates, { dev: true });
    expect(state.piles).toEqual(before);
  });
});

describe('occupied-cell collisions', () => {
  it('dropping onto an occupied cell’s pile merges (universal rule)', () => {
    const state = addGrid(stateWithPiles(singleCardPile('seat', 'c1', 1150, 1150)), ['seat']);
    normalize(state, templates, { dev: true });
    // A loose card dropped onto the seated card's face.
    state.piles.loose = makePile({ id: 'loose', cardIds: ['c2'], x: 1150, y: 1150 });
    state.cards.c2 = makeCard({ id: 'c2' });
    state.rootPileIds.push('loose');

    const world = cellWorld(1, 1);
    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'loose' }, world);
    expect(plan).toMatchObject({ kind: 'merge-piles', targetPileId: 'seat' });
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    expect(state.piles.loose).toBeUndefined();
    expect(state.piles.seat.cardIds).toEqual(['c1', 'c2']);
  });

  it('a non-mergeable pile dropped near an occupied cell lands on the nearest free cell', () => {
    const state = addGrid(stateWithPiles(singleCardPile('seat', 'c1', 1150, 1150)), ['seat']);
    normalize(state, templates, { dev: true });
    // A die (non-mergeable) aimed at the occupied centre cell (1,1).
    state.piles.die = makePile({ id: 'die', cardIds: ['d1'], x: 1150, y: 1150 });
    state.cards.d1 = makeCard({ id: 'd1', templateId: 'tpl-dice' });
    state.rootPileIds.push('die');

    const world = cellWorld(1, 1);
    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'die' }, world);
    // No merge (die isn't mergeable) → snapped to the nearest free cell (1,0).
    expect(plan).toMatchObject({ kind: 'place-pile', zoneId: 'board' });
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    expect(state.piles.seat).toMatchObject({ x: 150, y: 150 });
    expect(state.piles.die).toMatchObject({ zoneId: 'board', x: 150, y: 50 });
  });
});

describe('grid invariant — piles sit on distinct cells', () => {
  it('spreads two piles that arrive on the same cell to distinct cells', () => {
    // What a multi-drop produces: both planned against the same occupancy, so
    // both land on cell (0,0). Normalize keeps the first, moves the second.
    const state = addGrid(
      stateWithPiles(singleCardPile('p1', 'c1', 1050, 1050), singleCardPile('p2', 'c2', 1050, 1050)),
      ['p1', 'p2']
    );

    expect(() => normalize(state, templates, { dev: true })).not.toThrow();

    expect(state.piles.p1).toMatchObject({ x: 50, y: 50 }); // cell (0,0)
    expect(state.piles.p2).toMatchObject({ x: 150, y: 50 }); // nearest free (1,0)
  });

  it('a pile listed in the grid whose zoneId points elsewhere: throws in dev, is adopted in prod', () => {
    const build = (): TabletopState => {
      const state = addGrid(stateWithPiles(singleCardPile('p1', 'c1', 1050, 1050)), ['p1']);
      // A structural bug placePile never produces: the pile is listed in the
      // grid but still claims the root table.
      state.piles.p1.zoneId = null;
      return state;
    };

    expect(() => normalize(build(), templates, { dev: true })).toThrow(/invariant violation/);

    const state = build();
    normalize(state, templates, { dev: false });
    expect(state.piles.p1.zoneId).toBe('board');
    expect(() => normalize(state, templates, { dev: true })).not.toThrow();
  });

  it('a deck, a die, and a token all sit on cells at once', () => {
    const deck = makePile({ id: 'deck', cardIds: ['k1', 'k2', 'k3'], x: 1050, y: 1050 });
    const state = stateWithPiles({
      pile: deck,
      cards: [makeCard({ id: 'k1' }), makeCard({ id: 'k2' }), makeCard({ id: 'k3' })]
    });
    state.piles.die = makePile({ id: 'die', cardIds: ['d1'], x: 1150, y: 1050 });
    state.cards.d1 = makeCard({ id: 'd1', templateId: 'tpl-dice' });
    state.rootPileIds.push('die');
    state.piles.token = makePile({ id: 'token', cardIds: ['t1'], x: 1250, y: 1050 });
    state.cards.t1 = makeCard({ id: 't1', templateId: 'tpl-token' });
    state.rootPileIds.push('token');
    addGrid(state, ['deck', 'die', 'token']);

    normalize(state, templates, { dev: true });

    const cells = ['deck', 'die', 'token'].map((id) =>
      gridCellAt(board(state), { x: state.piles[id].x, y: state.piles[id].y })
    );
    // Three residents, three distinct cells.
    expect(new Set(cells.map((c) => `${c.col},${c.row}`)).size).toBe(3);
    expect(occupiedGridCells(state, board(state)).size).toBe(3);
  });
});

describe('occupancy-preserving shuffle', () => {
  it('permutes which piles sit on the occupied cells; the cell set is preserved', () => {
    const state = addGrid(
      stateWithPiles(singleCardPile('p1', 'c1', 1050, 1050), singleCardPile('p2', 'c2', 1250, 1250)),
      ['p1', 'p2']
    );
    normalize(state, templates, { dev: true });
    const occupiedBefore = occupiedGridCells(state, board(state));

    // random()=0 swaps the two piles across their cells (Fisher–Yates on 2).
    shuffleZoneContents(state, templates, 'board', () => 0);

    // Same set of occupied cells, but the piles have traded places.
    expect(occupiedGridCells(state, board(state))).toEqual(occupiedBefore);
    expect(state.piles.p1).toMatchObject({ x: 250, y: 250 }); // was (0,0), now (2,2)
    expect(state.piles.p2).toMatchObject({ x: 50, y: 50 }); // was (2,2), now (0,0)
  });

  it('a single occupant is left where it is', () => {
    const state = addGrid(stateWithPiles(singleCardPile('solo', 'c1', 1150, 1150)), ['solo']);
    normalize(state, templates, { dev: true });
    const before = structuredClone(state.piles.solo);

    shuffleZoneContents(state, templates, 'board', () => 0);

    expect(state.piles.solo).toEqual(before);
  });

  it('a populated grid offers shuffle among its zone actions', () => {
    const state = addGrid(
      stateWithPiles(singleCardPile('p1', 'c1', 1050, 1050), singleCardPile('p2', 'c2', 1250, 1250)),
      ['p1', 'p2']
    );
    normalize(state, templates, { dev: true });
    expect(zoneActions(state, templates, 'board')).toContain('shuffle');
  });
});

describe('cell setting changes re-snap contents', () => {
  it('widening cells re-seats piles on the new cell centres immediately', () => {
    const state = addGrid(
      stateWithPiles(singleCardPile('p1', 'c1', 1050, 1050), singleCardPile('p2', 'c2', 1250, 1050)),
      ['p1', 'p2']
    );
    normalize(state, templates, { dev: true });
    expect(state.piles.p1).toMatchObject({ x: 50, y: 50 }); // cell (0,0)
    expect(state.piles.p2).toMatchObject({ x: 250, y: 50 }); // cell (2,0)

    // Cells doubled in width: occupancy re-derives from the piles' pixel
    // positions (no stored indices) and they re-centre on their new cells.
    setGridCellWidth(state, 'board', 200);
    expect(state.piles.p1).toMatchObject({ x: 100, y: 50 }); // 50px → col 0, centre 100
    expect(state.piles.p2).toMatchObject({ x: 300, y: 50 }); // 250px → col 1, centre 300
  });

  it('shrinking the column count keeps every pile on a valid cell', () => {
    const state = addGrid(
      stateWithPiles(
        singleCardPile('p1', 'c1', 1050, 1050),
        singleCardPile('p2', 'c2', 1150, 1050),
        singleCardPile('p3', 'c3', 1250, 1050)
      ),
      ['p1', 'p2', 'p3']
    );
    normalize(state, templates, { dev: true });

    // One column: the row-0 residents can't all fit, so they spill down rows.
    setGridColumns(state, 'board', 1);

    const zone = board(state);
    const cells = ['p1', 'p2', 'p3'].map((id) =>
      gridCellAt(zone, { x: state.piles[id].x, y: state.piles[id].y })
    );
    expect(cells.every((c) => c.col === 0)).toBe(true);
    expect(new Set(cells.map((c) => `${c.col},${c.row}`)).size).toBe(3);
  });
});
