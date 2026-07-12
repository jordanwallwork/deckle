// Pure animation planning for the two signature tabletop animations —
// the shuffle riffle (on any multi-card pile) and the zone-wide wave flip
// (on spread / grid zones). Both are transient UI hints: they never enter
// history, and the reactive store (store.svelte.ts) holds the live hint state
// while these pure functions decide what to render and what to commit.
//
// The shuffle riffle defers its state change: the new order is computed up
// front (so the renderer knows the eventual top card and can fan it in) and
// committed only when the animation lands. That makes interruptions safe —
// starting another shuffle, or any other commit, finalises the pending one
// first so its order is never lost and undo sees exactly one step.

import { computeShuffledOrder, isPileFlippable, setPileOrder } from './operations';
import type { TabletopState, Templates } from './types';

// ─── Shuffle riffle ──────────────────────────────────────────────────────────

/** Ghost cards rendered fanning out during a shuffle, capped by pile size. */
export const SHUFFLE_ANIMATION_CARDS = 5;

// Timing of the fan-out/fan-in, shared by the store's finalisation timer and
// the ShuffleAnimation component so they stay in lock-step.
export const SHUFFLE_STAGGER_MS = 70;
export const SHUFFLE_OUT_MS = 220;
export const SHUFFLE_HOLD_MS = 100;
export const SHUFFLE_IN_MS = 240;

/** Total duration of the fan for `cardCount` animated ghost cards. */
export function shuffleAnimationDuration(cardCount: number): number {
  return (
    Math.max(0, cardCount - 1) * SHUFFLE_STAGGER_MS +
    SHUFFLE_OUT_MS +
    SHUFFLE_HOLD_MS +
    SHUFFLE_IN_MS
  );
}

/** One pile's precomputed shuffle: the order to commit and the sample to fan. */
export interface PendingPileShuffle {
  pileId: string;
  /** The order the pile's cards take when the animation lands. */
  newOrder: string[];
  /** Sample of cards rendered fanning out (paint order: newTop … oldTop). */
  animatedCardIds: string[];
}

/**
 * A shuffle whose order is computed but not yet committed. Holds every pile in
 * one S press / batch so finalising commits them as a single history entry
 * (one undo step), while each pile still fans in its own renderer.
 */
export interface PendingShuffle {
  piles: PendingPileShuffle[];
}

/**
 * Pick which cards fan out during the shuffle. The set must include both the
 * old top (visible at t=0) and the new top (visible when it lands); the rest
 * is a random sample of the remaining cards so the fan looks populated.
 *
 * Returns paint order [newTop, …extras, oldTop]: the old top paints last so
 * the user first sees the card they were already looking at; the renderer
 * swaps z-indices mid-flight so the new top lands on top. `random` is
 * injectable so the sample is deterministic in tests.
 */
