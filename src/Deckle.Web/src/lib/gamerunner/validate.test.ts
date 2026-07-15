import { describe, it, expect } from 'vitest';
import { validateGameSetup } from './validate';
import type { ProjectContext } from './types';

const projectContext: ProjectContext = {
	components: [
		{ id: 'card-1', name: 'Card One', type: 'Card' },
		{ id: 'card-2', name: 'Card Two', type: 'Card' },
		{ id: 'die-1', name: 'Die', type: 'Dice' }
	]
};

/** A fresh, fully valid setup document. Tests mutate a clone of this. */
function baseDoc(): Record<string, unknown> {
	return structuredClone({
		version: 1,
		minPlayers: 1,
		maxPlayers: 4,
		options: [
			{ id: 'advanced', type: 'boolean', label: 'Advanced', default: false },
			{ id: 'rounds', type: 'number', label: 'Rounds', default: 3, min: 1, max: 10 },
			{ id: 'variant', type: 'select', label: 'Variant', choices: ['a', 'b'], default: 'a' }
		],
		blueprints: [
			{ id: 'main-deck', scope: 'table', role: 'Main Deck', faceVisibility: 'none', presence: 'visible' },
			{
				id: 'hand',
				scope: 'seat',
				role: 'Hand',
				faceVisibility: 'owner',
				presence: 'hidden-from-non-owners'
			},
			{ id: 'river', scope: 'edge', role: 'River', faceVisibility: 'all', presence: 'visible' }
		],
		setup: [
			{ do: 'placeZone', blueprint: 'main-deck' },
			{ do: 'placeSeats', blueprint: 'hand' },
			{ do: 'placeZone', blueprint: 'river', edge: { kind: 'each' } },
			{ do: 'place', component: 'card-1', zone: { blueprint: 'main-deck' }, facing: 'down', count: 52 },
			{ do: 'shuffle', zone: { blueprint: 'main-deck' } },
			{
				do: 'deal',
				count: 2,
				from: { blueprint: 'main-deck' },
				to: { blueprint: 'hand', seat: { kind: 'each' } },
				facing: 'down'
			},
			{
				when: { op: 'gte', left: { get: 'playerCount' }, right: { const: 4 } },
				then: [{ do: 'place', component: 'card-2', zone: { blueprint: 'main-deck' } }]
			},
			{
				forEachSeat: {
					body: [{ do: 'flip', zone: { blueprint: 'hand', seat: { kind: 'current' } }, facing: 'up' }]
				}
			},
			{ do: 'roll', component: 'die-1' }
		]
	});
}

function validate(doc: unknown) {
	return validateGameSetup(doc, projectContext);
}

/** Assert exactly one error, anchored at the given docPath. */
function expectSingleError(doc: unknown, docPath: string) {
	const errors = validate(doc);
	expect(errors).toHaveLength(1);
	expect(errors[0].docPath).toBe(docPath);
	return errors[0];
}

describe('validateGameSetup — valid documents', () => {
	it('accepts a fully valid document', () => {
		expect(validate(baseDoc())).toEqual([]);
	});

	it('accepts a minimal empty program', () => {
		expect(
			validate({
				version: 1,
				minPlayers: 1,
				maxPlayers: 1,
				options: [],
				blueprints: [],
				setup: []
			})
		).toEqual([]);
	});

	it('ignores reserved full-rules keys', () => {
		const doc = baseDoc();
		doc.phases = { anything: true };
		doc.moves = [];
		doc.end = { winner: 'x' };
		expect(validate(doc)).toEqual([]);
	});
});

describe('validateGameSetup — structure', () => {
	it('rejects a non-object document', () => {
		expect(validate(null)[0].docPath).toBe('');
		expect(validate([])[0].docPath).toBe('');
		expect(validate('nope')[0].docPath).toBe('');
	});

	it('requires a positive integer version', () => {
		const doc = baseDoc();
		doc.version = 0;
		expectSingleError(doc, 'version');
	});

	it('rejects a version above the supported ceiling', () => {
		const doc = baseDoc();
		doc.version = 999;
		expectSingleError(doc, 'version');
	});

	it('requires minPlayers >= 1', () => {
		const doc = baseDoc();
		doc.minPlayers = 0;
		expectSingleError(doc, 'minPlayers');
	});

	it('requires maxPlayers >= minPlayers', () => {
		const doc = baseDoc();
		doc.minPlayers = 5;
		doc.maxPlayers = 3;
		expectSingleError(doc, 'maxPlayers');
	});

	it('requires options to be an array', () => {
		const doc = baseDoc();
		doc.options = {};
		expectSingleError(doc, 'options');
	});

	it('requires blueprints to be an array', () => {
		const doc = baseDoc();
		doc.blueprints = 'nope';
		// Setup references now-unknown blueprints too, so just assert the blueprint error is present.
		const errors = validate(doc);
		expect(errors.some((e) => e.docPath === 'blueprints')).toBe(true);
	});

	it('requires setup to be an array', () => {
		const doc = baseDoc();
		doc.setup = {};
		expectSingleError(doc, 'setup');
	});

	it('rejects an unknown node kind', () => {
		const doc = baseDoc();
		doc.setup = [{ nonsense: true }];
		expectSingleError(doc, 'setup[0]');
	});

	it('rejects an unknown verb', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'teleport' }];
		expectSingleError(doc, 'setup[0].do');
	});

	it('rejects a bad facing', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'flip', zone: { blueprint: 'main-deck' }, facing: 'sideways' }];
		expectSingleError(doc, 'setup[0].facing');
	});

	it('requires facing on flip', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'flip', zone: { blueprint: 'main-deck' } }];
		expectSingleError(doc, 'setup[0].facing');
	});

	it('rejects a non-positive count on place', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'place', component: 'card-1', zone: { blueprint: 'main-deck' }, count: 0 }];
		expectSingleError(doc, 'setup[0].count');
	});
});

