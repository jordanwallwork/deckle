import { describe, it, expect } from 'vitest';
import { emptyTabletopState } from './initialization';
import { normalize } from './normalize';
import {
  clearSelection,
  isPileSelected,
  movePileTo,
  normalizeDegrees,
  raisePile,
  setSelection,
  spawnPileFromTemplate
} from './operations';
import { cardTemplate, makeTemplates, singleCardPile, stateWithPiles } from './fixtures';
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
