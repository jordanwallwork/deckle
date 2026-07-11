import { describe, it, expect } from 'vitest';
import { applyDropPlan, findPileAt, resolveDrop } from './drop';
import { emptyTabletopState } from './initialization';
import { normalize } from './normalize';
import {
  getUnplacedInstances,
  removeAllCardsOfTemplate,
  removePile
} from './operations';
import {
  cardTemplate,
  diceTemplate,
  makeCard,
  makePile,
  makeTemplates,
  singleCardPile,
  stateWithPiles
} from './fixtures';

const rowA = { Name: 'A' };
const rowB = { Name: 'B' };
const rowC = { Name: 'C' };

describe('sidebar drop → resolver → spawn (the round-trip in)', () => {
  it('a fresh data-source component spawns one face-down pile with every instance at the drop point', () => {
    const template = cardTemplate({ instances: [rowA, rowB, rowC] });
    const templates = makeTemplates(template);
    const state = emptyTabletopState();

    const plan = resolveDrop(state, templates, { kind: 'template', templateId: template.id }, { x: 250, y: 130 });
    expect(plan).toEqual({
      kind: 'spawn-pile',
      templateId: template.id,
      instances: [rowA, rowB, rowC],
      x: 250,
      y: 130
    });

    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    expect(state.rootPileIds).toHaveLength(1);
    const pile = state.piles[state.rootPileIds[0]];
    expect(pile).toMatchObject({ x: 250, y: 130, zoneId: null });
    expect(pile.cardIds).toHaveLength(3);
    for (const cardId of pile.cardIds) expect(state.cards[cardId].isFlipped).toBe(true);
    expect(Object.keys(state.zones)).toHaveLength(0);
  });

  it('re-dropping a partially-placed component spawns only the missing instances', () => {
    const template = cardTemplate({ instances: [rowA, rowB, rowC] });
    const templates = makeTemplates(template);
    // Row A is already on the table as a lone card.
    const state = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1'], x: 10, y: 10 }),
      cards: [makeCard({ id: 'c1', mergeData: rowA })]
    });

    const plan = resolveDrop(state, templates, { kind: 'template', templateId: template.id }, { x: 400, y: 0 });
    applyDropPlan(state, templates, plan);
    normalize(state, templates, { dev: true });

    expect(state.rootPileIds).toHaveLength(2);
    const newPile = state.piles[state.rootPileIds[1]];
    expect(newPile.cardIds.map((id) => state.cards[id].mergeData)).toEqual([rowB, rowC]);
    // Exactly one of each row on the table afterwards.
    expect(Object.values(state.cards)).toHaveLength(3);
  });

  it('a fully-placed component resolves to a no-op', () => {
    const template = cardTemplate({ instances: [rowA, rowB] });
    const templates = makeTemplates(template);
    const state = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1', 'c2'] }),
      cards: [makeCard({ id: 'c1', mergeData: rowA }), makeCard({ id: 'c2', mergeData: rowB })]
    });
    const before = structuredClone(state);

    const plan = resolveDrop(state, templates, { kind: 'template', templateId: template.id }, { x: 0, y: 0 });
    expect(plan).toEqual({ kind: 'none' });

    applyDropPlan(state, templates, plan);
    expect(state).toEqual(before);
  });

  it('container templates (boards/mats) do not spawn piles — they become zones in a later ticket', () => {
    const template = cardTemplate({ id: 'tpl-board', isContainer: true });
    const templates = makeTemplates(template);
    const state = emptyTabletopState();

    const plan = resolveDrop(state, templates, { kind: 'template', templateId: 'tpl-board' }, { x: 0, y: 0 });
    expect(plan).toEqual({ kind: 'none' });
  });

  it('an unknown template resolves to a no-op', () => {
    const state = emptyTabletopState();
    const plan = resolveDrop(state, makeTemplates(), { kind: 'template', templateId: 'ghost' }, { x: 0, y: 0 });
    expect(plan).toEqual({ kind: 'none' });
  });
});

