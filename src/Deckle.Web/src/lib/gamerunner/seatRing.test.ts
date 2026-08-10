import { describe, it, expect } from 'vitest';
import type { Rect } from '../tabletop/geometry';
import type { PlacedZone } from './instantiate';
import {
	radialLayout,
	positionRingZones,
	rectsBounds,
	boundsCenter,
	type RingLayout
} from './seatRing';

// A single seat panel roughly the size of the prototype's (#109): 400×350 local.
const SEAT_PANEL = { width: 400, height: 350 };

function ring(playerCount: number, radiusOverride?: number): RingLayout {
	return radialLayout.computeRing({ playerCount, seatPanel: SEAT_PANEL, radiusOverride });
}

/** Distance between two points. */
function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The bounding circle radius of the seat panel (half its diagonal). */
const SEAT_BOUNDING = 0.5 * Math.hypot(SEAT_PANEL.width, SEAT_PANEL.height);

// ---------------------------------------------------------------------------
// Bounds helpers
// ---------------------------------------------------------------------------

describe('rectsBounds / boundsCenter', () => {
	it('unions rectangles into their bounding box', () => {
		const rects: Rect[] = [
			{ x: 0, y: 0, width: 100, height: 50 },
			{ x: 80, y: 60, width: 40, height: 40 }
		];
		expect(rectsBounds(rects)).toEqual({ x: 0, y: 0, width: 120, height: 100 });
	});

	it('reports the centre of the bounding box', () => {
		const rects: Rect[] = [{ x: 10, y: 20, width: 100, height: 40 }];
		expect(boundsCenter(rects)).toEqual({ x: 60, y: 40 });
	});
});

// ---------------------------------------------------------------------------
// Ring geometry: angles & spacing
// ---------------------------------------------------------------------------

describe('radialLayout ring angles', () => {
	it('spaces seats evenly around the full circle', () => {
		for (const n of [2, 4, 8]) {
			const r = ring(n);
			const centres = Array.from({ length: n }, (_, i) => radialLayout.seatCenter(r, i));
			// Every seat sits on the ring at exactly the auto-fit radius.
			for (const c of centres) {
				expect(dist(c, r.center)).toBeCloseTo(r.radius, 6);
			}
			// Adjacent seats are separated by the same angular step.
			const step = (2 * Math.PI) / n;
			for (let i = 0; i < n; i++) {
				const a = centres[i];
				const b = centres[(i + 1) % n];
				const chord = 2 * r.radius * Math.sin(step / 2);
				expect(dist(a, b)).toBeCloseTo(chord, 4);
			}
		}
	});

	it('places seat 0 nearest the viewer (bottom of the ring)', () => {
		const r = ring(4);
		const seat0 = radialLayout.seatCenter(r, 0);
		expect(seat0.x).toBeCloseTo(r.center.x, 6);
		expect(seat0.y).toBeGreaterThan(r.center.y); // below centre (screen y grows downward)
	});

	it('positions edge i midway (angularly) between seat i and seat i+1', () => {
		const r = ring(4);
		for (let i = 0; i < 4; i++) {
			const s0 = radialLayout.seatCenter(r, i);
			const s1 = radialLayout.seatCenter(r, (i + 1) % 4);
			const edge = radialLayout.edgeCenter(r, i);
			const ang = (p: { x: number; y: number }) =>
				Math.atan2(p.y - r.center.y, p.x - r.center.x);
			// The edge bearing bisects the two seat bearings.
			const mid = Math.atan2(
				(Math.sin(ang(s0)) + Math.sin(ang(s1))) / 2,
				(Math.cos(ang(s0)) + Math.cos(ang(s1))) / 2
			);
			expect(ang(edge)).toBeCloseTo(mid, 5);
		}
	});
});

// ---------------------------------------------------------------------------
// Auto-fit radius
// ---------------------------------------------------------------------------

describe('auto-fit radius', () => {
	it('keeps adjacent seat panels from overlapping at 2/4/8 players', () => {
		for (const n of [2, 4, 8]) {
			const r = ring(n);
			const a = radialLayout.seatCenter(r, 0);
			const b = radialLayout.seatCenter(r, 1);
			// Centre spacing is at least the panels' bounding diameter — the
			// bounding circles never overlap, so the panels never do.
			expect(dist(a, b)).toBeGreaterThanOrEqual(2 * SEAT_BOUNDING - 1e-6);
		}
	});

	it('grows the radius as the player count grows', () => {
		expect(ring(8).radius).toBeGreaterThan(ring(4).radius);
		expect(ring(4).radius).toBeGreaterThan(ring(2).radius);
	});

	it('handles a single player with a finite, positive radius (N=1 convention)', () => {
		const r = ring(1);
		expect(Number.isFinite(r.radius)).toBe(true);
		expect(r.radius).toBeGreaterThan(0);
		const seat0 = radialLayout.seatCenter(r, 0);
		// The lone seat still sits below the centre, clear of the table area.
		expect(seat0.y).toBeGreaterThan(r.center.y);
	});
});

// ---------------------------------------------------------------------------
// Radius override (roomier)
// ---------------------------------------------------------------------------

