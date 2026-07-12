// Invariant-based normalization. A single full-sweep pass runs after every
// committed mutation (transient drag frames skip it) and re-establishes the
// SPEC's invariants. Violations throw in dev and repair silently in prod, so
// every operation test doubles as an invariant test.
//
// Wired so far: referential integrity (ticket 01), no-empty-piles
// (ticket 03), the spread splay + layout invariants (ticket 07), and the
// grid-snap invariant (ticket 09).

import { makeId } from './operations';
import type { Pile, TabletopState, Templates } from './types';
import { snapGridToCells, zoneBehavior } from './zones';

export interface NormalizeOptions {
  /** True in dev builds: throw on violation instead of repairing. */
  dev: boolean;
}

class InvariantViolation extends Error {
  constructor(message: string) {
    super(`[tabletop v2] invariant violation: ${message}`);
    this.name = 'InvariantViolation';
  }
}

/**
 * Run the full invariant sweep, mutating `state` to repair violations
 * (prod) or throwing on the first one (dev).
 */
export function normalize(state: TabletopState, templates: Templates, opts: NormalizeOptions): void {
  const fail = (message: string): void => {
    if (opts.dev) throw new InvariantViolation(message);
  };

  noEmptyPiles(state, fail);
  spreadInvariants(state, templates, fail);
  gridInvariants(state, fail);
  referentialIntegrity(state, fail);
}

/**
 * Invariant: every pile in a grid sits on a cell, and every pile listed in a
 * grid claims that grid as its zone.
 *
 * The snap itself is a re-establishing step, never a dev-mode failure — a
 * drop lands the pile at its planned cell, but a multi-drop plans each pile
 * against the same occupancy snapshot, so two piles can arrive on one cell
 * and need spreading to distinct cells here (nearest free on collision;
 * overlap only when the grid is full). This also snaps piles a conversion
 * into grid (ticket 12) seats from arbitrary positions.
 *
 * Membership, though, throws in dev like the other invariants: `placePile`
 * keeps a pile's `zoneId` and its container list in lockstep, so a pile
 * listed in a grid whose `zoneId` points elsewhere is a structural bug no
 * legitimate operation produces (prod repairs it by adopting the pile).
 */
function gridInvariants(state: TabletopState, fail: (message: string) => void): void {
  for (const zone of Object.values(state.zones)) {
    if (zone.type !== 'grid') continue;
    for (const pileId of zone.pileIds) {
      const pile = state.piles[pileId];
      if (pile && pile.zoneId !== zone.id) {
        fail(`grid ${zone.id} lists pile ${pileId} whose zoneId is ${pile.zoneId}`);
        pile.zoneId = zone.id;
      }
    }
    snapGridToCells(state, zone);
  }
}

/**
 * Invariants: a spread only ever contains single-card piles, positioned by
 * its layout, and every pile it lists claims the spread as its zone.
 *
 * The splay and layout are re-establishing steps, never dev-mode failures:
 * legitimate commits rely on them — a deck dropped into a spread arrives as
 * one multi-card pile and fans out here, and every drop lands at its drop
 * point until layout assigns the real slot — so finding work to do is the
 * designed path, not a bug. (This is also what will handle conversion *into*
 * a spread in ticket 12.)
 *
 * Membership, though, throws in dev like the other invariants: `placePile`
 * keeps a pile's `zoneId` and its container list in lockstep, so a pile
 * listed in a spread whose `zoneId` points elsewhere is a structural bug no
 * legitimate operation produces (prod repairs it by adopting the pile).
 */
function spreadInvariants(
  state: TabletopState,
  templates: Templates,
  fail: (message: string) => void
): void {
  for (const zone of Object.values(state.zones)) {
    if (zone.type !== 'spread') continue;
    // Membership: a pile listed here must claim this spread as its zone.
    for (const pileId of zone.pileIds) {
      const pile = state.piles[pileId];
      if (pile && pile.zoneId !== zone.id) {
        fail(`spread ${zone.id} lists pile ${pileId} whose zoneId is ${pile.zoneId}`);
        pile.zoneId = zone.id;
      }
    }
    // Splay: fan each multi-card pile into single-card piles in array order —
    // pile-bottom at the pile's own index, pile-top last — preserving
    // physical layering under the overlap render (later index renders on
    // top). Cards keep their rotation and face state untouched.
    for (let i = 0; i < zone.pileIds.length; i++) {
      const pile = state.piles[zone.pileIds[i]];
      if (!pile || pile.cardIds.length < 2) continue;
      const splayed: string[] = [];
      for (const cardId of pile.cardIds) {
        const single: Pile = {
          id: makeId('pile'),
          zoneId: zone.id,
          x: pile.x,
          y: pile.y,
          locked: pile.locked,
          cardIds: [cardId]
        };
        state.piles[single.id] = single;
        splayed.push(single.id);
      }
      delete state.piles[pile.id];
      zone.pileIds.splice(i, 1, ...splayed);
      i += splayed.length - 1;
    }
    // Layout: write the spread's positions into state (renderers never
    // compute layout).
    zoneBehavior(zone).layout({ state, templates }, zone);
  }
}

/**
 * Invariant: a pile with zero cards may not exist after a commit — deletion
 * here is the only stack-dissolve mechanism (no operation removes emptied
 * piles itself, except where the pile's cards were deliberately destroyed).
 */
