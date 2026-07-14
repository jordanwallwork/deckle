// Shared builders for the seam tests. Plain data only — mirrors what
// initialization.ts produces, without needing GameComponent inputs.

import { emptyTabletopState } from './initialization';
import type { Card, Pile, TabletopState, Template, Templates, Zone } from './types';

/** A standard 63.5×88.9mm card template (127×177.8px at 2px/mm). */
export function cardTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: 'tpl-card',
    name: 'Test Card',
    widthMm: 63.5,
    heightMm: 88.9,
    widthPx: 750,
    heightPx: 1050,
    mergeable: true,
    isContainer: false,
    flippable: true,
    instances: [null],
    ...overrides
  };
}

export function diceTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: 'tpl-dice',
    name: 'Test D6',
    widthMm: 16,
    heightMm: 16,
    widthPx: 32,
    heightPx: 32,
    mergeable: false,
    isContainer: false,
    flippable: false,
    faces: 6,
    instances: [null, null],
    ...overrides
  };
}

export function makeTemplates(...templates: Template[]): Templates {
  const record: Templates = {};
  for (const t of templates.length > 0 ? templates : [cardTemplate()]) {
    record[t.id] = t;
  }
  return record;
}

export function makeCard(overrides: Partial<Card> & { id: string }): Card {
  return {
    templateId: 'tpl-card',
    mergeData: null,
    isFlipped: false,
    rotation: 0,
    ...overrides
  };
}

export function makePile(overrides: Partial<Pile> & { id: string; cardIds: string[] }): Pile {
  return {
    zoneId: null,
    x: 0,
    y: 0,
    locked: false,
    ...overrides
  };
}

/**
 * Build a state containing the given root piles (with their cards registered
 * and the root order matching the argument order).
 */
export function stateWithPiles(...piles: { pile: Pile; cards: Card[] }[]): TabletopState {
  const state = emptyTabletopState();
  for (const { pile, cards } of piles) {
    state.piles[pile.id] = pile;
    state.rootPileIds.push(pile.id);
    for (const card of cards) {
      state.cards[card.id] = card;
    }
  }
  return state;
}

/**
 * Register a freeform zone (default 400×300 at the given world top-left) and
 * adopt the named piles into it, converting their current world positions to
 * zone-local so they stay visually in place. Piles must already be in the
 * state (via stateWithPiles).
 */
export function withZone(
  state: TabletopState,
  overrides: Partial<Zone> & { id: string },
  pileIds: string[] = []
): TabletopState {
  const zone: Zone = {
    name: 'Test Zone',
    type: 'freeform',
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    pileIds: [],
    locked: false,
    ...overrides
  } as Zone;
  state.zones[zone.id] = zone;
  if (zone.parentZoneId === undefined) state.zoneOrder.push(zone.id);
  for (const pileId of pileIds) {
    const pile = state.piles[pileId];
    if (!pile) continue;
    const rootIndex = state.rootPileIds.indexOf(pileId);
    if (rootIndex !== -1) state.rootPileIds.splice(rootIndex, 1);
    pile.zoneId = zone.id;
    pile.x -= zone.x;
    pile.y -= zone.y;
    zone.pileIds.push(pileId);
  }
  return state;
}

/** One single-card pile at (x, y): the simplest thing on a table. */
export function singleCardPile(
  pileId: string,
  cardId: string,
  x = 0,
  y = 0,
  overrides: Partial<Pile> = {}
): { pile: Pile; cards: Card[] } {
  return {
    pile: makePile({ id: pileId, cardIds: [cardId], x, y, ...overrides }),
    cards: [makeCard({ id: cardId })]
  };
}