describe('radius override', () => {
	it('widens the ring beyond the auto-fit radius', () => {
		const auto = ring(4).radius;
		const wide = ring(4, auto + 500).radius;
		expect(wide).toBe(auto + 500);
	});

	it('never shrinks below the auto-fit radius (override is a minimum)', () => {
		const auto = ring(8).radius;
		expect(ring(8, auto - 500).radius).toBe(auto);
	});
});

// ---------------------------------------------------------------------------
// Positioning placed zones
// ---------------------------------------------------------------------------

function seatZone(seatIndex: number, rect: Rect, role = 'Hand'): PlacedZone {
	return {
		id: `seat:${role}:seat${seatIndex}`,
		blueprintId: 'seat',
		zoneId: role.toLowerCase(),
		role,
		name: role,
		scope: 'seat',
		type: 'spread',
		rect,
		faceVisibility: 'owner',
		presence: 'hidden-from-non-owners',
		seatIndex
	};
}

function edgeZone(edgeIndex: number, rect: Rect): PlacedZone {
	return {
		id: `river:river:edge${edgeIndex}`,
		blueprintId: 'river',
		zoneId: 'river',
		role: 'River',
		name: 'River',
		scope: 'edge',
		type: 'spread',
		rect,
		faceVisibility: 'all',
		presence: 'visible',
		edgeIndex
	};
}

function tableZone(rect: Rect): PlacedZone {
	return {
		id: 'board:deck',
		blueprintId: 'board',
		zoneId: 'deck',
		role: 'Deck',
		name: 'Deck',
		scope: 'table',
		type: 'freeform',
		rect,
		faceVisibility: 'all',
		presence: 'visible'
	};
}

describe('positionRingZones', () => {
	it('moves each seat group so its bounding-box centre lands on the ring point', () => {
		const r = ring(4);
		// Two zones per seat, authored in a shared local frame.
		const zones: PlacedZone[] = [];
		for (let s = 0; s < 4; s++) {
			zones.push(seatZone(s, { x: 0, y: 0, width: 400, height: 200 }, 'Hand'));
			zones.push(seatZone(s, { x: 0, y: 220, width: 400, height: 130 }, 'Tableau'));
		}
		const placed = positionRingZones(zones, r, radialLayout);
		for (let s = 0; s < 4; s++) {
			const group = placed.filter((z) => z.seatIndex === s);
			const centre = boundsCenter(group.map((z) => z.rect));
			const target = radialLayout.seatCenter(r, s);
			expect(centre.x).toBeCloseTo(target.x, 6);
			expect(centre.y).toBeCloseTo(target.y, 6);
		}
	});

	it('translates without scaling — zone dimensions are unchanged', () => {
		const r = ring(3);
		const zones = [seatZone(1, { x: 0, y: 0, width: 400, height: 200 })];
		const [out] = positionRingZones(zones, r, radialLayout);
		expect(out.rect.width).toBe(400);
		expect(out.rect.height).toBe(200);
	});

	it('preserves all zone metadata through positioning', () => {
		const r = ring(2);
		const zones = [seatZone(0, { x: 0, y: 0, width: 400, height: 200 })];
		const [out] = positionRingZones(zones, r, radialLayout);
		expect(out.seatIndex).toBe(0);
		expect(out.role).toBe('Hand');
		expect(out.faceVisibility).toBe('owner');
		expect(out.presence).toBe('hidden-from-non-owners');
		expect(out.id).toBe(zones[0].id);
	});

	it('does not mutate or alias the input rectangles', () => {
		const r = ring(2);
		const src = seatZone(0, { x: 5, y: 5, width: 400, height: 200 });
		const [out] = positionRingZones([src], r, radialLayout);
		out.rect.x = 9999;
		expect(src.rect.x).toBe(5);
	});

	it('positions edge groups on the (inner) edge ring between seats', () => {
		const r = ring(4);
		const zones = Array.from({ length: 4 }, (_, i) =>
			edgeZone(i, { x: 0, y: 0, width: 200, height: 100 })
		);
		const placed = positionRingZones(zones, r, radialLayout);
		for (let i = 0; i < 4; i++) {
			const group = placed.filter((z) => z.edgeIndex === i);
			const centre = boundsCenter(group.map((z) => z.rect));
			const target = radialLayout.edgeCenter(r, i);
			expect(centre.x).toBeCloseTo(target.x, 6);
			expect(centre.y).toBeCloseTo(target.y, 6);
		}
	});

	it('leaves table zones exactly where they were authored', () => {
		const r = ring(4);
		const table = tableZone({ x: 100, y: 100, width: 150, height: 200 });
		const [out] = positionRingZones([table], r, radialLayout);
		expect(out.rect).toEqual({ x: 100, y: 100, width: 150, height: 200 });
	});

	it('preserves input order', () => {
		const r = ring(3);
		const zones = [
			tableZone({ x: 0, y: 0, width: 10, height: 10 }),
			seatZone(0, { x: 0, y: 0, width: 400, height: 200 }),
			edgeZone(0, { x: 0, y: 0, width: 200, height: 100 })
		];
		const out = positionRingZones(zones, r, radialLayout);
		expect(out.map((z) => z.id)).toEqual(zones.map((z) => z.id));
	});
});

describe('radialLayout identity', () => {
	it('is tagged as the radial strategy', () => {
		expect(radialLayout.id).toBe('radial');
	});
});
