import { describe, it, expect } from 'vitest';
import {
	createNode,
	insertStep,
	appendStep,
	deleteStep,
	moveStep,
	moveStepBy,
	changeVerb,
	setSlotValue,
	computeIsValid,
	zoneOptions,
	zoneRefKey,
	isAction,
	isWhenNode,
	isForEachSeatNode
} from './edit';
import type { GameSetup, ProjectContext, SetupNode, DealAction } from './types';

const projectContext: ProjectContext = {
	components: [{ id: 'card-1', name: 'Card One', type: 'Card' }]
};

function validDoc(): GameSetup {
	return structuredClone({
		version: 1,
		minPlayers: 1,
		maxPlayers: 4,
		options: [],
		blueprints: [
			{
				id: 'deck',
				scope: 'table',
				displayName: 'Main Deck',
				zones: [
					{
						id: 'z1',
						role: 'Draw',
						name: 'Draw pile',
						geometry: { type: 'freeform', rect: { x: 0, y: 0, width: 100, height: 100 } },
						faceVisibility: 'none',
						presence: 'visible'
					}
				]
			},
			{
				id: 'hand',
				scope: 'seat',
				displayName: 'Player Hand',
				zones: [
					{
						id: 'z2',
						role: 'Hand',
						name: 'Hand',
						geometry: { type: 'spread', rect: { x: 0, y: 0, width: 100, height: 100 } },
						faceVisibility: 'owner',
						presence: 'visible'
					}
				]
			}
		],
		setup: [{ do: 'shuffle', zone: { blueprint: 'deck', role: 'Draw' } }]
	}) as GameSetup;
}

describe('createNode', () => {
	it('builds each verb with a matching do tag', () => {
		expect(createNode('placeSeats')).toMatchObject({ do: 'placeSeats' });
		expect(createNode('deal')).toMatchObject({ do: 'deal', count: 1, facing: 'down' });
		expect(createNode('roll')).toMatchObject({ do: 'roll', component: '' });
	});

	it('builds a when node with a default comparison and empty then', () => {
		const node = createNode('when');
		expect(isWhenNode(node)).toBe(true);
		if (isWhenNode(node)) {
			expect(node.then).toEqual([]);
			expect(node.when).toEqual({ op: 'eq', left: { get: 'playerCount' }, right: { const: 2 } });
		}
	});

	it('builds a forEachSeat node with an empty body', () => {
		const node = createNode('forEachSeat');
		expect(isForEachSeatNode(node)).toBe(true);
		if (isForEachSeatNode(node)) expect(node.forEachSeat.body).toEqual([]);
	});

	it('gives reference verbs empty (unresolved) refs so validation flags them', () => {
		const node = createNode('deal') as DealAction;
		expect(node.from).toEqual({ blueprint: '', role: '' });
		expect(node.to).toEqual({ blueprint: '', role: '' });
	});
});

describe('insert / append / delete', () => {
	it('appends to the end', () => {
		const list: SetupNode[] = [];
		appendStep(list, createNode('shuffle'));
		appendStep(list, createNode('deal'));
		expect(list.map((n) => (isAction(n) ? n.do : '')).join(',')).toBe('shuffle,deal');
	});

	it('inserts between steps at an index', () => {
		const list = [createNode('shuffle'), createNode('deal')];
		insertStep(list, 1, createNode('flip'));
		expect(list.map((n) => (isAction(n) ? n.do : ''))).toEqual(['shuffle', 'flip', 'deal']);
	});

	it('clamps an out-of-range insert index', () => {
		const list = [createNode('shuffle')];
		insertStep(list, 99, createNode('deal'));
		expect(list.length).toBe(2);
		expect(isAction(list[1]) && list[1].do).toBe('deal');
	});

	it('deletes a step by index and ignores out-of-range', () => {
		const list = [createNode('shuffle'), createNode('deal'), createNode('flip')];
		deleteStep(list, 1);
		expect(list.map((n) => (isAction(n) ? n.do : ''))).toEqual(['shuffle', 'flip']);
		deleteStep(list, 42);
		expect(list.length).toBe(2);
	});
});

