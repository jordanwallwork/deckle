/**
 * Seat-ring layout: the world-positioning strategy #115 deliberately deferred.
 *
 * #115's {@link instantiateBlueprint} stamps a blueprint's zones once per seat
 * (or edge, or table), copying the blueprint's *local* geometry verbatim and
 * tagging each copy with its `seatIndex`/`edgeIndex`. It leaves world placement
 * to a downstream, swappable strategy — the radial ring of #109 / #102. That
 * strategy lives here.
 *
 * The module is pure, deterministic geometry: given the placed zones and a
 * player count it computes where each seat panel and edge zone sits in world
 * space. Two ideas keep it honest:
 *
 *  - **True physical scale (#109).** Panels are never scaled — a seat is *moved*
 *    onto the ring by translating its whole zone group so its local bounding-box
 *    centre lands on the ring point. Widths and heights are untouched, which is
 *    what lets later work derive real table-space data.
 *
 *  - **A render-strategy seam (#102).** {@link SeatLayoutStrategy} is the swap
 *    point: `radial` ships now; BGA rows / two-facing-rows can be added later as
 *    sibling strategies without touching callers. Only the target *point* for a
 *    seat/edge is strategy-specific; the translate-the-group mechanics in
 *    {@link positionRingZones} are shared.
 *
 * Per #109 the ONLY author knob is the ring radius (an optional roomier
 * override, #111); seat scale and a seat-1 start angle were both rejected.
 */

import type { Point, Rect, Size } from '../tabletop/geometry';
import type { PlacedZone } from './instantiate';

// ---------------------------------------------------------------------------
// Bounds helpers
// ---------------------------------------------------------------------------