export function pickShuffleAnimationCards(
  newOrder: readonly string[],
  oldTopId: string,
  maxCards: number,
  random: () => number = Math.random
): string[] {
  const newTop = newOrder[newOrder.length - 1];
  const required = oldTopId === newTop ? [newTop] : [newTop, oldTopId];
  const requiredSet = new Set(required);

  const pool = newOrder.filter((id) => !requiredSet.has(id));
  const wantExtra = Math.min(Math.max(0, maxCards - required.length), pool.length);

  // Fisher–Yates partial sample.
  for (let i = 0; i < wantExtra; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const extras = pool.slice(0, wantExtra);

  return oldTopId === newTop ? [newTop, ...extras] : [newTop, ...extras, oldTopId];
}

/**
 * Plan the shuffle of the given piles: for every multi-card pile among them,
 * precompute its new order and animation sample. Returns null when none is
 * shufflable (nothing to animate). Callers gate on lock / applicability first
 * (see actions.shufflablePiles); this defensively skips piles of one.
 */
export function planShuffle(
  state: TabletopState,
  pileIds: readonly string[],
  random: () => number = Math.random
): PendingShuffle | null {
  const piles: PendingPileShuffle[] = [];
  for (const pileId of pileIds) {
    const pile = state.piles[pileId];
    if (!pile || pile.cardIds.length < 2) continue;
    const newOrder = computeShuffledOrder(pile.cardIds, random);
    const oldTop = pile.cardIds[pile.cardIds.length - 1];
    const animatedCardIds = pickShuffleAnimationCards(
      newOrder,
      oldTop,
      SHUFFLE_ANIMATION_CARDS,
      random
    );
    piles.push({ pileId, newOrder, animatedCardIds });
  }
  return piles.length === 0 ? null : { piles };
}

/** The pile ids covered by a pending shuffle. */
export function pendingShufflePileIds(pending: PendingShuffle): string[] {
  return pending.piles.map((p) => p.pileId);
}

/** The fan duration of the longest pile in a pending batch. */
export function pendingShuffleDuration(pending: PendingShuffle): number {
  return pending.piles.reduce(
    (max, p) => Math.max(max, shuffleAnimationDuration(p.animatedCardIds.length)),
    0
  );
}

/** The pending-pile plan for a given pile, or null if it isn't animating. */
export function pendingShuffleFor(
  pending: PendingShuffle | null,
  pileId: string
): PendingPileShuffle | null {
  return pending?.piles.find((p) => p.pileId === pileId) ?? null;
}

/**
 * Commit a pending shuffle's precomputed orders into state (one undo step).
 * `setPileOrder` no-ops any pile whose cards changed under the animation, so a
 * stale plan can never scramble the table.
 */
export function applyPendingShuffle(state: TabletopState, pending: PendingShuffle): void {
  for (const p of pending.piles) {
    if (state.piles[p.pileId]) setPileOrder(state, p.pileId, p.newOrder);
  }
}

/**
 * What to do when a new shuffle is requested while one may be in flight:
 *
 * - Nothing requested → keep the current pending untouched.
 * - Nothing pending → render the request.
 * - A requested pile is already animating → ignore the request (re-triggering a
 *   shuffle mid-fan does nothing, matching v1).
 * - Otherwise → finalise (commit) the pending batch first, then render the
 *   request. The interrupted order is committed, never lost.
 */
export interface ShuffleDecision {
  /** Commit these precomputed orders as one history entry before `next`. */
  finalize: PendingShuffle | null;
  /** The pending animation to render, or the current one when unchanged. */
  next: PendingShuffle | null;
}

export function requestShuffle(
  current: PendingShuffle | null,
  requested: PendingShuffle | null
): ShuffleDecision {
  if (!requested) return { finalize: null, next: current };
  if (!current) return { finalize: null, next: requested };
  const busy = new Set(pendingShufflePileIds(current));
  if (requested.piles.some((p) => busy.has(p.pileId))) {
    return { finalize: null, next: current };
  }
  return { finalize: current, next: requested };
}

// ─── Zone wave flip ──────────────────────────────────────────────────────────

/** Per-index flip delay (ms) that ripples a zone-wide flip across its piles. */
export const ZONE_FLIP_STAGGER_MS = 30;
/** The card flip transition itself (matches PileRenderer's 0.35s flip). */
export const ZONE_FLIP_DURATION_MS = 350;

/** Transient hint driving a zone's wave flip; renderers turn it into a
 *  per-pile CSS `transition-delay`. */
export interface ZoneFlipHint {
  zoneId: string;
  staggerMs: number;
}

/**
 * Whether flipping this zone should ripple as a wave, and the hint to render
 * if so. Only ordered/positional zones with more than one flippable pile
 * wave — spreads and grids; freeform and group flip all at once (null). The
 * flip itself is a single atomic commit regardless; this only affects visuals.
 */
export function planZoneFlip(
  state: TabletopState,
  templates: Templates,
  zoneId: string,
  staggerMs: number = ZONE_FLIP_STAGGER_MS
): ZoneFlipHint | null {
  const zone = state.zones[zoneId];
  if (!zone || (zone.type !== 'spread' && zone.type !== 'grid')) return null;
  const flippable = zone.pileIds.filter((id) => {
    const pile = state.piles[id];
    return pile !== undefined && !pile.locked && isPileFlippable(state, templates, pile);
  });
  return flippable.length > 1 ? { zoneId, staggerMs } : null;
}

/** Total wave duration for a zone of `pileCount` piles at the given stagger. */
export function zoneFlipDuration(
  pileCount: number,
  staggerMs: number = ZONE_FLIP_STAGGER_MS
): number {
  return staggerMs * Math.max(0, pileCount - 1) + ZONE_FLIP_DURATION_MS;
}