describe('moveStep / moveStepBy', () => {
	it('moves a step forward, interpreting to as post-removal index', () => {
		const list = [createNode('shuffle'), createNode('deal'), createNode('flip')];
		moveStep(list, 0, 2);
		expect(list.map((n) => (isAction(n) ? n.do : ''))).toEqual(['deal', 'flip', 'shuffle']);
	});

	it('moves a step backward', () => {
		const list = [createNode('shuffle'), createNode('deal'), createNode('flip')];
		moveStep(list, 2, 0);
		expect(list.map((n) => (isAction(n) ? n.do : ''))).toEqual(['flip', 'shuffle', 'deal']);
	});

	it('is a no-op for same position or out-of-range', () => {
		const list = [createNode('shuffle'), createNode('deal')];
		moveStep(list, 0, 0);
		moveStep(list, 5, 0);
		expect(list.map((n) => (isAction(n) ? n.do : ''))).toEqual(['shuffle', 'deal']);
	});

	it('moveStepBy shifts up and down and clamps at the ends', () => {
		const list = [createNode('shuffle'), createNode('deal'), createNode('flip')];
		moveStepBy(list, 1, -1);
		expect(list.map((n) => (isAction(n) ? n.do : ''))).toEqual(['deal', 'shuffle', 'flip']);
		moveStepBy(list, 0, -1); // already at top -> no-op
		expect(isAction(list[0]) && list[0].do).toBe('deal');
	});
});

describe('changeVerb', () => {
	it('replaces the action in place with a fresh default of the new verb', () => {
		const list = [createNode('shuffle')];
		changeVerb(list, 0, 'deal');
		expect(isAction(list[0]) && list[0].do).toBe('deal');
		expect(list[0]).toMatchObject({ count: 1 });
	});

	it('ignores an out-of-range index', () => {
		const list = [createNode('shuffle')];
		changeVerb(list, 3, 'deal');
		expect(isAction(list[0]) && list[0].do).toBe('shuffle');
	});
});

describe('setSlotValue', () => {
	it('writes a single key on the holder', () => {
		const node = createNode('deal') as DealAction;
		setSlotValue(node, 'facing', 'up');
		expect(node.facing).toBe('up');
	});
});

describe('computeIsValid', () => {
	it('is true for a fully valid document', () => {
		expect(computeIsValid(validDoc(), projectContext)).toBe(true);
	});

	it('is false when a step references an unknown blueprint', () => {
		const doc = validDoc();
		doc.setup.push({ do: 'shuffle', zone: { blueprint: 'nope', role: 'x' } });
		expect(computeIsValid(doc, projectContext)).toBe(false);
	});
});

describe('zoneOptions / zoneRefKey', () => {
	it('produces one option per (blueprint, role) with scope-appropriate selectors', () => {
		const opts = zoneOptions(validDoc(), false);
		expect(opts.map((o) => o.key)).toEqual(['deck::Draw', 'hand::Hand']);
		const seatOpt = opts.find((o) => o.key === 'hand::Hand');
		expect(seatOpt?.ref.seat).toEqual({ kind: 'each' });
	});

	it('resolves seat zones to the loop seat when inside a forEachSeat', () => {
		const opts = zoneOptions(validDoc(), true);
		const seatOpt = opts.find((o) => o.key === 'hand::Hand');
		expect(seatOpt?.ref.seat).toEqual({ kind: 'current' });
	});

	it('keys a ref by blueprint::role and empty for unresolved refs', () => {
		expect(zoneRefKey({ blueprint: 'deck', role: 'Draw' })).toBe('deck::Draw');
		expect(zoneRefKey({ blueprint: '', role: '' })).toBe('');
		expect(zoneRefKey(undefined)).toBe('');
	});
});