describe('validateGameSetup — option structure', () => {
	it('rejects duplicate option ids', () => {
		const doc = baseDoc();
		doc.options = [
			{ id: 'x', type: 'boolean', label: 'X', default: false },
			{ id: 'x', type: 'boolean', label: 'X2', default: true }
		];
		expectSingleError(doc, 'options[1].id');
	});

	it('rejects a boolean option with a non-boolean default', () => {
		const doc = baseDoc();
		doc.options = [{ id: 'x', type: 'boolean', label: 'X', default: 'yes' }];
		expectSingleError(doc, 'options[0].default');
	});

	it('rejects a number option default outside min/max', () => {
		const doc = baseDoc();
		doc.options = [{ id: 'x', type: 'number', label: 'X', default: 20, min: 1, max: 10 }];
		expectSingleError(doc, 'options[0].default');
	});

	it('rejects a select option default not in choices', () => {
		const doc = baseDoc();
		doc.options = [{ id: 'x', type: 'select', label: 'X', choices: ['a', 'b'], default: 'c' }];
		expectSingleError(doc, 'options[0].default');
	});

	it('rejects an unknown option type', () => {
		const doc = baseDoc();
		doc.options = [{ id: 'x', type: 'color', label: 'X', default: 'red' }];
		expectSingleError(doc, 'options[0].type');
	});
});

describe('validateGameSetup — blueprint structure', () => {
	it('rejects duplicate blueprint ids', () => {
		const doc = baseDoc();
		doc.blueprints = [
			{ id: 'z', scope: 'table', role: 'A', faceVisibility: 'all', presence: 'visible' },
			{ id: 'z', scope: 'table', role: 'B', faceVisibility: 'all', presence: 'visible' }
		];
		doc.setup = [];
		expectSingleError(doc, 'blueprints[1].id');
	});

	it('rejects duplicate blueprint roles', () => {
		const doc = baseDoc();
		doc.blueprints = [
			{ id: 'a', scope: 'table', role: 'Same', faceVisibility: 'all', presence: 'visible' },
			{ id: 'b', scope: 'table', role: 'Same', faceVisibility: 'all', presence: 'visible' }
		];
		doc.setup = [];
		expectSingleError(doc, 'blueprints[1].role');
	});

	it('rejects an invalid scope', () => {
		const doc = baseDoc();
		doc.blueprints = [
			{ id: 'a', scope: 'floor', role: 'A', faceVisibility: 'all', presence: 'visible' }
		];
		doc.setup = [];
		expectSingleError(doc, 'blueprints[0].scope');
	});

	it('rejects an invalid faceVisibility', () => {
		const doc = baseDoc();
		doc.blueprints = [
			{ id: 'a', scope: 'table', role: 'A', faceVisibility: 'sometimes', presence: 'visible' }
		];
		doc.setup = [];
		expectSingleError(doc, 'blueprints[0].faceVisibility');
	});
});

describe('validateGameSetup — referential integrity', () => {
	it('rejects an unknown component id on place', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'place', component: 'ghost', zone: { blueprint: 'main-deck' } }];
		expectSingleError(doc, 'setup[0].component');
	});

	it('rejects a non-Dice component on roll', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'roll', component: 'card-1' }];
		expectSingleError(doc, 'setup[0].component');
	});

	it('rejects an unknown blueprint on a zone reference', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'shuffle', zone: { blueprint: 'nope' } }];
		expectSingleError(doc, 'setup[0].zone.blueprint');
	});

	it('rejects an unknown option in a get expression', () => {
		const doc = baseDoc();
		doc.setup = [
			{
				when: { op: 'eq', left: { get: 'option', option: 'ghost' }, right: { const: true } },
				then: []
			}
		];
		expectSingleError(doc, 'setup[0].when.left.option');
	});

	it('rejects placeSeats against a non-seat blueprint', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'placeSeats', blueprint: 'main-deck' }];
		expectSingleError(doc, 'setup[0].blueprint');
	});

	it('rejects placeZone against a seat blueprint', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'placeZone', blueprint: 'hand' }];
		expectSingleError(doc, 'setup[0].blueprint');
	});
});

