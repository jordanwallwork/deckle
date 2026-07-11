// Pure operations on the v2 TabletopState. Each function mutates the passed
// state in place — callers wrap them in the store's transaction/commit API.
// Operations stay minimal: the normalize pass owns cross-cutting bookkeeping.

import type { Card, Pile, Selection, TabletopState, Template, Templates } from './types';

export function makeId(prefix = 'id'): string {
  const suffix =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  return `${prefix}-${suffix}`;
}

/** Normalize an angle to [0, 360). */
export function normalizeDegrees(n: number): number {
  const r = n % 360;
  return r < 0 ? r + 360 : r;
}

export function getPile(state: TabletopState, pileId: string): Pile {
  const pile = state.piles[pileId];
  if (!pile) throw new Error(`Pile not found: ${pileId}`);
  return pile;
}

/** The ordered pile-id list that contains this pile (root list or its zone's). */
export function containerPileIds(state: TabletopState, pile: Pile): string[] {
  if (pile.zoneId === null) return state.rootPileIds;
  const zone = state.zones[pile.zoneId];
  if (!zone) throw new Error(`Zone not found: ${pile.zoneId}`);
  return zone.pileIds;
}

// ─── Spawning ──────────────────────────────────────────────────────────────

/**
 * Spawn one pile at a point on the root table from template instances: one
 * card per instance (array order, last = top). Face-state heuristic: more
 * than one instance spawns face-down (a deck); exactly one spawns face-up
 * (a reference card). Spawning never creates zones.
 *
 * (x, y) is world-space and becomes the pile centre. Returns the pile id.
 */
export function spawnPileFromTemplate(
  state: TabletopState,
  template: Template,
  instances: (Record<string, string> | null)[],
  x: number,
  y: number
): string | null {
  if (instances.length === 0) return null;

  const faceDown = template.flippable && instances.length > 1;
  const cardIds: string[] = [];
  for (const mergeData of instances) {
    const card: Card = {
      id: makeId('card'),
      templateId: template.id,
      mergeData,
      isFlipped: faceDown,
      rotation: 0
    };
    state.cards[card.id] = card;
    cardIds.push(card.id);
  }

  const pile: Pile = {
    id: makeId('pile'),
    zoneId: null,
    x,
    y,
    locked: false,
    cardIds
  };
  state.piles[pile.id] = pile;
  state.rootPileIds.push(pile.id);
  return pile.id;
}

function serializeMergeData(mergeData: Record<string, string> | null): string {
  if (mergeData === null) return 'null';
  const sorted = Object.keys(mergeData).sort();
  return JSON.stringify(Object.fromEntries(sorted.map((k) => [k, mergeData[k]])));
}

/**
 * Return the subset of template.instances not yet on the table, so re-dropping
 * a component can never duplicate cards. For data-source templates, identity
 * is mergeData content (duplicate rows share identity); for non-data-source
 * templates (all null mergeData), identity is by count. Carried over from v1
 * unchanged.
 */
export function getUnplacedInstances(
  state: TabletopState,
  template: Template
): (Record<string, string> | null)[] {
  const placed = Object.values(state.cards).filter((c) => c.templateId === template.id);

  if (template.instances.every((inst) => inst === null)) {
    const remaining = template.instances.length - placed.length;
    return remaining > 0 ? template.instances.slice(0, remaining) : [];
  }

  const placedKeys = new Set(placed.map((c) => serializeMergeData(c.mergeData)));
  return template.instances.filter((inst) => !placedKeys.has(serializeMergeData(inst)));
}

// ─── Removal ───────────────────────────────────────────────────────────────

/** Remove a pile and all of its cards from the table. */
export function removePile(state: TabletopState, pileId: string): void {
  const pile = getPile(state, pileId);
  const ids = containerPileIds(state, pile);
  const index = ids.indexOf(pileId);
  if (index !== -1) ids.splice(index, 1);
  for (const cardId of pile.cardIds) {
    delete state.cards[cardId];
  }
  delete state.piles[pileId];
}

/**
 * Remove every card of a template from the table (the sidebar's remove-all).
 * Piles left with zero cards are removed with their container entries.
 */
export function removeAllCardsOfTemplate(state: TabletopState, templateId: string): void {
  for (const pile of Object.values(state.piles)) {
    const keep = pile.cardIds.filter((id) => state.cards[id]?.templateId !== templateId);
    if (keep.length === pile.cardIds.length) continue;
    for (const cardId of pile.cardIds) {
      if (state.cards[cardId]?.templateId === templateId) delete state.cards[cardId];
    }
    pile.cardIds = keep;
    if (pile.cardIds.length === 0) removePile(state, pile.id);
  }
}

// ─── Split / merge ─────────────────────────────────────────────────────────

/**
 * Whether a pile can take part in a merge: every card's template must be
 * mergeable (dice and tokens are not). Locked-target gating lives in the
 * drop resolver — this is the capability check only.
 */
export function isPileMergeable(state: TabletopState, templates: Templates, pile: Pile): boolean {
  return pile.cardIds.every((cardId) => {
    const card = state.cards[cardId];
    const template = card ? templates[card.templateId] : undefined;
    return template?.mergeable === true;
  });
}

/**
 * Whether flipping the pile means anything: at least one card is flippable.
 * Dice are flippable: false, so F skips pure dice piles.
 */
export function isPileFlippable(state: TabletopState, templates: Templates, pile: Pile): boolean {
  return pile.cardIds.some((cardId) => {
    const card = state.cards[cardId];
    const template = card ? templates[card.templateId] : undefined;
    return template?.flippable === true;
  });
}

