import { describe, it, expect } from 'vitest';
import type { TabletopState } from '../tabletop/types';
import { planReplay } from './replay';
import type { SetupStep } from './interpreter';

/** A small completed run: two zones, a placed deck, a dealt card. */
function fixtureFinal(): TabletopState {
  return {
    cards: {
      c1: { id: 'c1', templateId: 't', mergeData: null, isFlipped: true, rotation: 0 },
      c2: { id: 'c2', templateId: 't', mergeData: null, isFlipped: true, rotation: 0 },
      c3: { id: 'c3', templateId: 't', mergeData: null, isFlipped: false, rotation: 0 }
    },
    piles: {
      p1: { id: 'p1', zoneId: 'z1', x: 0, y: 0, locked: false, cardIds: ['c1', 'c2'] },
      p2: { id: 'p2', zoneId: 'z2', x: 0, y: 0, locked: false, cardIds: ['c3'] }
    },
    zones: {
      z1: { id: 'z1', name: 'Deck', type: 'freeform', x: 0, y: 0, width: 10, height: 10, pileIds: ['p1'], locked: false },
      z2: { id: 'z2', name: 'Hand', type: 'freeform', x: 0, y: 0, width: 10, height: 10, pileIds: ['p2'], locked: false }
    },
    zoneOrder: ['z1', 'z2'],
    rootPileIds: [],
    selection: { kind: 'none' },
    editingZoneId: null
  };
}

const trace: SetupStep[] = [
  { verb: 'placeSeats', docPath: 'setup[0]', blueprint: 'seat', zoneIds: ['z1'], seatCount: 1 },
  { verb: 'place', docPath: 'setup[1]', component: 'c', zoneIds: ['z1'], pileIds: ['p1'], cardIds: ['c1', 'c2'], facing: 'down' },
  { verb: 'placeZone', docPath: 'setup[2]', blueprint: 'tbl', zoneIds: ['z2'] },
  { verb: 'deal', docPath: 'setup[3]', fromZoneId: 'z1', count: 1, deals: [{ toZoneId: 'z2', cardId: 'c3', pileId: 'p2', facing: 'up' }] },
  // References a pile that no longer exists in the final state — must be skipped.
  { verb: 'deal', docPath: 'setup[4]', fromZoneId: 'z1', count: 1, deals: [{ toZoneId: 'z2', cardId: 'cGhost', pileId: 'pGhost', facing: 'up' }] },
  { verb: 'shuffle', docPath: 'setup[5]', zoneIds: ['z1'], orders: {} }
];

describe('planReplay', () => {
  it('yields no frames for an empty trace', () => {
    expect(planReplay(fixtureFinal(), [])).toEqual([]);
  });

  it('produces one frame per trace step', () => {
    expect(planReplay(fixtureFinal(), trace)).toHaveLength(trace.length);
  });

  it('reveals only zones (no piles) for the opening placeSeats frame', () => {
    const frames = planReplay(fixtureFinal(), trace);
    expect(Object.keys(frames[0].state.zones)).toEqual(['z1']);
    expect(Object.keys(frames[0].state.piles)).toEqual([]);
    expect(Object.keys(frames[0].state.cards)).toEqual([]);
    // The revealed zone shows no piles until its deck is placed.
    expect(frames[0].state.zones.z1.pileIds).toEqual([]);
  });

  it('builds up monotonically (each frame is a superset of the previous)', () => {
    const frames = planReplay(fixtureFinal(), trace);
    for (let i = 1; i < frames.length; i++) {
      const prevZones = new Set(Object.keys(frames[i - 1].state.zones));
      const prevPiles = new Set(Object.keys(frames[i - 1].state.piles));
      for (const z of prevZones) expect(frames[i].state.zones[z]).toBeDefined();
      for (const p of prevPiles) expect(frames[i].state.piles[p]).toBeDefined();
    }
  });

  it('lands the last frame exactly on the final state (skip == full replay)', () => {
    const final = fixtureFinal();
    const frames = planReplay(final, trace);
    const last = frames.at(-1)!.state;
    expect(Object.keys(last.zones).sort()).toEqual(Object.keys(final.zones).sort());
    expect(Object.keys(last.piles).sort()).toEqual(Object.keys(final.piles).sort());
    expect(Object.keys(last.cards).sort()).toEqual(Object.keys(final.cards).sort());
    expect(last.zoneOrder).toEqual(final.zoneOrder);
    expect(last.rootPileIds).toEqual(final.rootPileIds);
    // The dangling pile/card from the skipped step never appears.
    expect(last.piles.pGhost).toBeUndefined();
    expect(last.cards.cGhost).toBeUndefined();
  });

  it('never leaves the source final state mutated', () => {
    const final = fixtureFinal();
    planReplay(final, trace);
    expect(final.zones.z1.pileIds).toEqual(['p1']);
  });
});