describe('getUnplacedInstances — dedup identity', () => {
  it('uses count identity for non-data-source templates (all-null instances)', () => {
    const template = cardTemplate({ instances: [null, null, null] });
    const state = stateWithPiles(singleCardPile('p1', 'c1'));
    state.cards.c1.templateId = template.id;

    expect(getUnplacedInstances(state, template)).toEqual([null, null]);
  });

  it('uses mergeData content identity for data-source templates, ignoring key order', () => {
    const template = cardTemplate({
      instances: [
        { Name: 'A', Cost: '1' },
        { Name: 'B', Cost: '2' }
      ]
    });
    const state = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1'] }),
      // Same row content as instance A, but with reversed key insertion order.
      cards: [makeCard({ id: 'c1', mergeData: { Cost: '1', Name: 'A' } })]
    });

    expect(getUnplacedInstances(state, template)).toEqual([{ Name: 'B', Cost: '2' }]);
  });

  it('duplicate rows (the "Num" field) share identity: one placed copy accounts for all duplicates', () => {
    // v1 behaviour carried over unchanged (see SPEC "Templates and capabilities").
    const template = cardTemplate({ instances: [rowA, rowA, rowB] });
    const state = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1'] }),
      cards: [makeCard({ id: 'c1', mergeData: rowA })]
    });

    expect(getUnplacedInstances(state, template)).toEqual([rowB]);
  });

  it('cards of other templates never count against a template\'s instances', () => {
    const template = cardTemplate({ id: 'tpl-x', instances: [null] });
    const state = stateWithPiles(singleCardPile('p1', 'c1')); // c1 is tpl-card

    expect(getUnplacedInstances(state, template)).toEqual([null]);
  });
});

describe('pile drops — merge precedence in the shared resolver', () => {
  // Standard card footprint is 127 × 177.8px, so piles at x=100 and x=600
  // don't overlap and pointer hits are unambiguous.
  const templates = makeTemplates(cardTemplate(), diceTemplate());

  it('a pile dropped with the pointer over another pile\'s footprint merges onto it', () => {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 600, 100)
    );

    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'p1' }, { x: 610, y: 120 });

    expect(plan).toEqual({ kind: 'merge-piles', sourcePileId: 'p1', targetPileId: 'p2' });
  });

  it('a pointer over empty table places the pile where it visually sits (its centre, not the pointer)', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));
    // Mid-drag the pile centre tracks the pointer minus the grab offset —
    // simulate a pile already moved to (300, 200) with the pointer nearby.
    state.piles.p1.x = 300;
    state.piles.p1.y = 200;

    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'p1' }, { x: 310, y: 215 });

    expect(plan).toEqual({ kind: 'place-pile', pileId: 'p1', x: 300, y: 200 });
  });

  it('the dropped pile itself never counts as a merge target', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));

    // Pointer dead-centre on the pile's own footprint.
    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'p1' }, { x: 100, y: 100 });

    expect(plan.kind).toBe('place-pile');
  });

  it('the topmost pile in render order wins when footprints overlap', () => {
    const state = stateWithPiles(
      singleCardPile('src', 'c0', 900, 100),
      singleCardPile('below', 'c1', 300, 100),
      singleCardPile('above', 'c2', 320, 100) // overlaps `below`, renders later
    );

    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'src' }, { x: 310, y: 100 });

    expect(plan).toEqual({ kind: 'merge-piles', sourcePileId: 'src', targetPileId: 'above' });
  });

  it('a locked target refuses the merge and the drop falls through to placement', () => {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 600, 100, { locked: true })
    );

    const plan = resolveDrop(state, templates, { kind: 'pile', pileId: 'p1' }, { x: 600, y: 100 });

    expect(plan).toEqual({ kind: 'place-pile', pileId: 'p1', x: 100, y: 100 });
  });

  it('dice merge with nothing: a card dropped on a die, and a die dropped on a card, both place', () => {
    const die = { pile: makePile({ id: 'die', cardIds: ['d1'], x: 600, y: 100 }), cards: [makeCard({ id: 'd1', templateId: 'tpl-dice' })] };

    const cardOnDie = stateWithPiles(singleCardPile('p1', 'c1', 100, 100), structuredClone(die));
    expect(resolveDrop(cardOnDie, templates, { kind: 'pile', pileId: 'p1' }, { x: 600, y: 100 }).kind).toBe('place-pile');

    const dieOnCard = stateWithPiles(singleCardPile('p1', 'c1', 100, 100), structuredClone(die));
    expect(resolveDrop(dieOnCard, templates, { kind: 'pile', pileId: 'die' }, { x: 100, y: 100 }).kind).toBe('place-pile');
  });

  it('an unknown pile payload resolves to a no-op', () => {
    const state = emptyTabletopState();
    expect(resolveDrop(state, templates, { kind: 'pile', pileId: 'ghost' }, { x: 0, y: 0 })).toEqual({ kind: 'none' });
  });

  it('applying a merge plan stacks the source on top and deletes it; normalize stays clean', () => {
    const state = stateWithPiles(
      {
        pile: makePile({ id: 'p1', cardIds: ['c1', 'c2'], x: 100, y: 100 }),
        cards: [makeCard({ id: 'c1' }), makeCard({ id: 'c2', rotation: 90, isFlipped: true })]
      },
      singleCardPile('p2', 'c3', 600, 100)
    );

    applyDropPlan(state, templates, { kind: 'merge-piles', sourcePileId: 'p1', targetPileId: 'p2' });
    normalize(state, templates, { dev: true });

    expect(state.piles.p1).toBeUndefined();
    expect(state.piles.p2.cardIds).toEqual(['c3', 'c1', 'c2']);
    // Each merged card keeps its own rotation and face state.
    expect(state.cards.c2).toMatchObject({ rotation: 90, isFlipped: true });
    expect(state.rootPileIds).toEqual(['p2']);
  });

  it('findPileAt is rotation-aware: a sideways card widens its own hitbox', () => {
    const state = stateWithPiles({
      pile: makePile({ id: 'p1', cardIds: ['c1'], x: 300, y: 300 }),
      cards: [makeCard({ id: 'c1', rotation: 90 })]
    });

    // 88.9mm tall card sideways: half-width becomes 88.9 ≈ 177.8px/2 from
    // centre. x=380 is inside the rotated footprint but outside the upright one.
    expect(findPileAt(state, templates, { x: 380, y: 300 })?.id).toBe('p1');

    state.cards.c1.rotation = 0;
    expect(findPileAt(state, templates, { x: 380, y: 300 })).toBeNull();
  });
});

