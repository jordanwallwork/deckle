import { describe, it, expect } from 'vitest';
import { runSetup, type RunSetupInput, type RunSetupResult, type RunSetupSuccess } from './interpreter';
import type { Blueprint, GameSetup, SetupNode } from './types';
import type { Template, Templates, TabletopState } from '../tabletop/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CARD_COUNT = 24;

function cardTemplate(): Template {
	return {
		id: 'cards',
		name: 'Cards',
		widthMm: 63,
		heightMm: 88,
		widthPx: 300,
		heightPx: 420,
		mergeable: true,
		isContainer: false,
		flippable: true,
		instances: Array.from({ length: CARD_COUNT }, (_, i) => ({ rank: String(i + 1) }))
	};
}

function diceTemplate(): Template {
	return {
		id: 'dice',
		name: 'Dice',
		widthMm: 16,
		heightMm: 16,
		widthPx: 100,
		heightPx: 100,
		mergeable: false,
		isContainer: false,
		flippable: false,
		faces: 6,
		instances: [null, null]
	};
}

function templates(): Templates {
	return { cards: cardTemplate(), dice: diceTemplate() };
}

function tableBlueprint(): Blueprint {
	return {
		id: 'board',
		scope: 'table',
		displayName: 'Board',
		zones: [
			{
				id: 'deck',
				role: 'Deck',
				name: 'Deck',
				geometry: { type: 'freeform', rect: { x: 0, y: 0, width: 150, height: 200 } },
				faceVisibility: 'none',
				presence: 'visible'
			},
			{
				id: 'discard',
				role: 'Discard',
				name: 'Discard',
				geometry: { type: 'freeform', rect: { x: 200, y: 0, width: 150, height: 200 } },
				faceVisibility: 'all',
				presence: 'visible'
			}
		]
	};
}

function seatBlueprint(): Blueprint {
	return {
		id: 'seat-area',
		scope: 'seat',
		displayName: 'Seat Area',
		zones: [
			{
				id: 'hand',
				role: 'Hand',
				name: 'Hand',
				geometry: {
					type: 'spread',
					rect: { x: 0, y: 0, width: 400, height: 200 },
					spread: { direction: 'row', overlap: 40 }
				},
				faceVisibility: 'owner',
				presence: 'hidden-from-non-owners'
			}
		]
	};
}

function edgeBlueprint(): Blueprint {
	return {
		id: 'rivers',
		scope: 'edge',
		displayName: 'Rivers',
		zones: [
			{
				id: 'river',
				role: 'River',
				name: 'River',
				geometry: { type: 'spread', rect: { x: 0, y: 0, width: 400, height: 150 } },
				faceVisibility: 'all',
				presence: 'visible'
			}
		]
	};
}

function doc(setup: SetupNode[], extraBlueprints: Blueprint[] = []): GameSetup {
	return {
		version: 1,
		minPlayers: 1,
		maxPlayers: 8,
		options: [],
		blueprints: [tableBlueprint(), seatBlueprint(), ...extraBlueprints],
		setup
	};
}

function run(setup: SetupNode[], overrides: Partial<RunSetupInput> = {}, extraBlueprints: Blueprint[] = []) {
	return runSetup(doc(setup, extraBlueprints), {
		playerCount: 2,
		options: {},
		seed: 1,
		templates: templates(),
		...overrides
	});
}

function expectOk(result: RunSetupResult): RunSetupSuccess {
	if (!result.ok) throw new Error(`Expected success but got error: ${result.error.kind} — ${result.error.message}`);
	return result;
}

function cardsInZone(state: TabletopState, zoneId: string): string[] {
	const zone = state.zones[zoneId];
	return zone.pileIds.flatMap((id) => state.piles[id].cardIds);
}

// Common preamble: place seats, board, and a face-down shuffled deck.
function withDeck(...rest: SetupNode[]): SetupNode[] {
	return [
		{ do: 'placeSeats', blueprint: 'seat-area' },
		{ do: 'placeZone', blueprint: 'board' },
		{ do: 'place', component: 'cards', zone: { blueprint: 'board', role: 'Deck' } },
		...rest
	];
}

// ---------------------------------------------------------------------------
// Zone placement
// ---------------------------------------------------------------------------

