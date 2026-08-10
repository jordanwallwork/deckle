import { describe, it, expect } from 'vitest';
import { computeViewState, type VisibilityMap, type MaskedState } from './visibility';
import type { Card, Pile, TabletopState, Zone } from './types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function card(id: string): Card {
  return {
    id,
    templateId: 'card-tpl',
    mergeData: { name: `secret-${id}` },
    label: `Card ${id}`,
    isFlipped: false,
    rotation: 0
  };
}

function freeformZone(id: string): Zone {
  return {
    id,
    name: id,
    type: 'freeform',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    pileIds: [],
    locked: false
  };
}

/**
 * A table with N seat "hand" zones (one owned pile+card each) plus a shared
 * public "table" zone with one pile+card, plus one card on the root table.
 */
function buildTable(seatCount: number): { state: TabletopState; visibility: VisibilityMap } {
  const cards: Record<string, Card> = {};
  const piles: Record<string, Pile> = {};
  const zones: Record<string, Zone> = {};
  const zoneOrder: string[] = [];
  const visibility: VisibilityMap = {};

  for (let seat = 0; seat < seatCount; seat++) {
    const zoneId = `hand${seat}`;
    const pileId = `hand-pile${seat}`;
    const cardId = `hand-card${seat}`;
    const zone = freeformZone(zoneId);
    zone.pileIds = [pileId];
    zones[zoneId] = zone;
    zoneOrder.push(zoneId);
    piles[pileId] = { id: pileId, zoneId, x: 0, y: 0, locked: false, cardIds: [cardId] };
    cards[cardId] = card(cardId);
    visibility[zoneId] = { faceVisibility: 'owner', presence: 'hidden-from-non-owners', ownerSeat: seat };
  }

  // Shared public table zone (unowned, faces to all).
  const tableZone = freeformZone('table');
  tableZone.pileIds = ['table-pile'];
  zones['table'] = tableZone;
  zoneOrder.push('table');
  piles['table-pile'] = { id: 'table-pile', zoneId: 'table', x: 0, y: 0, locked: false, cardIds: ['table-card'] };
  cards['table-card'] = card('table-card');
  visibility['table'] = { faceVisibility: 'all', presence: 'visible' };

  // A card sitting on the open root table (no zone).
  piles['root-pile'] = { id: 'root-pile', zoneId: null, x: 0, y: 0, locked: false, cardIds: ['root-card'] };
  cards['root-card'] = card('root-card');

  const state: TabletopState = {
    cards,
    piles,
    zones,
    zoneOrder,
    rootPileIds: ['root-pile'],
    selection: { kind: 'none' },
    editingZoneId: null
  };
  return { state, visibility };
}

function isRedacted(view: MaskedState, cardId: string): boolean {
  const c = view.cards[cardId];
  return !!c && c.faceHidden === true && c.mergeData === null && c.label === undefined;
}

function isVisible(view: MaskedState, cardId: string): boolean {
  const c = view.cards[cardId];
  return !!c && !c.faceHidden && c.mergeData !== null && c.label !== undefined;
}

// ---------------------------------------------------------------------------
// Purity
// ---------------------------------------------------------------------------

describe('computeViewState purity', () => {
  it('does not mutate the input state', () => {
    const { state, visibility } = buildTable(2);
    const snapshot = structuredClone(state);
    computeViewState(state, 0, visibility);
    expect(state).toEqual(snapshot);
  });

  it('shares no mutable structure with the input', () => {
    const { state, visibility } = buildTable(2);
    const view = computeViewState(state, 0, visibility);
    view.cards['hand-card0'].mergeData = { tampered: 'yes' };
    view.piles['hand-pile0'].cardIds.push('x');
    expect(state.cards['hand-card0'].mergeData).toEqual({ name: 'secret-hand-card0' });
    expect(state.piles['hand-pile0'].cardIds).toEqual(['hand-card0']);
  });
});

// ---------------------------------------------------------------------------
// Omniscient
// ---------------------------------------------------------------------------

describe('omniscient viewer', () => {
  it('shows every card unmasked', () => {
    const { state, visibility } = buildTable(4);
    const view = computeViewState(state, 'omniscient', visibility);
    for (const id of Object.keys(state.cards)) {
      expect(isVisible(view, id)).toBe(true);
    }
    expect(Object.keys(view.zones).sort()).toEqual(Object.keys(state.zones).sort());
  });

  it('returns a deep clone, not the same reference', () => {
    const { state, visibility } = buildTable(2);
    const view = computeViewState(state, 'omniscient', visibility);
    expect(view.cards['hand-card0']).not.toBe(state.cards['hand-card0']);
  });
});

// ---------------------------------------------------------------------------
// Masking across 2 / 4 / 8 player configs
// ---------------------------------------------------------------------------