describe('multi-pile drops — a selection through the shared resolver', () => {
  const templates = makeTemplates(cardTemplate(), diceTemplate());

  it('over empty table: every pile places at its own centre, in payload order', () => {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 400, 100)
    );

    const plan = resolveDrop(state, templates, { kind: 'piles', pileIds: ['p1', 'p2'] }, { x: 900, y: 900 });

    expect(plan).toEqual({
      kind: 'multi',
      plans: [
        { kind: 'place-pile', pileId: 'p1', x: 100, y: 100 },
        { kind: 'place-pile', pileId: 'p2', x: 400, y: 100 }
      ]
    });
  });

  it('over another pile: every mergeable pile merges into it, in payload order', () => {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1', 550, 100),
      singleCardPile('p2', 'c2', 650, 150),
      singleCardPile('target', 'c3', 600, 100)
    );

    const plan = resolveDrop(state, templates, { kind: 'piles', pileIds: ['p1', 'p2'] }, { x: 600, y: 100 });

    expect(plan).toEqual({
      kind: 'multi',
      plans: [
        { kind: 'merge-piles', sourcePileId: 'p1', targetPileId: 'target' },
        { kind: 'merge-piles', sourcePileId: 'p2', targetPileId: 'target' }
      ]
    });
  });

  it('dragged piles never count as merge targets for each other', () => {
    // Two overlapping selected piles released with the pointer over both.
    const state = stateWithPiles(
      singleCardPile('p1', 'c1', 100, 100),
      singleCardPile('p2', 'c2', 110, 100)
    );

    const plan = resolveDrop(state, templates, { kind: 'piles', pileIds: ['p1', 'p2'] }, { x: 105, y: 100 });

    expect(plan).toEqual({
      kind: 'multi',
      plans: [
        { kind: 'place-pile', pileId: 'p1', x: 100, y: 100 },
        { kind: 'place-pile', pileId: 'p2', x: 110, y: 100 }
      ]
    });
  });

  it('a locked pile under the pointer refuses the whole group: everything places', () => {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1', 550, 100),
      singleCardPile('p2', 'c2', 650, 150),
      singleCardPile('target', 'c3', 600, 100, { locked: true })
    );

    const plan = resolveDrop(state, templates, { kind: 'piles', pileIds: ['p1', 'p2'] }, { x: 600, y: 100 });

    expect(plan).toEqual({
      kind: 'multi',
      plans: [
        { kind: 'place-pile', pileId: 'p1', x: 550, y: 100 },
        { kind: 'place-pile', pileId: 'p2', x: 650, y: 150 }
      ]
    });
  });

  it('a mixed selection over a pile: cards merge, the die places where it sits', () => {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1', 560, 100),
      {
        pile: makePile({ id: 'die', cardIds: ['d1'], x: 700, y: 200 }),
        cards: [makeCard({ id: 'd1', templateId: 'tpl-dice' })]
      },
      singleCardPile('target', 'c3', 600, 100)
    );

    const plan = resolveDrop(state, templates, { kind: 'piles', pileIds: ['p1', 'die'] }, { x: 600, y: 100 });

    expect(plan).toEqual({
      kind: 'multi',
      plans: [
        { kind: 'merge-piles', sourcePileId: 'p1', targetPileId: 'target' },
        { kind: 'place-pile', pileId: 'die', x: 700, y: 200 }
      ]
    });
  });

  it('unknown ids are skipped; an all-ghost payload resolves to a no-op', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1', 100, 100));

    expect(resolveDrop(state, templates, { kind: 'piles', pileIds: ['ghost'] }, { x: 0, y: 0 })).toEqual({ kind: 'none' });
    expect(resolveDrop(state, templates, { kind: 'piles', pileIds: ['p1', 'ghost'] }, { x: 900, y: 900 })).toEqual({
      kind: 'multi',
      plans: [{ kind: 'place-pile', pileId: 'p1', x: 100, y: 100 }]
    });
  });

  it('applying a multi plan merges in order and normalize stays clean', () => {
    const state = stateWithPiles(
      singleCardPile('p1', 'c1', 550, 100),
      singleCardPile('p2', 'c2', 650, 150),
      singleCardPile('target', 'c3', 600, 100)
    );

    applyDropPlan(state, templates, {
      kind: 'multi',
      plans: [
        { kind: 'merge-piles', sourcePileId: 'p1', targetPileId: 'target' },
        { kind: 'merge-piles', sourcePileId: 'p2', targetPileId: 'target' }
      ]
    });
    normalize(state, templates, { dev: true });

    expect(state.piles.p1).toBeUndefined();
    expect(state.piles.p2).toBeUndefined();
    // Payload (selection) order becomes stacking order on the target.
    expect(state.piles.target.cardIds).toEqual(['c3', 'c1', 'c2']);
    expect(state.rootPileIds).toEqual(['target']);
  });
});

