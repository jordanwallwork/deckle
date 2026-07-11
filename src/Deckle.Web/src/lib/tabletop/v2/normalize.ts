// Invariant-based normalization. A single full-sweep pass runs after every
// committed mutation (transient drag frames skip it) and re-establishes the
// SPEC's invariants. Violations throw in dev and repair silently in prod, so
// every operation test doubles as an invariant test.
//
// Wired so far (ticket 01): referential integrity. Later tickets add the
// empty-pile, splay, spread-layout and grid-snap invariants here.

import type { TabletopState, Templates } from './types';

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

  referentialIntegrity(state, fail);
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