describe('placeSeats / placeZone', () => {
	it('stamps a seat blueprint once per seat with correct ownership', () => {
		for (const playerCount of [1, 2, 4, 8]) {
			const { state, visibility } = expectOk(
				run([{ do: 'placeSeats', blueprint: 'seat-area' }], { playerCount })
			);
			for (let seat = 0; seat < playerCount; seat++) {
				const id = `seat-area:hand:seat${seat}`;
				expect(state.zones[id]).toBeDefined();
				expect(state.zones[id].type).toBe('spread');
				expect(visibility[id].ownerSeat).toBe(seat);
				expect(visibility[id].faceVisibility).toBe('owner');
				expect(visibility[id].presence).toBe('hidden-from-non-owners');
			}
			expect(state.zoneOrder).toHaveLength(playerCount);
		}
	});

	it('stamps a table blueprint once, unowned', () => {
		const { state, visibility } = expectOk(run([{ do: 'placeZone', blueprint: 'board' }]));
		expect(state.zones['board:deck']).toBeDefined();
		expect(state.zones['board:discard']).toBeDefined();
		expect(visibility['board:deck'].ownerSeat).toBeUndefined();
	});

	it('stamps an edge blueprint per edge for an "each" selector', () => {
		const { state } = expectOk(
			run([{ do: 'placeZone', blueprint: 'rivers', edge: { kind: 'each' } }], { playerCount: 4 }, [
				edgeBlueprint()
			])
		);
		for (let edge = 0; edge < 4; edge++) {
			expect(state.zones[`rivers:river:edge${edge}`]).toBeDefined();
		}
	});
});

// ---------------------------------------------------------------------------
// place
// ---------------------------------------------------------------------------