/**
 * Split the top card off a multi-card pile into a new zoneless single-card
 * pile at the source's centre, appended to the root render order (above its
 * neighbours). The caller supplies the new pile's id so the reducer can keep
 * addressing the split pile in later drag frames. No-op on piles of one —
 * those move whole; there is nothing to split.
 */
export function splitTopCard(state: TabletopState, sourcePileId: string, newPileId: string): void {
  const source = getPile(state, sourcePileId);
  if (source.cardIds.length < 2) return;
  const topCardId = source.cardIds[source.cardIds.length - 1];
  source.cardIds = source.cardIds.slice(0, -1);
  const pile: Pile = {
    id: newPileId,
    zoneId: null,
    x: source.x,
    y: source.y,
    locked: false,
    cardIds: [topCardId]
  };
  state.piles[newPileId] = pile;
  state.rootPileIds.push(newPileId);
}

/**
 * Merge the source pile onto the target: the source's cards land on top in
 * their existing order, each keeping its own rotation and face state. The
 * source pile is deleted (a pile with zero cards may not exist). Dropping a
 * drawn card back onto its source deck goes through here and restores the
 * deck exactly.
 */
export function mergePiles(state: TabletopState, sourcePileId: string, targetPileId: string): void {
  if (sourcePileId === targetPileId) return;
  const source = getPile(state, sourcePileId);
  const target = getPile(state, targetPileId);
  target.cardIds = [...target.cardIds, ...source.cardIds];
  const ids = containerPileIds(state, source);
  const index = ids.indexOf(sourcePileId);
  if (index !== -1) ids.splice(index, 1);
  delete state.piles[sourcePileId];
}

// ─── Pile actions ──────────────────────────────────────────────────────────

/**
 * Flip a pile like physically turning it over: reverse the card order and
 * toggle every card's face. Degenerates to a plain card flip for a pile of
 * one. No-op when nothing in the pile is flippable (a lone die).
 */
export function flipPile(state: TabletopState, templates: Templates, pileId: string): void {
  const pile = getPile(state, pileId);
  if (!isPileFlippable(state, templates, pile)) return;
  pile.cardIds = [...pile.cardIds].reverse();
  for (const cardId of pile.cardIds) {
    const card = state.cards[cardId];
    if (card) card.isFlipped = !card.isFlipped;
  }
}

/** Reveal a deck's top without disturbing the rest: toggle only the top card. */
export function flipTopCard(state: TabletopState, templates: Templates, pileId: string): void {
  const pile = getPile(state, pileId);
  const topCard = state.cards[pile.cardIds[pile.cardIds.length - 1]];
  if (!topCard) return;
  if (templates[topCard.templateId]?.flippable !== true) return;
  topCard.isFlipped = !topCard.isFlipped;
}

/**
 * Rotate a pile as one physical object: every card turns by the same delta,
 * preserving relative orientations (the Scout case). The derived footprint
 * follows automatically — nothing else to update.
 */
export function rotatePile(state: TabletopState, pileId: string, delta = 90): void {
  const pile = getPile(state, pileId);
  for (const cardId of pile.cardIds) {
    const card = state.cards[cardId];
    if (card) card.rotation = normalizeDegrees(card.rotation + delta);
  }
}

/**
 * Shuffle a multi-card pile's order in place (Fisher–Yates). `random` is
 * injectable so tests are deterministic. No-op for piles of one.
 */
export function shufflePile(
  state: TabletopState,
  pileId: string,
  random: () => number = Math.random
): void {
  const pile = getPile(state, pileId);
  if (pile.cardIds.length < 2) return;
  const ids = [...pile.cardIds];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  pile.cardIds = ids;
}

/** Lock or unlock a pile. Gating on what "locked" refuses lives in the
 *  reducer (drag/split) and drop resolver (incoming merge). */
export function setPileLocked(state: TabletopState, pileId: string, locked: boolean): void {
  getPile(state, pileId).locked = locked;
}

// ─── Movement / ordering ───────────────────────────────────────────────────

/**
 * Set a pile's position in its own coordinate frame (world for root piles,
 * zone-local otherwise). (x, y) is the pile centre.
 */
export function movePileTo(state: TabletopState, pileId: string, x: number, y: number): void {
  const pile = getPile(state, pileId);
  pile.x = x;
  pile.y = y;
}

/**
 * Raise a pile to the top of its container's render order — picking a pile
 * up puts it above its neighbours, like on a real table.
 */
export function raisePile(state: TabletopState, pileId: string): void {
  const pile = getPile(state, pileId);
  const ids = containerPileIds(state, pile);
  const index = ids.indexOf(pileId);
  if (index === -1 || index === ids.length - 1) return;
  ids.splice(index, 1);
  ids.push(pileId);
}

/** Send a pile to the bottom of its container's render order. */
export function lowerPile(state: TabletopState, pileId: string): void {
  const pile = getPile(state, pileId);
  const ids = containerPileIds(state, pile);
  const index = ids.indexOf(pileId);
  if (index <= 0) return;
  ids.splice(index, 1);
  ids.unshift(pileId);
}

// ─── Selection ─────────────────────────────────────────────────────────────

export function setSelection(state: TabletopState, selection: Selection): void {
  state.selection = selection;
}

export function clearSelection(state: TabletopState): void {
  state.selection = { kind: 'none' };
}

export function isPileSelected(state: TabletopState, pileId: string): boolean {
  return state.selection.kind === 'piles' && state.selection.pileIds.includes(pileId);
}
