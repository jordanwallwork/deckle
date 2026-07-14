// Selection-wide pile actions and the pile context-menu action table.
//
// The F/R/S shortcuts mean the same thing everywhere: each acts on every
// applicable pile in the selection as one commit (one undo step). The shell
// asks which piles are applicable first so an empty action never records a
// history entry. The context menu is driven by the same applicability rules
// via `pileActions`, so menu and shortcuts can never disagree.

import {
  containerPileIds,
  flipPile,
  flipTopCard,
  isPileDie,
  isPileFlippable,
  lowerPile,
  raisePile,
  rollPile,
  rotatePile,
  setPileLocked,
  shufflePile
} from './operations';
import type { TabletopState, Templates } from './types';

/** Selected pile ids, or [] when the selection isn't piles. */
export function selectedPileIds(state: TabletopState): string[] {
  return state.selection.kind === 'piles' ? state.selection.pileIds : [];
}

/** The subset of piles F applies to: unlocked and containing a flippable card. */
export function flippablePiles(
  state: TabletopState,
  templates: Templates,
  pileIds: string[]
): string[] {
  return pileIds.filter((id) => {
    const pile = state.piles[id];
    return pile !== undefined && !pile.locked && isPileFlippable(state, templates, pile);
  });
}

/** The subset of piles R applies to: any unlocked pile. */
export function rotatablePiles(state: TabletopState, pileIds: string[]): string[] {
  return pileIds.filter((id) => {
    const pile = state.piles[id];
    return pile !== undefined && !pile.locked;
  });
}

/** The subset of piles S applies to: unlocked multi-card piles. */
export function shufflablePiles(state: TabletopState, pileIds: string[]): string[] {
  return pileIds.filter((id) => {
    const pile = state.piles[id];
    return pile !== undefined && !pile.locked && pile.cardIds.length > 1;
  });
}

/** The subset of piles S rolls: unlocked dice. */
export function rollablePiles(
  state: TabletopState,
  templates: Templates,
  pileIds: string[]
): string[] {
  return pileIds.filter((id) => {
    const pile = state.piles[id];
    return pile !== undefined && !pile.locked && isPileDie(state, templates, pile);
  });
}

/**
 * The subset of piles S acts on: dice (roll) or multi-card piles (shuffle),
 * in the given order. The applicability gate for the S shortcut, so a
 * selection of single cards and lone dice-free piles records no history.
 */
export function shuffleOrRollablePiles(
  state: TabletopState,
  templates: Templates,
  pileIds: string[]
): string[] {
  const rollable = new Set(rollablePiles(state, templates, pileIds));
  const shufflable = new Set(shufflablePiles(state, pileIds));
  return pileIds.filter((id) => rollable.has(id) || shufflable.has(id));
}

/** F: flip each applicable pile in the selection. */
export function flipPiles(state: TabletopState, templates: Templates, pileIds: string[]): void {
  for (const id of flippablePiles(state, templates, pileIds)) {
    flipPile(state, templates, id);
  }
}

/** R: rotate each applicable pile in the selection by the same delta. */
export function rotatePiles(state: TabletopState, pileIds: string[], delta = 90): void {
  for (const id of rotatablePiles(state, pileIds)) {
    rotatePile(state, id, delta);
  }
}

/** S: shuffle each applicable pile in the selection. */
export function shufflePiles(
  state: TabletopState,
  pileIds: string[],
  random: () => number = Math.random
): void {
  for (const id of shufflablePiles(state, pileIds)) {
    shufflePile(state, id, random);
  }
}

/**
 * S: dispatched per pile across a (possibly mixed) selection — dice roll,
 * multi-card piles shuffle. A die takes precedence, so it always rolls even
 * were it somehow multi-card; other piles shuffle. One commit, one undo step.
 */
export function shuffleOrRollPiles(
  state: TabletopState,
  templates: Templates,
  pileIds: string[],
  random: () => number = Math.random
): void {
  for (const id of shuffleOrRollablePiles(state, templates, pileIds)) {
    const pile = state.piles[id];
    if (!pile) continue;
    if (isPileDie(state, templates, pile)) rollPile(state, templates, id, random);
    else shufflePile(state, id, random);
  }
}

// ─── Context menu ──────────────────────────────────────────────────────────

export type PileAction =
  | 'flip'
  | 'roll'
  | 'rotate'
  | 'shuffle'
  | 'flip-top'
  | 'lock'
  | 'unlock'
  | 'send-front'
  | 'send-back';

/**
 * Exactly the actions applicable to this pile, in menu order. A locked pile
 * is inert: it offers only Unlock. Roll needs a die; Shuffle and Flip Top
 * Card need a multi-card pile; Flip needs a flippable card; Send to
 * Front/Back need a neighbour to reorder against.
 */
export function pileActions(
  state: TabletopState,
  templates: Templates,
  pileId: string
): PileAction[] {
  const pile = state.piles[pileId];
  if (!pile) return [];
  if (pile.locked) return ['unlock'];

  const actions: PileAction[] = [];
  if (isPileFlippable(state, templates, pile)) actions.push('flip');
  if (isPileDie(state, templates, pile)) actions.push('roll');
  actions.push('rotate');
  if (pile.cardIds.length > 1) {
    actions.push('shuffle');
    if (isPileFlippable(state, templates, pile)) actions.push('flip-top');
  }
  actions.push('lock');
  if (containerPileIds(state, pile).length > 1) {
    actions.push('send-front', 'send-back');
  }
  return actions;
}

/** Apply one context-menu action to its pile. Call inside a store commit. */
export function applyPileAction(
  state: TabletopState,
  templates: Templates,
  pileId: string,
  action: PileAction,
  random: () => number = Math.random
): void {
  if (!state.piles[pileId]) return;
  switch (action) {
    case 'flip':
      flipPile(state, templates, pileId);
      return;
    case 'roll':
      rollPile(state, templates, pileId, random);
      return;
    case 'rotate':
      rotatePile(state, pileId, 90);
      return;
    case 'shuffle':
      shufflePile(state, pileId, random);
      return;
    case 'flip-top':
      flipTopCard(state, templates, pileId);
      return;
    case 'lock':
      setPileLocked(state, pileId, true);
      return;
    case 'unlock':
      setPileLocked(state, pileId, false);
      return;
    case 'send-front':
      raisePile(state, pileId);
      return;
    case 'send-back':
      lowerPile(state, pileId);
      return;
  }
}