describe('place', () => {
	it('spawns a deck as one face-down pile of all instances', () => {
		const { state } = expectOk(run(withDeck()));
		const deck = state.zones['board:deck'];
		expect(deck.pileIds).toHaveLength(1);
		const cards = cardsInZone(state, 'board:deck');
		expect(cards).toHaveLength(CARD_COUNT);
		expect(cards.every((id) => state.cards[id].isFlipped)).toBe(true);
	});

	it('honours an explicit facing and count', () => {
		const { state } = expectOk(
			run([
				{ do: 'placeZone', blueprint: 'board' },
				{ do: 'place', component: 'cards', zone: { blueprint: 'board', role: 'Deck' }, facing: 'up', count: 2 }
			])
		);
		expect(state.zones['board:deck'].pileIds).toHaveLength(2);
		expect(cardsInZone(state, 'board:deck').every((id) => !state.cards[id].isFlipped)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// shuffle & determinism
// ---------------------------------------------------------------------------

describe('shuffle', () => {
	it('permutes the deck deterministically for a given seed', () => {
		const a = expectOk(run(withDeck({ do: 'shuffle', zone: { blueprint: 'board', role: 'Deck' } }), { seed: 7 }));
		const b = expectOk(run(withDeck({ do: 'shuffle', zone: { blueprint: 'board', role: 'Deck' } }), { seed: 7 }));
		expect(cardsInZone(b.state, 'board:deck')).toEqual(cardsInZone(a.state, 'board:deck'));
		// Trace records the resulting order.
		const step = a.trace.find((s) => s.verb === 'shuffle');
		expect(step && step.verb === 'shuffle' && step.orders['board:deck']).toEqual(
			cardsInZone(a.state, 'board:deck')
		);
	});

	it('generally deals a different order for a different seed', () => {
		const a = expectOk(run(withDeck({ do: 'shuffle', zone: { blueprint: 'board', role: 'Deck' } }), { seed: 1 }));
		const b = expectOk(run(withDeck({ do: 'shuffle', zone: { blueprint: 'board', role: 'Deck' } }), { seed: 2 }));
		expect(cardsInZone(b.state, 'board:deck')).not.toEqual(cardsInZone(a.state, 'board:deck'));
	});

	it('preserves the multiset of cards when shuffling', () => {
		const { state } = expectOk(run(withDeck({ do: 'shuffle', zone: { blueprint: 'board', role: 'Deck' } })));
		expect(new Set(cardsInZone(state, 'board:deck')).size).toBe(CARD_COUNT);
	});
});

// ---------------------------------------------------------------------------
// deal (parametric across player counts)
// ---------------------------------------------------------------------------

describe('deal', () => {
	for (const playerCount of [1, 2, 4, 8]) {
		it(`deals to every seat and drains the deck (playerCount=${playerCount})`, () => {
			const setup = withDeck(
				{ do: 'shuffle', zone: { blueprint: 'board', role: 'Deck' } },
				{
					do: 'deal',
					count: 2,
					from: { blueprint: 'board', role: 'Deck' },
					to: { blueprint: 'seat-area', role: 'Hand', seat: { kind: 'each' } },
					facing: 'up'
				}
			);
			const { state } = expectOk(run(setup, { playerCount }));

			for (let seat = 0; seat < playerCount; seat++) {
				const hand = cardsInZone(state, `seat-area:hand:seat${seat}`);
				expect(hand).toHaveLength(2);
				expect(hand.every((id) => !state.cards[id].isFlipped)).toBe(true); // dealt face up
			}
			expect(cardsInZone(state, 'board:deck')).toHaveLength(CARD_COUNT - 2 * playerCount);
			// No card exists in two places at once.
			const dealt = Array.from({ length: playerCount }, (_, s) =>
				cardsInZone(state, `seat-area:hand:seat${s}`)
			).flat();
			expect(new Set(dealt).size).toBe(dealt.length);
		});
	}

	it('supports a numeric value-expression count', () => {
		// A `current`-seat deal wrapped in a forEachSeat, with a value-expr count.
		const wrapped: SetupNode[] = [
			...withDeck(),
			{
				forEachSeat: {
					body: [
						{
							do: 'deal',
							count: { get: 'playerCount' },
							from: { blueprint: 'board', role: 'Deck' },
							to: { blueprint: 'seat-area', role: 'Hand', seat: { kind: 'current' } }
						}
					]
				}
			}
		];
		const { state } = expectOk(run(wrapped, { playerCount: 2 }));
		// Each of 2 seats gets playerCount (=2) cards.
		expect(cardsInZone(state, 'seat-area:hand:seat0')).toHaveLength(2);
		expect(cardsInZone(state, 'seat-area:hand:seat1')).toHaveLength(2);
	});

	it('fails fast with insufficient-cards when the deck runs out', () => {
		const setup = withDeck({
			do: 'deal',
			count: 100,
			from: { blueprint: 'board', role: 'Deck' },
			to: { blueprint: 'seat-area', role: 'Hand', seat: { kind: 'each' } }
		});
		const result = run(setup, { playerCount: 2 });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.kind).toBe('insufficient-cards');
	});
});

// ---------------------------------------------------------------------------
// move & flip
// ---------------------------------------------------------------------------

describe('move', () => {
	it('moves all cards from the deck to the discard', () => {
		const setup = withDeck({
			do: 'move',
			from: { blueprint: 'board', role: 'Deck' },
			to: { blueprint: 'board', role: 'Discard' }
		});
		const { state } = expectOk(run(setup));
		expect(cardsInZone(state, 'board:deck')).toHaveLength(0);
		expect(cardsInZone(state, 'board:discard')).toHaveLength(CARD_COUNT);
		expect(state.zones['board:deck'].pileIds).toHaveLength(0);
	});

	it('moves a bounded count', () => {
		const setup = withDeck({
			do: 'move',
			count: 3,
			from: { blueprint: 'board', role: 'Deck' },
			to: { blueprint: 'board', role: 'Discard' }
		});
		const { state } = expectOk(run(setup));
		expect(cardsInZone(state, 'board:deck')).toHaveLength(CARD_COUNT - 3);
		expect(cardsInZone(state, 'board:discard')).toHaveLength(3);
	});
});

describe('flip', () => {
	it('sets every card in a zone to a facing idempotently', () => {
		const setup = withDeck(
			{ do: 'move', from: { blueprint: 'board', role: 'Deck' }, to: { blueprint: 'board', role: 'Discard' } },
			{ do: 'flip', zone: { blueprint: 'board', role: 'Discard' }, facing: 'up' }
		);
		const { state } = expectOk(run(setup));
		expect(cardsInZone(state, 'board:discard').every((id) => !state.cards[id].isFlipped)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// roll
// ---------------------------------------------------------------------------

describe('roll', () => {
	it('spawns and rolls dice deterministically', () => {
		const setup: SetupNode[] = [
			{ do: 'placeZone', blueprint: 'board' },
			{ do: 'roll', component: 'dice', zone: { blueprint: 'board', role: 'Discard' } }
		];
		const a = expectOk(run(setup, { seed: 3 }));
		const b = expectOk(run(setup, { seed: 3 }));
		const rollStepA = a.trace.find((s) => s.verb === 'roll');
		expect(rollStepA && rollStepA.verb === 'roll' && rollStepA.rolls).toHaveLength(2);
		if (rollStepA && rollStepA.verb === 'roll') {
			for (const r of rollStepA.rolls) {
				expect(r.value).toBeGreaterThanOrEqual(1);
				expect(r.value).toBeLessThanOrEqual(6);
			}
		}
		// Determinism: identical dice values for the same seed.
		expect(JSON.stringify(b.state.cards)).toEqual(JSON.stringify(a.state.cards));
	});
});

// ---------------------------------------------------------------------------
// Conditions: when / forEachSeat
// ---------------------------------------------------------------------------

describe('conditions', () => {
	it('takes the then branch when the condition holds', () => {
		const setup: SetupNode[] = [
			{ do: 'placeZone', blueprint: 'board' },
			{
				when: { op: 'gte', left: { get: 'playerCount' }, right: { const: 2 } },
				then: [{ do: 'place', component: 'cards', zone: { blueprint: 'board', role: 'Deck' } }],
				else: [{ do: 'place', component: 'cards', zone: { blueprint: 'board', role: 'Discard' } }]
			}
		];
		const two = expectOk(run(setup, { playerCount: 2 }));
		expect(cardsInZone(two.state, 'board:deck')).toHaveLength(CARD_COUNT);
		expect(cardsInZone(two.state, 'board:discard')).toHaveLength(0);

		const one = expectOk(run(setup, { playerCount: 1 }));
		expect(cardsInZone(one.state, 'board:deck')).toHaveLength(0);
		expect(cardsInZone(one.state, 'board:discard')).toHaveLength(CARD_COUNT);
	});

	it('evaluates option and count value-expressions', () => {
		const setup: SetupNode[] = [
			{ do: 'placeZone', blueprint: 'board' },
			{ do: 'place', component: 'cards', zone: { blueprint: 'board', role: 'Deck' } },
			{
				when: {
					all: [
						{ op: 'eq', left: { get: 'option', option: 'advanced' }, right: { const: true } },
						{ op: 'gt', left: { get: 'count', zone: { blueprint: 'board', role: 'Deck' } }, right: { const: 0 } }
					]
				},
				then: [
					{
						do: 'move',
						count: 1,
						from: { blueprint: 'board', role: 'Deck' },
						to: { blueprint: 'board', role: 'Discard' }
					}
				]
			}
		];
		const on = expectOk(run(setup, { options: { advanced: true } }));
		expect(cardsInZone(on.state, 'board:discard')).toHaveLength(1);
		const off = expectOk(run(setup, { options: { advanced: false } }));
		expect(cardsInZone(off.state, 'board:discard')).toHaveLength(0);
	});

	it('runs a forEachSeat body once per seat with "current"', () => {
		const setup: SetupNode[] = [
			...withDeck(),
			{
				forEachSeat: {
					body: [
						{
							do: 'deal',
							count: 1,
							from: { blueprint: 'board', role: 'Deck' },
							to: { blueprint: 'seat-area', role: 'Hand', seat: { kind: 'current' } }
						}
					]
				}
			}
		];
		const { state } = expectOk(run(setup, { playerCount: 4 }));
		for (let seat = 0; seat < 4; seat++) {
			expect(cardsInZone(state, `seat-area:hand:seat${seat}`)).toHaveLength(1);
		}
		expect(cardsInZone(state, 'board:deck')).toHaveLength(CARD_COUNT - 4);
	});
});

// ---------------------------------------------------------------------------
// Errors & determinism at the whole-run level
// ---------------------------------------------------------------------------

describe('runtime errors', () => {
	it('reports zone-not-on-table for a seat index beyond the player count', () => {
		const setup: SetupNode[] = [
			...withDeck(),
			{
				do: 'deal',
				count: 1,
				from: { blueprint: 'board', role: 'Deck' },
				to: { blueprint: 'seat-area', role: 'Hand', seat: { kind: 'index', index: 5 } }
			}
		];
		const result = run(setup, { playerCount: 2 });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.kind).toBe('zone-not-on-table');
	});

	it('reports zone-not-on-table when a target zone was never placed', () => {
		const setup: SetupNode[] = [
			{ do: 'placeZone', blueprint: 'board' },
			{ do: 'place', component: 'cards', zone: { blueprint: 'board', role: 'Deck' } },
			{
				do: 'deal',
				count: 1,
				from: { blueprint: 'board', role: 'Deck' },
				to: { blueprint: 'seat-area', role: 'Hand', seat: { kind: 'index', index: 0 } }
			}
		];
		const result = run(setup, { playerCount: 2 });
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.error.kind).toBe('zone-not-on-table');
	});
});

describe('whole-run determinism', () => {
	const richSetup = (): SetupNode[] =>
		withDeck(
			{ do: 'shuffle', zone: { blueprint: 'board', role: 'Deck' } },
			{
				do: 'deal',
				count: 2,
				from: { blueprint: 'board', role: 'Deck' },
				to: { blueprint: 'seat-area', role: 'Hand', seat: { kind: 'each' } },
				facing: 'up'
			},
			{ do: 'roll', component: 'dice' }
		);

	it('produces byte-identical output for the same seed/options/playerCount', () => {
		const a = expectOk(run(richSetup(), { seed: 42, playerCount: 4 }));
		const b = expectOk(run(richSetup(), { seed: 42, playerCount: 4 }));
		expect(JSON.stringify(b)).toEqual(JSON.stringify(a));
	});

	it('differs for a different seed', () => {
		const a = expectOk(run(richSetup(), { seed: 42, playerCount: 4 }));
		const b = expectOk(run(richSetup(), { seed: 43, playerCount: 4 }));
		expect(JSON.stringify(b.trace)).not.toEqual(JSON.stringify(a.trace));
	});
});