describe('removePile (the round-trip out)', () => {
  it('removes the pile and all of its cards from the table', () => {
    const templates = makeTemplates(cardTemplate());
    const state = stateWithPiles(
      {
        pile: makePile({ id: 'p1', cardIds: ['c1', 'c2'] }),
        cards: [makeCard({ id: 'c1' }), makeCard({ id: 'c2' })]
      },
      singleCardPile('p2', 'c3')
    );

    removePile(state, 'p1');
    normalize(state, templates, { dev: true });

    expect(state.piles.p1).toBeUndefined();
    expect(state.cards.c1).toBeUndefined();
    expect(state.cards.c2).toBeUndefined();
    expect(state.rootPileIds).toEqual(['p2']);
    expect(state.cards.c3).toBeDefined();
  });

  it('removing a placed pile makes its instances spawnable again', () => {
    const template = cardTemplate({ instances: [rowA, rowB] });
    const templates = makeTemplates(template);
    const state = emptyTabletopState();

    applyDropPlan(
      state,
      templates,
      resolveDrop(state, templates, { kind: 'template', templateId: template.id }, { x: 0, y: 0 })
    );
    removePile(state, state.rootPileIds[0]);

    expect(getUnplacedInstances(state, template)).toEqual([rowA, rowB]);
  });
});

describe('removeAllCardsOfTemplate (the sidebar remove-all)', () => {
  it('clears every card of the template and deletes piles left empty, keeping other templates', () => {
    const target = cardTemplate({ id: 'tpl-x', instances: [rowA, rowB] });
    const other = cardTemplate({ id: 'tpl-y' });
    const templates = makeTemplates(target, other);
    const state = stateWithPiles(
      {
        // Mixed pile: one card of each template.
        pile: makePile({ id: 'p1', cardIds: ['x1', 'y1'] }),
        cards: [
          makeCard({ id: 'x1', templateId: 'tpl-x', mergeData: rowA }),
          makeCard({ id: 'y1', templateId: 'tpl-y' })
        ]
      },
      {
        // Pure pile of the target template — should vanish entirely.
        pile: makePile({ id: 'p2', cardIds: ['x2'] }),
        cards: [makeCard({ id: 'x2', templateId: 'tpl-x', mergeData: rowB })]
      }
    );

    removeAllCardsOfTemplate(state, 'tpl-x');
    normalize(state, templates, { dev: true });

    expect(state.cards.x1).toBeUndefined();
    expect(state.cards.x2).toBeUndefined();
    expect(state.piles.p2).toBeUndefined();
    expect(state.piles.p1.cardIds).toEqual(['y1']);
    expect(state.rootPileIds).toEqual(['p1']);
    expect(getUnplacedInstances(state, target)).toEqual([rowA, rowB]);
  });

  it('is a no-op when nothing of the template is placed', () => {
    const state = stateWithPiles(singleCardPile('p1', 'c1'));
    const before = structuredClone(state);

    removeAllCardsOfTemplate(state, 'tpl-x');

    expect(state).toEqual(before);
  });
});
