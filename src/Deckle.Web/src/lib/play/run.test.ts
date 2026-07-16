import { describe, it, expect } from 'vitest';
import type { GameComponent } from '$lib/types';
import { emptyTabletopState } from '$lib/tabletop';
import type { TabletopState } from '$lib/tabletop';
import { buildProjectContext, chooseSeed, generateSeed, tableHasContent } from './run';

describe('buildProjectContext', () => {
  it('flattens components to id/name/type refs', () => {
    const components = [
      { id: 'c1', name: 'Cards', type: 'Card' },
      { id: 'd1', name: 'Dice', type: 'Dice' }
    ] as GameComponent[];
    expect(buildProjectContext(components)).toEqual({
      components: [
        { id: 'c1', name: 'Cards', type: 'Card' },
        { id: 'd1', name: 'Dice', type: 'Dice' }
      ]
    });
  });
});

describe('tableHasContent', () => {
  it('is false for an empty table', () => {
    expect(tableHasContent(emptyTabletopState())).toBe(false);
  });

  it('is true when a pile exists', () => {
    const state: TabletopState = emptyTabletopState();
    state.piles['p1'] = { id: 'p1', zoneId: null, x: 0, y: 0, locked: false, cardIds: ['c1'] };
    expect(tableHasContent(state)).toBe(true);
  });

  it('is true when a zone exists', () => {
    const state: TabletopState = emptyTabletopState();
    state.zones['z1'] = {
      id: 'z1',
      name: 'Zone',
      type: 'freeform',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      pileIds: [],
      locked: false
    };
    expect(tableHasContent(state)).toBe(true);
  });
});

describe('generateSeed', () => {
  it('derives a non-negative 31-bit integer from the rng', () => {
    expect(generateSeed(() => 0)).toBe(0);
    expect(generateSeed(() => 0.5)).toBe(Math.floor(0.5 * 0x7fffffff));
    const seed = generateSeed(() => 0.999999);
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(0x7fffffff);
  });

  it('varies with the rng (new seed by default on re-run)', () => {
    expect(generateSeed(() => 0.1)).not.toBe(generateSeed(() => 0.2));
  });
});

describe('chooseSeed', () => {
  it("'new' mints a fresh seed, ignoring any last seed", () => {
    expect(chooseSeed('new', 42, () => 0)).toBe(0);
    expect(chooseSeed('new', 42, () => 0.5)).toBe(Math.floor(0.5 * 0x7fffffff));
  });

  it("'same' reuses the last seed (replay same deal)", () => {
    expect(chooseSeed('same', 42, () => 0.9)).toBe(42);
    expect(chooseSeed('same', 0, () => 0.9)).toBe(0);
  });

  it("'same' falls back to a fresh seed when there is no last seed", () => {
    expect(chooseSeed('same', null, () => 0)).toBe(0);
    expect(chooseSeed('same', null, () => 0.5)).toBe(Math.floor(0.5 * 0x7fffffff));
  });
});