function noEmptyPiles(state: TabletopState, fail: (message: string) => void): void {
  for (const pile of Object.values(state.piles)) {
    if (pile.cardIds.length > 0) continue;
    fail(`pile ${pile.id} has no cards`);
    const container =
      pile.zoneId === null ? state.rootPileIds : state.zones[pile.zoneId]?.pileIds;
    if (container) {
      const index = container.indexOf(pile.id);
      if (index !== -1) container.splice(index, 1);
    }
    delete state.piles[pile.id];
  }
}

/**
 * Invariant: each card lives in exactly one pile; each pile is listed exactly
 * once in exactly one container (root list or a zone's pile list); zone
 * order/child lists reference existing zones. Repairs remove danglers, dedupe
 * double-listings, adopt orphaned piles onto the root, and delete orphaned
 * cards.
 */
function referentialIntegrity(state: TabletopState, fail: (message: string) => void): void {
  // Zone lists reference existing top-level zones exactly once.
  dedupeExisting(state.zoneOrder, (id) => {
    const zone = state.zones[id];
    return zone !== undefined && zone.parentZoneId === undefined;
  }, fail, 'zoneOrder');
  for (const zone of Object.values(state.zones)) {
    if (zone.type === 'freeform' && zone.childZoneIds) {
      dedupeExisting(zone.childZoneIds, (id) => {
        const child = state.zones[id];
        return child !== undefined && child.parentZoneId === zone.id;
      }, fail, `zone ${zone.id} childZoneIds`);
    }
  }

  // Container lists reference existing piles exactly once across all lists.
  const seenPiles = new Set<string>();
  const validPileFor = (containerLabel: string) => (id: string): boolean => {
    if (!state.piles[id]) return false;
    if (seenPiles.has(id)) {
      fail(`pile ${id} listed in more than one container (${containerLabel})`);
      return false;
    }
    seenPiles.add(id);
    return true;
  };
  dedupeExisting(state.rootPileIds, validPileFor('root'), fail, 'rootPileIds');
  for (const zone of Object.values(state.zones)) {
    dedupeExisting(zone.pileIds, validPileFor(`zone ${zone.id}`), fail, `zone ${zone.id} pileIds`);
  }

  // Every pile points at an existing zone (or root) and appears in its
  // container's list.
  for (const pile of Object.values(state.piles)) {
    if (pile.zoneId !== null && !state.zones[pile.zoneId]) {
      fail(`pile ${pile.id} references missing zone ${pile.zoneId}`);
      pile.zoneId = null; // best effort: adopt onto the root table
    }
    if (!seenPiles.has(pile.id)) {
      fail(`pile ${pile.id} missing from its container's pile list`);
      const container = pile.zoneId === null ? state.rootPileIds : state.zones[pile.zoneId].pileIds;
      container.push(pile.id);
      seenPiles.add(pile.id);
    }
  }

  // Every card id in a pile refers to an existing card, and no card appears
  // in two piles.
  const cardOwner = new Map<string, string>();
  for (const pile of Object.values(state.piles)) {
    for (let i = pile.cardIds.length - 1; i >= 0; i--) {
      const cardId = pile.cardIds[i];
      if (!state.cards[cardId]) {
        fail(`pile ${pile.id} references missing card ${cardId}`);
        pile.cardIds.splice(i, 1);
        continue;
      }
      const owner = cardOwner.get(cardId);
      if (owner !== undefined) {
        fail(`card ${cardId} appears in piles ${owner} and ${pile.id}`);
        pile.cardIds.splice(i, 1);
        continue;
      }
      cardOwner.set(cardId, pile.id);
    }
  }

  // Every card belongs to some pile — orphans are unreachable, delete them.
  for (const cardId of Object.keys(state.cards)) {
    if (!cardOwner.has(cardId)) {
      fail(`card ${cardId} belongs to no pile`);
      delete state.cards[cardId];
    }
  }

  // Selection must reference live objects; prune quietly (selection is
  // ephemeral UI state, not an invariant worth throwing over).
  if (state.selection.kind === 'piles') {
    const alive = state.selection.pileIds.filter((id) => state.piles[id]);
    if (alive.length === 0) state.selection = { kind: 'none' };
    else if (alive.length !== state.selection.pileIds.length) state.selection = { kind: 'piles', pileIds: alive };
  } else if (state.selection.kind === 'zone' && !state.zones[state.selection.zoneId]) {
    state.selection = { kind: 'none' };
  }
  if (state.editingZoneId !== null && !state.zones[state.editingZoneId]) {
    state.editingZoneId = null;
  }
}

/**
 * Remove entries from an ordered id list that fail `isValid` or repeat within
 * the list, reporting each removal through `fail`.
 */
function dedupeExisting(
  ids: string[],
  isValid: (id: string) => boolean,
  fail: (message: string) => void,
  label: string
): void {
  const seen = new Set<string>();
  for (let i = 0; i < ids.length; ) {
    const id = ids[i];
    if (seen.has(id)) {
      fail(`${label} lists ${id} more than once`);
      ids.splice(i, 1);
      continue;
    }
    if (!isValid(id)) {
      // isValid reports cross-container duplicates itself; dangling ids get
      // a generic message.
      fail(`${label} references invalid id ${id}`);
      ids.splice(i, 1);
      continue;
    }
    seen.add(id);
    i++;
  }
}
