// Ticket 10 — dice as first-class table objects: roll bounds, the multi-dice
// scatter spawn (no zone created), the mixed-selection S dispatch (dice roll,
// multi-card piles shuffle), and F skipping dice. Scenario-shaped, at the
// pure seam.

import { describe, it, expect } from 'vitest';
import {
  applyPileAction,
  flippablePiles,
  pileActions,
  rollablePiles,
  shuffleOrRollPiles,
  shuffleOrRollablePiles
} from './actions';
import { applyDropPlan, resolveDrop } from './drop';
import { emptyTabletopState } from './initialization';
import { isPileDie, rollPile, scatterAround } from './operations';
import { normalize } from './normalize';
import type { TabletopState } from './types';
import { cardTemplate, diceTemplate, makeCard, makePile, makeTemplates } from './fixtures';

const templates = makeTemplates(cardTemplate(), diceTemplate());

/** A sequence of scripted random() values (throws when exhausted). */
function sequence(values: number[]): () => number {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error('random sequence exhausted');
    return values[i++];
  };
}

/** A lone die pile at (x, y). */
function diePile(state: TabletopState, id: string, cardId: string, x = 0, y = 0) {
  state.piles[id] = makePile({ id, cardIds: [cardId], x, y });
  state.cards[cardId] = makeCard({ id: cardId, templateId: 'tpl-dice' });
  state.rootPileIds.push(id);
}

/** A face-down deck pile at (x, y). */
function deckPile(state: TabletopState, id: string, cardIds: string[], x = 0, y = 0) {
  state.piles[id] = makePile({ id, cardIds, x, y });
  for (const cid of cardIds) state.cards[cid] = makeCard({ id: cid, isFlipped: true });
  state.rootPileIds.push(id);
}

describe('roll bounds', () => {
  it('a D6 roll always lands in 1–6 and shows on the die', () => {
    const state = emptyTabletopState();
    diePile(state, 'd', 'dc');

    rollPile(state, templates, 'd', () => 0);
    expect(state.cards.dc.diceValue).toBe(1); // floor(0 * 6) + 1

    rollPile(state, templates, 'd', () => 0.999999);
    expect(state.cards.dc.diceValue).toBe(6); // floor(0.999… * 6) + 1

    // Sweep the unit interval — every result is a valid face.
    for (let r = 0; r < 1; r += 0.017) {
      rollPile(state, templates, 'd', () => r);
      expect(state.cards.dc.diceValue).toBeGreaterThanOrEqual(1);
      expect(state.cards.dc.diceValue).toBeLessThanOrEqual(6);
    }
  });

  it('leaves non-dice cards untouched (no diceValue)', () => {
    const state = emptyTabletopState();
    state.piles.p = makePile({ id: 'p', cardIds: ['c'] });
    state.cards.c = makeCard({ id: 'c' });
    state.rootPileIds.push('p');

    rollPile(state, templates, 'p', () => 0.5);
    expect(state.cards.c.diceValue).toBeUndefined();
  });
});

describe('scatter placement', () => {
  it('produces one point per die, each jittered within the radius', () => {
    // Two calls per point (x then y); +radius, −radius, 0, 0.
    const points = scatterAround({ x: 100, y: 200 }, 2, sequence([1, 0, 0.5, 0.5]), 40);
    expect(points).toEqual([
      { x: 140, y: 160 },
      { x: 100, y: 200 }
    ]);
  });

  it('stays inside ±radius for arbitrary randomness', () => {
    let r = 0;
    const points = scatterAround({ x: 0, y: 0 }, 20, () => ((r += 0.13) % 1), 48);
    expect(points).toHaveLength(20);
    for (const p of points) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(48);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(48);
    }
  });
});

