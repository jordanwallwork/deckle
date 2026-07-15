/**
 * Blueprint instantiation.
 *
 * A {@link Blueprint} is a named bundle of zone templates a designer authors
 * once; the setup program stamps it onto the table by id. This module turns a
 * blueprint into the concrete zones a run produces, honouring the three scopes
 * (#102): a `table` blueprint stamps once, a `seat` blueprint once per seat, and
 * an `edge` blueprint once per edge (there are always N edges for N seats).
 *
 * The output reuses the tabletop zone vocabulary — a {@link PlacedZone} carries
 * the tabletop {@link ZoneType} and a {@link Rect} — plus the ownership and
 * #103 visibility metadata a later view layer (#116) consumes. Geometry is
 * copied from the blueprint's own local frame verbatim; positioning it into
 * world space (the auto-fit ring of #109) is a separate, swappable layout
 * concern (#102) applied downstream, so instantiation stays a pure function of
 * the blueprint and the seat/edge index.
 */

import type { Blueprint, FaceVisibility, Zone, ZonePresence, ZoneScope } from './types';
import type { Rect } from '../tabletop/geometry';
import type { ZoneType } from '../tabletop/types';

/**
 * One concrete zone produced by instantiating a blueprint zone. Table and edge
 * zones are unowned (no {@link seatIndex}); seat zones are owned by their seat.
 */
export interface PlacedZone {
	/** Deterministic id: the blueprint zone id plus a seat/edge suffix. */
	id: string;
	/** The {@link Blueprint.id} this came from. */
	blueprintId: string;
	/** The originating {@link Zone.id} within the blueprint. */
	zoneId: string;
	/** Copied from the blueprint zone. */
	role: string;
	/** Copied from the blueprint zone. */
	name: string;
	/** The blueprint's scope, carried through for the view/layout layers. */
	scope: ZoneScope;
	/** Tabletop zone kind to build. */
	type: ZoneType;
	/** Local rectangle (blueprint frame); world placement is applied downstream. */
	rect: Rect;
	/** Spread settings when {@link type} is `spread`. */
	spread?: { direction: 'row' | 'column'; overlap: number };
	/** Grid settings when {@link type} is `grid`. */
	grid?: { cellWidth: number; cellHeight: number; columns: number };
	/** Copied from the blueprint zone. */
	faceVisibility: FaceVisibility;
	/** Copied from the blueprint zone. */
	presence: ZonePresence;
	/** Owner seat for seat-scoped zones; undefined for table/edge zones. */
	seatIndex?: number;
	/** Edge index for edge-scoped zones; undefined otherwise. */
	edgeIndex?: number;
}

function placementSuffix(scope: ZoneScope, index: number): string {
	if (scope === 'seat') return `:seat${index}`;
	if (scope === 'edge') return `:edge${index}`;
	return '';
}

function placeSingleZone(blueprint: Blueprint, zone: Zone, index: number): PlacedZone {
	const suffix = placementSuffix(blueprint.scope, index);
	const placed: PlacedZone = {
		id: `${blueprint.id}:${zone.id}${suffix}`,
		blueprintId: blueprint.id,
		zoneId: zone.id,
		role: zone.role,
		name: zone.name,
		scope: blueprint.scope,
		type: zone.geometry.type,
		rect: { ...zone.geometry.rect },
		faceVisibility: zone.faceVisibility,
		presence: zone.presence
	};
	if (zone.geometry.spread) placed.spread = { ...zone.geometry.spread };
	if (zone.geometry.grid) placed.grid = { ...zone.geometry.grid };
	if (blueprint.scope === 'seat') placed.seatIndex = index;
	if (blueprint.scope === 'edge') placed.edgeIndex = index;
	return placed;
}

/**
 * Instantiate a blueprint's zones for a single placement: the table (index
 * ignored), one seat (`index` = seatIndex), or one edge (`index` = edgeIndex).
 * Produces one {@link PlacedZone} per zone in the bundle. Prefer
 * {@link instantiateBlueprint} to fan a blueprint out across a whole run.
 *
 * @param blueprint the bundle to stamp; its {@link Blueprint.scope} decides whether `index` is used
 * @param index the seat or edge index; ignored for `table` scope, defaults to 0
 */
export function placeZone(blueprint: Blueprint, index = 0): PlacedZone[] {
	return blueprint.zones.map((zone) => placeSingleZone(blueprint, zone, index));
}

/**
 * Instantiate a blueprint across a whole run at a given player count, honouring
 * its scope: `table` stamps once; `seat` once per seat (0..playerCount-1);
 * `edge` once per edge (0..playerCount-1 — always N edges for N seats). Returns
 * the flattened concrete zones. A non-positive player count yields no seat/edge
 * zones (and still a single table zone for table blueprints).
 */
export function instantiateBlueprint(blueprint: Blueprint, playerCount: number): PlacedZone[] {
	if (blueprint.scope === 'table') return placeZone(blueprint);

	const count = Math.max(0, Math.floor(playerCount));
	const placed: PlacedZone[] = [];
	for (let i = 0; i < count; i++) {
		placed.push(...placeZone(blueprint, i));
	}
	return placed;
}
