import { describe, it, expect } from 'vitest';
import { applyDropPlan, resolveDrop } from './drop';
import { emptyTabletopState } from './initialization';
import { normalize } from './normalize';
import {
  getUnplacedInstances,
  removeAllCardsOfTemplate,
  removePile
} from './operations';
import { cardTemplate, makeCard, makePile, makeTemplates, singleCardPile, stateWithPiles } from './fixtures';

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
