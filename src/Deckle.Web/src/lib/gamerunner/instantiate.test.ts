import { describe, it, expect } from 'vitest';
import { placeZone, instantiateBlueprint } from './instantiate';
import type { Blueprint } from './types';

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
		id: 'player-area',
		scope: 'seat',
		displayName: 'Player Area',
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
			},
			{
				id: 'tableau',
				role: 'Tableau',
				name: 'Tableau',
				geometry: {
					type: 'grid',
					rect: { x: 0, y: 220, width: 600, height: 400 },
					grid: { cellWidth: 150, cellHeight: 200, columns: 4 }
				},
				faceVisibility: 'all',
				presence: 'visible'
			}
		]
	};
}

function edgeBlueprint(): Blueprint {
	return {
		id: 'river',
		scope: 'edge',
		displayName: 'River',
		zones: [
			{
				id: 'river-z',
				role: 'River',
				name: 'River',
				geometry: {
					type: 'spread',
					rect: { x: 0, y: 0, width: 400, height: 200 },
					spread: { direction: 'row', overlap: 30 }
				},
				faceVisibility: 'all',
				presence: 'visible'
			}
		]
	};
}

describe('placeZone', () => {
	it('stamps every zone in the bundle once', () => {
		const placed = placeZone(tableBlueprint());
		expect(placed.map((z) => z.role)).toEqual(['Deck', 'Discard']);
	});

	it('copies geometry, type and visibility presets onto each placed zone', () => {
		const [deck] = placeZone(tableBlueprint());
		expect(deck.type).toBe('freeform');
		expect(deck.rect).toEqual({ x: 0, y: 0, width: 150, height: 200 });
		expect(deck.faceVisibility).toBe('none');
		expect(deck.presence).toBe('visible');
		expect(deck.blueprintId).toBe('board');
		expect(deck.zoneId).toBe('deck');
	});

	it('carries through spread and grid layout settings', () => {
		const [hand, tableau] = placeZone(seatBlueprint(), 0);
		expect(hand.spread).toEqual({ direction: 'row', overlap: 40 });
		expect(tableau.grid).toEqual({ cellWidth: 150, cellHeight: 200, columns: 4 });
	});

	it('owns seat zones by their seat index and gives deterministic ids', () => {
		const seat2 = placeZone(seatBlueprint(), 2);
		expect(seat2.every((z) => z.seatIndex === 2)).toBe(true);
		expect(seat2.every((z) => z.edgeIndex === undefined)).toBe(true);
		expect(seat2.map((z) => z.id)).toEqual(['player-area:hand:seat2', 'player-area:tableau:seat2']);
	});

	it('indexes edge zones by edge index and leaves them unowned', () => {
		const [river] = placeZone(edgeBlueprint(), 3);
		expect(river.edgeIndex).toBe(3);
		expect(river.seatIndex).toBeUndefined();
		expect(river.id).toBe('river:river-z:edge3');
	});

	it('leaves table zones unowned with a bare id', () => {
		const [deck] = placeZone(tableBlueprint());
		expect(deck.seatIndex).toBeUndefined();
		expect(deck.edgeIndex).toBeUndefined();
		expect(deck.id).toBe('board:deck');
	});

	it('does not alias the source geometry', () => {
		const bp = tableBlueprint();
		const [deck] = placeZone(bp);
		deck.rect.x = 999;
		expect(bp.zones[0].geometry.rect.x).toBe(0);
	});
});

describe('instantiateBlueprint', () => {
	it('stamps a table blueprint exactly once regardless of player count', () => {
		for (const count of [1, 2, 4, 8]) {
			const placed = instantiateBlueprint(tableBlueprint(), count);
			expect(placed).toHaveLength(2); // two zones, one table copy
			expect(placed.map((z) => z.role)).toEqual(['Deck', 'Discard']);
		}
	});

	it('stamps a seat blueprint once per seat', () => {
		for (const count of [1, 2, 4, 8]) {
			const placed = instantiateBlueprint(seatBlueprint(), count);
			// Two zones per seat.
			expect(placed).toHaveLength(count * 2);
			const seatIndices = [...new Set(placed.map((z) => z.seatIndex))].sort((a, b) => a! - b!);
			expect(seatIndices).toEqual(Array.from({ length: count }, (_, i) => i));
			// Every seat gets the full bundle of roles.
			for (let seat = 0; seat < count; seat++) {
				const roles = placed.filter((z) => z.seatIndex === seat).map((z) => z.role);
				expect(roles).toEqual(['Hand', 'Tableau']);
			}
		}
	});

	it('stamps an edge blueprint once per edge (N edges for N seats)', () => {
		for (const count of [1, 2, 4, 8]) {
			const placed = instantiateBlueprint(edgeBlueprint(), count);
			expect(placed).toHaveLength(count);
			const edgeIndices = placed.map((z) => z.edgeIndex);
			expect(edgeIndices).toEqual(Array.from({ length: count }, (_, i) => i));
		}
	});

	it('produces globally unique placed-zone ids across seats', () => {
		const placed = instantiateBlueprint(seatBlueprint(), 4);
		const ids = placed.map((z) => z.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('produces no seat zones for a zero player count', () => {
		expect(instantiateBlueprint(seatBlueprint(), 0)).toEqual([]);
	});

	it('still stamps a table blueprint at a zero player count', () => {
		expect(instantiateBlueprint(tableBlueprint(), 0)).toHaveLength(2);
	});
});