describe.each([2, 4, 8])('masking with %i seats (hidden-from-non-owners hands)', (seatCount) => {
  it('an owner sees their own hand, hides every other hand entirely', () => {
    const { state, visibility } = buildTable(seatCount);
    const viewer = 0;
    const view = computeViewState(state, viewer, visibility);

    // Own hand: zone present, card visible.
    expect(view.zones['hand0']).toBeDefined();
    expect(isVisible(view, 'hand-card0')).toBe(true);

    // Every other seat's hand: zone, pile and card all gone.
    for (let seat = 1; seat < seatCount; seat++) {
      expect(view.zones[`hand${seat}`]).toBeUndefined();
      expect(view.piles[`hand-pile${seat}`]).toBeUndefined();
      expect(view.cards[`hand-card${seat}`]).toBeUndefined();
      expect(view.zoneOrder).not.toContain(`hand${seat}`);
    }
  });

  it('each seat sees exactly one hand zone (their own)', () => {
    const { state, visibility } = buildTable(seatCount);
    for (let viewer = 0; viewer < seatCount; viewer++) {
      const view = computeViewState(state, viewer, visibility);
      const handZones = Object.keys(view.zones).filter((z) => z.startsWith('hand'));
      expect(handZones).toEqual([`hand${viewer}`]);
    }
  });

  it('every seat still sees the shared table zone and its card', () => {
    const { state, visibility } = buildTable(seatCount);
    for (let viewer = 0; viewer < seatCount; viewer++) {
      const view = computeViewState(state, viewer, visibility);
      expect(view.zones['table']).toBeDefined();
      expect(isVisible(view, 'table-card')).toBe(true);
      // The root-table card is always public too.
      expect(isVisible(view, 'root-card')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// faceVisibility axis (presence visible, only faces masked)
// ---------------------------------------------------------------------------

describe('faceVisibility axis', () => {
  function twoSeatVisibleHands(fv: 'all' | 'owner' | 'others' | 'none'): {
    state: TabletopState;
    visibility: VisibilityMap;
  } {
    const { state, visibility } = buildTable(2);
    // Make hands stay present but change who sees the faces.
    visibility['hand0'] = { faceVisibility: fv, presence: 'visible', ownerSeat: 0 };
    visibility['hand1'] = { faceVisibility: fv, presence: 'visible', ownerSeat: 1 };
    return { state, visibility };
  }

  it("'all' shows faces to everyone", () => {
    const { state, visibility } = twoSeatVisibleHands('all');
    const view = computeViewState(state, 1, visibility);
    expect(isVisible(view, 'hand-card0')).toBe(true);
    expect(isVisible(view, 'hand-card1')).toBe(true);
  });

  it("'owner' shows faces only to the owning seat", () => {
    const { state, visibility } = twoSeatVisibleHands('owner');
    const view = computeViewState(state, 0, visibility);
    // Zone stays present (presence visible) but card faces are redacted for non-owners.
    expect(view.zones['hand1']).toBeDefined();
    expect(isVisible(view, 'hand-card0')).toBe(true);
    expect(isRedacted(view, 'hand-card1')).toBe(true);
  });

  it("'others' shows faces to everyone except the owner (Hanabi)", () => {
    const { state, visibility } = twoSeatVisibleHands('others');
    const view = computeViewState(state, 0, visibility);
    expect(isRedacted(view, 'hand-card0')).toBe(true); // can't see own
    expect(isVisible(view, 'hand-card1')).toBe(true); // can see others'
  });

  it("'none' hides faces from everyone including the owner", () => {
    const { state, visibility } = twoSeatVisibleHands('none');
    const view = computeViewState(state, 0, visibility);
    expect(isRedacted(view, 'hand-card0')).toBe(true);
    expect(isRedacted(view, 'hand-card1')).toBe(true);
  });

  it('redaction keeps presence/back fields but blanks identity', () => {
    const { state, visibility } = twoSeatVisibleHands('none');
    const view = computeViewState(state, 0, visibility);
    const masked = view.cards['hand-card0'];
    expect(masked.faceHidden).toBe(true);
    expect(masked.mergeData).toBeNull();
    expect(masked.label).toBeUndefined();
    // Back / geometry preserved so it renders as a face-down object.
    expect(masked.templateId).toBe('card-tpl');
    expect(masked.rotation).toBe(0);
    expect(masked.id).toBe('hand-card0');
  });
});

// ---------------------------------------------------------------------------
// Defaults / freeform play
// ---------------------------------------------------------------------------

describe('freeform solo play (no visibility metadata)', () => {
  it('treats zones absent from the map as fully public and unowned', () => {
    const { state } = buildTable(3);
    // Pass no visibility map at all — every card should be visible for any seat.
    const view = computeViewState(state, 0);
    for (const id of Object.keys(state.cards)) {
      expect(isVisible(view, id)).toBe(true);
    }
    expect(view.zoneOrder).toEqual(state.zoneOrder);
  });
});