describe('validateGameSetup — zone selectors', () => {
	it('requires a seat selector on a seat-scoped zone', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'shuffle', zone: { blueprint: 'hand' } }];
		expectSingleError(doc, 'setup[0].zone.seat');
	});

	it('rejects an edge selector on a seat-scoped zone', () => {
		const doc = baseDoc();
		doc.setup = [
			{ do: 'shuffle', zone: { blueprint: 'hand', seat: { kind: 'each' }, edge: { kind: 'each' } } }
		];
		expectSingleError(doc, 'setup[0].zone.edge');
	});

	it('rejects a seat selector on a table-scoped zone', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'shuffle', zone: { blueprint: 'main-deck', seat: { kind: 'each' } } }];
		expectSingleError(doc, 'setup[0].zone.seat');
	});

	it('requires an edge selector on an edge-scoped zone', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'shuffle', zone: { blueprint: 'river' } }];
		expectSingleError(doc, 'setup[0].zone.edge');
	});

	it('rejects seat "current" outside a forEachSeat loop', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'shuffle', zone: { blueprint: 'hand', seat: { kind: 'current' } } }];
		expectSingleError(doc, 'setup[0].zone.seat');
	});

	it('accepts seat "current" inside a forEachSeat loop', () => {
		const doc = baseDoc();
		doc.setup = [
			{
				forEachSeat: {
					body: [{ do: 'shuffle', zone: { blueprint: 'hand', seat: { kind: 'current' } } }]
				}
			}
		];
		expect(validate(doc)).toEqual([]);
	});

	it('rejects a negative seat index', () => {
		const doc = baseDoc();
		doc.setup = [{ do: 'shuffle', zone: { blueprint: 'hand', seat: { kind: 'index', index: -1 } } }];
		expectSingleError(doc, 'setup[0].zone.seat.index');
	});
});

describe('validateGameSetup — condition type checking', () => {
	it('rejects comparing a number with a string', () => {
		const doc = baseDoc();
		doc.setup = [
			{
				when: { op: 'eq', left: { get: 'playerCount' }, right: { const: 'four' } },
				then: []
			}
		];
		expectSingleError(doc, 'setup[0].when');
	});

	it('rejects ordering comparison on a boolean option', () => {
		const doc = baseDoc();
		doc.setup = [
			{
				when: { op: 'gt', left: { get: 'option', option: 'advanced' }, right: { const: false } },
				then: []
			}
		];
		expectSingleError(doc, 'setup[0].when.op');
	});

	it('accepts ordering comparison on playerCount vs count(zone)', () => {
		const doc = baseDoc();
		doc.setup = [
			{
				when: {
					op: 'lte',
					left: { get: 'playerCount' },
					right: { get: 'count', zone: { blueprint: 'main-deck' } }
				},
				then: []
			}
		];
		expect(validate(doc)).toEqual([]);
	});

	it('validates zone refs inside count() expressions', () => {
		const doc = baseDoc();
		doc.setup = [
			{
				when: {
					op: 'gte',
					left: { get: 'count', zone: { blueprint: 'ghost' } },
					right: { const: 1 }
				},
				then: []
			}
		];
		expectSingleError(doc, 'setup[0].when.left.zone.blueprint');
	});

	it('rejects a malformed value expression', () => {
		const doc = baseDoc();
		doc.setup = [
			{ when: { op: 'eq', left: { wat: 1 }, right: { const: 1 } }, then: [] }
		];
		expectSingleError(doc, 'setup[0].when.left');
	});

	it('rejects a non-comparison condition body', () => {
		const doc = baseDoc();
		doc.setup = [{ when: { nonsense: true }, then: [] }];
		expectSingleError(doc, 'setup[0].when');
	});

	it('recurses into all/any/not combinators', () => {
		const doc = baseDoc();
		doc.setup = [
			{
				when: {
					all: [{ any: [{ not: { op: 'eq', left: { get: 'playerCount' }, right: { const: 'x' } } }] }]
				},
				then: []
			}
		];
		expectSingleError(doc, 'setup[0].when.all[0].any[0].not');
	});
});

describe('validateGameSetup — deal count expressions', () => {
	it('accepts a numeric literal count', () => {
		const doc = baseDoc();
		doc.setup = [
			{ do: 'deal', count: 5, from: { blueprint: 'main-deck' }, to: { blueprint: 'main-deck' } }
		];
		expect(validate(doc)).toEqual([]);
	});

	it('accepts a numeric value expression count', () => {
		const doc = baseDoc();
		doc.setup = [
			{
				do: 'deal',
				count: { get: 'option', option: 'rounds' },
				from: { blueprint: 'main-deck' },
				to: { blueprint: 'main-deck' }
			}
		];
		expect(validate(doc)).toEqual([]);
	});

	it('rejects a non-numeric value expression count', () => {
		const doc = baseDoc();
		doc.setup = [
			{
				do: 'deal',
				count: { get: 'option', option: 'variant' },
				from: { blueprint: 'main-deck' },
				to: { blueprint: 'main-deck' }
			}
		];
		expectSingleError(doc, 'setup[0].count');
	});
});