/** The axis-aligned bounding box that contains every rectangle. */
export function rectsBounds(rects: Rect[]): Rect {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	for (const r of rects) {
		if (r.x < minX) minX = r.x;
		if (r.y < minY) minY = r.y;
		if (r.x + r.width > maxX) maxX = r.x + r.width;
		if (r.y + r.height > maxY) maxY = r.y + r.height;
	}
	if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 };
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** The centre of the bounding box of the given rectangles. */
export function boundsCenter(rects: Rect[]): Point {
	const b = rectsBounds(rects);
	return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

// ---------------------------------------------------------------------------
// Ring model & strategy seam
// ---------------------------------------------------------------------------

/**
 * A concrete ring: where its centre is, how far seats sit from it, and how many
 * seats (and therefore edges) share it. Produced by
 * {@link SeatLayoutStrategy.computeRing} and consumed by the seat/edge point
 * accessors.
 */
export interface RingLayout {
	/** Table centre in world space (the shared table zones live around here). */
	center: Point;
	/** Distance from the centre to each seat panel's centre. */
	radius: number;
	/** Number of seats on the ring; there are always this many edges too. */
	seatCount: number;
}

/** Inputs a strategy needs to size and shape the ring. */
export interface SeatLayoutInput {
	/** How many seats to arrange (clamped to >= 1). */
	playerCount: number;
	/** Bounding size of one seat blueprint's zones — drives the auto-fit radius. */
	seatPanel: Size;
	/**
	 * Optional roomier-override (#111): a *minimum* radius. The effective radius
	 * is `max(autoFit, override)`, so an override only ever widens the ring — it
	 * can never pull seats close enough to overlap.
	 */
	radiusOverride?: number;
	/** Table centre; defaults to the origin. */
	center?: Point;
}

/**
 * A swappable seat-arrangement strategy (#102). `radial` is the only
 * implementation today; future views (BGA rows, two facing rows) plug in here
 * without changing {@link positionRingZones} or its callers.
 */
export interface SeatLayoutStrategy {
	/** Stable identifier, e.g. `'radial'`. */
	readonly id: string;
	/** Size and place the ring for a given player count / seat panel. */
	computeRing(input: SeatLayoutInput): RingLayout;
	/** World centre where seat `seatIndex`'s panel should sit. */
	seatCenter(ring: RingLayout, seatIndex: number): Point;
	/** World centre where edge `edgeIndex`'s zone should sit. */
	edgeCenter(ring: RingLayout, edgeIndex: number): Point;
}

// ---------------------------------------------------------------------------
// Radial strategy
// ---------------------------------------------------------------------------

/**
 * Seat 0 sits at the bottom of the ring (6 o'clock), nearest the viewer, and
 * the remaining seats fan out clockwise. This is a fixed convention, not an
 * author knob — the seat-1 start angle was rejected in #109.
 */
const SEAT_ZERO_ANGLE_DEG = 180;

/**
 * Extra clearance (world units) between the bounding circles of adjacent seat
 * panels, so panels breathe rather than merely touch.
 */
const SEAT_GAP = 40;

/**
 * Edges ride on a tighter ring than seats so they tuck into the gaps between
 * adjacent panels rather than colliding with them. 0.82 is the factor validated
 * in the #109 prototype.
 */
const EDGE_RING_FACTOR = 0.82;

/**
 * Polar → cartesian around a centre, with the angle measured from 12 o'clock
 * and increasing clockwise (screen coordinates, y growing downward). At 180°
 * this returns a point directly below the centre.
 */
function polar(center: Point, radius: number, angleDeg: number): Point {
	const rad = (angleDeg * Math.PI) / 180;
	return {
		x: center.x + radius * Math.sin(rad),
		y: center.y - radius * Math.cos(rad)
	};
}

function seatAngleDeg(index: number, seatCount: number): number {
	return SEAT_ZERO_ANGLE_DEG + (index * 360) / seatCount;
}

function edgeAngleDeg(index: number, seatCount: number): number {
	// Edge i bisects the arc between seat i and seat i+1.
	return SEAT_ZERO_ANGLE_DEG + ((index + 0.5) * 360) / seatCount;
}

/**
 * The smallest ring radius that keeps adjacent seat panels from overlapping.
 *
 * Each panel is bounded by a circle of radius `bounding` (half its diagonal, so
 * the bound holds at any orientation). Adjacent seat centres, separated by the
 * angular step `2π/N`, are a chord `2·r·sin(π/N)` apart; requiring that chord to
 * be at least `2·bounding + SEAT_GAP` gives the radius below. A lone seat (N=1)
 * has no neighbour, so its radius is just `bounding` — enough to sit the panel
 * clear of the central table area.
 */
function autoFitRadius(seatPanel: Size, seatCount: number): number {
	const bounding = 0.5 * Math.hypot(seatPanel.width, seatPanel.height);
	if (seatCount <= 1) return bounding;
	const needed = (bounding + SEAT_GAP / 2) / Math.sin(Math.PI / seatCount);
	return Math.max(bounding, needed);
}

/**
 * The radial ring strategy: seats evenly spaced on a circle, seat 0 at the
 * bottom, edges on a slightly tighter concentric ring between adjacent seats.
 */
export const radialLayout: SeatLayoutStrategy = {
	id: 'radial',

	computeRing({ playerCount, seatPanel, radiusOverride, center }): RingLayout {
		const seatCount = Math.max(1, Math.floor(playerCount));
		const autoFit = autoFitRadius(seatPanel, seatCount);
		const radius = radiusOverride !== undefined ? Math.max(autoFit, radiusOverride) : autoFit;
		return { center: center ?? { x: 0, y: 0 }, radius, seatCount };
	},

	seatCenter(ring, seatIndex) {
		return polar(ring.center, ring.radius, seatAngleDeg(seatIndex, ring.seatCount));
	},

	edgeCenter(ring, edgeIndex) {
		return polar(ring.center, ring.radius * EDGE_RING_FACTOR, edgeAngleDeg(edgeIndex, ring.seatCount));
	}
};

// ---------------------------------------------------------------------------
// Positioning placed zones
// ---------------------------------------------------------------------------

/** Group key that shares a single translation: one per seat, one per edge, one table. */
function groupKey(zone: PlacedZone): string {
	if (zone.scope === 'seat') return `seat:${zone.seatIndex}`;
	if (zone.scope === 'edge') return `edge:${zone.edgeIndex}`;
	return 'table';
}

/** The world point a group's bounding-box centre should be translated onto. */
function groupTarget(
	sample: PlacedZone,
	ring: RingLayout,
	strategy: SeatLayoutStrategy
): Point | null {
	if (sample.scope === 'seat' && sample.seatIndex !== undefined) {
		return strategy.seatCenter(ring, sample.seatIndex);
	}
	if (sample.scope === 'edge' && sample.edgeIndex !== undefined) {
		return strategy.edgeCenter(ring, sample.edgeIndex);
	}
	return null; // table zones stay where they were authored
}

/**
 * Position instantiated zones into world space on the ring.
 *
 * Zones are grouped by placement (a seat's whole bundle, an edge's bundle, or
 * the table), and each group is *translated* — never scaled — so its local
 * bounding-box centre lands on the strategy's target point. Table zones are
 * passed through untouched. Metadata (seatIndex, role, visibility, …) and input
 * order are preserved, and the input is not mutated: every returned zone carries
 * a fresh `rect`.
 */
export function positionRingZones(
	zones: PlacedZone[],
	ring: RingLayout,
	strategy: SeatLayoutStrategy
): PlacedZone[] {
	// One offset per group, computed from the group's collective bounding box.
	const grouped = new Map<string, PlacedZone[]>();
	for (const zone of zones) {
		const key = groupKey(zone);
		const list = grouped.get(key);
		if (list) list.push(zone);
		else grouped.set(key, [zone]);
	}

	const offsets = new Map<string, Point>();
	for (const [key, group] of grouped) {
		const target = groupTarget(group[0], ring, strategy);
		if (!target) {
			offsets.set(key, { x: 0, y: 0 });
			continue;
		}
		const centre = boundsCenter(group.map((z) => z.rect));
		offsets.set(key, { x: target.x - centre.x, y: target.y - centre.y });
	}

	// Re-emit in the original order with each zone shifted by its group offset.
	return zones.map((zone) => {
		const { x, y } = offsets.get(groupKey(zone)) ?? { x: 0, y: 0 };
		return {
			...zone,
			rect: {
				x: zone.rect.x + x,
				y: zone.rect.y + y,
				width: zone.rect.width,
				height: zone.rect.height
			}
		};
	});
}