describe('multi-dice spawn', () => {
  it('scatters loose single-die piles at the drop point without creating a zone', () => {
    const state = emptyTabletopState();
    // diceTemplate carries two instances → two loose dice.
    const plan = resolveDrop(
      state,
      templates,
      { kind: 'template', templateId: 'tpl-dice' },
      { x: 500, y: 500 },
      sequence([0.5, 0.5, 0.5, 0.5])
    );
    expect(plan.kind).toBe('multi');
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    // Two separate single-die piles on the root, no zone spawned.
    expect(state.zoneOrder).toEqual([]);
    expect(state.rootPileIds).toHaveLength(2);
    for (const id of state.rootPileIds) {
      const pile = state.piles[id];
      expect(pile.cardIds).toHaveLength(1);
      expect(pile.zoneId).toBeNull();
      expect(isPileDie(state, templates, pile)).toBe(true);
    }
  });

  it('re-dropping a fully-placed dice-set is a no-op (dedup)', () => {
    const state = emptyTabletopState();
    const first = resolveDrop(state, templates, { kind: 'template', templateId: 'tpl-dice' }, { x: 0, y: 0 }, () => 0.5);
    applyDropPlan(state, templates, first);
    normalize(state, templates, { dev: true });

    const again = resolveDrop(state, templates, { kind: 'template', templateId: 'tpl-dice' }, { x: 0, y: 0 }, () => 0.5);
    expect(again).toEqual({ kind: 'none' });
  });
});

describe('mixed-selection S dispatch', () => {
  it('rolls dice and shuffles multi-card piles in one pass; single cards and locked piles are inert', () => {
    const state = emptyTabletopState();
    diePile(state, 'die', 'dc');
    deckPile(state, 'deck', ['a', 'b']);
    // A single card (nothing for S to do) and a locked deck (inert).
    state.piles.single = makePile({ id: 'single', cardIds: ['s'] });
    state.cards.s = makeCard({ id: 's' });
    state.rootPileIds.push('single');
    state.piles.locked = makePile({ id: 'locked', cardIds: ['l1', 'l2'], locked: true });
    state.cards.l1 = makeCard({ id: 'l1' });
    state.cards.l2 = makeCard({ id: 'l2' });
    state.rootPileIds.push('locked');

    const ids = ['die', 'deck', 'single', 'locked'];
    expect(shuffleOrRollablePiles(state, templates, ids)).toEqual(['die', 'deck']);

    // random()=0: the die rolls to 1, the deck reverses (Fisher–Yates on 2).
    shuffleOrRollPiles(state, templates, ids, () => 0);
    expect(state.cards.dc.diceValue).toBe(1);
    expect(state.piles.deck.cardIds).toEqual(['b', 'a']);
    expect(state.piles.single.cardIds).toEqual(['s']);
    expect(state.piles.locked.cardIds).toEqual(['l1', 'l2']);
  });

  it('F skips dice in a mixed selection', () => {
    const state = emptyTabletopState();
    diePile(state, 'die', 'dc');
    deckPile(state, 'deck', ['a', 'b']);
    expect(flippablePiles(state, templates, ['die', 'deck'])).toEqual(['deck']);
  });
});

describe('roll from the pile menu', () => {
  it('a die offers Roll (not Shuffle); Roll sets the result', () => {
    const state = emptyTabletopState();
    diePile(state, 'die', 'dc');

    const actions = pileActions(state, templates, 'die');
    expect(actions).toContain('roll');
    expect(actions).not.toContain('shuffle');

    applyPileAction(state, templates, 'die', 'roll', () => 0.999999);
    expect(state.cards.dc.diceValue).toBe(6);
  });

  it('rollablePiles filters to unlocked dice only', () => {
    const state = emptyTabletopState();
    diePile(state, 'die', 'dc');
    state.piles.lockedDie = makePile({ id: 'lockedDie', cardIds: ['ld'], locked: true });
    state.cards.ld = makeCard({ id: 'ld', templateId: 'tpl-dice' });
    state.rootPileIds.push('lockedDie');
    deckPile(state, 'deck', ['a', 'b']);

    expect(rollablePiles(state, templates, ['die', 'lockedDie', 'deck'])).toEqual(['die']);
  });
});
