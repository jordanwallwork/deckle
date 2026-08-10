/**
 * Pure AST-edit helpers for the blueprint authoring surface (#122) — the tested
 * seam behind the single-seat blueprint editor, sibling to {@link './edit'} (the
 * setup-script seam of #123). The blueprint view and the script view edit the
 * SAME in-memory {@link GameSetup} (#111: one document, one Save); every
 * structural gesture in the blueprint UI — add / delete / duplicate a blueprint,
 * add / delete / edit a zone, set geometry, apply a visibility preset — is a
 * small deterministic mutation defined and unit-tested here rather than buried in
 * a `.svelte` component.
 *
 * Mutations operate in place on the document's arrays: the editor holds the doc
 * as Svelte `$state`, whose deep proxy makes in-place mutation reactive (so the
 * shared validity badge + Save "just work"). Keeping the logic here is what makes
 * it testable — see `blueprintEdit.test.ts`.
 *
 * Visibility presets (#103): the editor surfaces named presets over the two raw
 * orthogonal axes (`faceVisibility` × `presence`). Applying a preset sets BOTH.
 */

import type {
	Blueprint,
	FaceVisibility,
	GameSetup,
	SetupNode,
	Zone,
	ZonePresence,
	ZoneScope
} from './types';
import type { ZoneType } from '../tabletop/types';

// ---------------------------------------------------------------------------
// Visibility presets (#103)
// ---------------------------------------------------------------------------

/** A named preset over the two orthogonal visibility axes (#103). */
export interface VisibilityPreset {
	/** Stable id used by the preset dropdown. */
	id: string;
	/** Human label shown in the editor. */
	label: string;
	faceVisibility: FaceVisibility;
	presence: ZonePresence;
	/** Short explanation of what viewers see. */
	description: string;
	/**
	 * True when the preset references the zone owner (`owner`/`others` face or a
	 * hidden presence) and so only makes sense on a seat-scoped blueprint (#103:
	 * "owner-referencing policies are only valid on seat-scoped zones").
	 */
	seatOnly: boolean;
}

/**
 * The five presets from #103, mapped to the raw axes. Note `hand` and
 * `secret stash` share `faceVisibility: 'owner'` and differ only on presence:
 * a hand's back/count is public (`visible`), a secret stash is not rendered to
 * non-owners at all (`hidden-from-non-owners`). This corrects the parenthetical
 * in the #122 brief, which listed hand as `hidden-from-non-owners` — #103's
 * resolution is authoritative and lists that presence under "secret stash".
 */
export const VISIBILITY_PRESETS: VisibilityPreset[] = [
	{
		id: 'tableau',
		label: 'Tableau',
		faceVisibility: 'all',
		presence: 'visible',
		description: 'Everyone sees the faces (a public play area).',
		seatOnly: false
	},
	{
		id: 'deck',
		label: 'Deck',
		faceVisibility: 'none',
		presence: 'visible',
		description: 'Nobody sees faces; backs and count are public (a face-down draw pile).',
		seatOnly: false
	},
	{
		id: 'hand',
		label: 'Hand',
		faceVisibility: 'owner',
		presence: 'visible',
		description: 'Owner sees faces, others see backs; count is public.',
		seatOnly: true
	},
	{
		id: 'hanabi-hand',
		label: 'Hanabi hand',
		faceVisibility: 'others',
		presence: 'visible',
		description: 'Everyone EXCEPT the owner sees the faces.',
		seatOnly: true
	},
	{
		id: 'secret-stash',
		label: 'Secret stash',
		faceVisibility: 'owner',
		presence: 'hidden-from-non-owners',
		description: 'Only the owner sees the zone at all; others see an empty region.',
		seatOnly: true
	}
];

/** The preset id whose axes match the zone's current pair, or null if none. */
export function matchVisibilityPreset(zone: {
	faceVisibility: FaceVisibility;
	presence: ZonePresence;
}): string | null {
	const found = VISIBILITY_PRESETS.find(
		(p) => p.faceVisibility === zone.faceVisibility && p.presence === zone.presence
	);
	return found ? found.id : null;
}

/** Apply a preset's axis pair to a zone (mutates in place). No-op if unknown. */
export function applyVisibilityPreset(zone: Zone, presetId: string): void {
	const preset = VISIBILITY_PRESETS.find((p) => p.id === presetId);
	if (!preset) return;
	zone.faceVisibility = preset.faceVisibility;
	zone.presence = preset.presence;
}

// ---------------------------------------------------------------------------
// Unique id / name generation
// ---------------------------------------------------------------------------

/** First `${prefix}-${n}` (n>=1) not already in `existing`. */
function uniqueId(prefix: string, existing: Set<string>): string {
	let n = 1;
	let id = `${prefix}-${n}`;
	while (existing.has(id)) {
		n += 1;
		id = `${prefix}-${n}`;
	}
	return id;
}

/**
 * `base`, else `base 2`, `base 3`, … — the first not already in `existing`.
 * Used for both display names and zone roles (both must be unique in their set).
 */
function uniqueLabel(base: string, existing: Set<string>): string {
	if (!existing.has(base)) return base;
	let n = 2;
	while (existing.has(`${base} ${n}`)) n += 1;
	return `${base} ${n}`;
}

const DEFAULT_ZONE_GEOMETRY = (): Zone['geometry'] => ({
	type: 'freeform' as ZoneType,
	rect: { x: 0, y: 0, width: 120, height: 80 }
});

// ---------------------------------------------------------------------------
// Zone operations
// ---------------------------------------------------------------------------

/** Build a fresh zone with an id/role unique within `blueprint` (default axes). */
export function createZone(blueprint: Blueprint): Zone {
	const ids = new Set(blueprint.zones.map((z) => z.id));
	const roles = new Set(blueprint.zones.map((z) => z.role));
	const role = uniqueLabel('zone', roles);
	return {
		id: uniqueId('zone', ids),
		role,
		name: role,
		geometry: DEFAULT_ZONE_GEOMETRY(),
		faceVisibility: 'all',
		presence: 'visible'
	};
}

/** Append a fresh zone to `blueprint` and return it (mutates in place). */
export function addZone(blueprint: Blueprint): Zone {
	const zone = createZone(blueprint);
	blueprint.zones.push(zone);
	return zone;
}

/** Delete the zone with `zoneId` from `blueprint` (no-op if absent). */
export function deleteZone(blueprint: Blueprint, zoneId: string): void {
	const i = blueprint.zones.findIndex((z) => z.id === zoneId);
	if (i >= 0) blueprint.zones.splice(i, 1);
}

// ---------------------------------------------------------------------------
// Blueprint operations
// ---------------------------------------------------------------------------

const SCOPE_LABEL: Record<ZoneScope, string> = {
	seat: 'seat',
	table: 'table',
	edge: 'edge'
};

/** Build a fresh blueprint (one starter zone) with id/displayName unique in `doc`. */
export function createBlueprint(doc: GameSetup, scope: ZoneScope): Blueprint {
	const ids = new Set(doc.blueprints.map((b) => b.id));
	const names = new Set(doc.blueprints.map((b) => b.displayName));
	const blueprint: Blueprint = {
		id: uniqueId(`${scope}-blueprint`, ids),
		scope,
		displayName: uniqueLabel(`New ${SCOPE_LABEL[scope]} blueprint`, names),
		zones: []
	};
	// Seed with one zone so the blueprint is immediately meaningful on the canvas.
	blueprint.zones.push(createZone(blueprint));
	return blueprint;
}

/** Append a fresh blueprint of `scope` to `doc` and return it (mutates in place). */
export function addBlueprint(doc: GameSetup, scope: ZoneScope): Blueprint {
	const blueprint = createBlueprint(doc, scope);
	doc.blueprints.push(blueprint);
	return blueprint;
}

/** Delete the blueprint with `blueprintId` from `doc` (no-op if absent). */
export function deleteBlueprint(doc: GameSetup, blueprintId: string): void {
	const i = doc.blueprints.findIndex((b) => b.id === blueprintId);
	if (i >= 0) doc.blueprints.splice(i, 1);
}

/**
 * Deep-copy the blueprint with `blueprintId`: fresh blueprint id, fresh zone ids
 * (roles/names kept — they are only unique *within* the bundle), and a new unique
 * displayName. Appends the copy to `doc` and returns it. Null if the source is
 * absent. (Duplicate at v1, #111.)
 */
export function duplicateBlueprint(doc: GameSetup, blueprintId: string): Blueprint | null {
	const source = doc.blueprints.find((b) => b.id === blueprintId);
	if (!source) return null;

	const ids = new Set(doc.blueprints.map((b) => b.id));
	const names = new Set(doc.blueprints.map((b) => b.displayName));

	// Fresh, deterministic zone ids across the copied set (roles/names kept).
	const usedZoneIds = new Set<string>();
	const zones = source.zones.map((z) => {
		const id = uniqueId('zone', usedZoneIds);
		usedZoneIds.add(id);
		return { ...structuredClone(z), id };
	});

	const copy: Blueprint = {
		id: uniqueId(`${source.scope}-blueprint`, ids),
		scope: source.scope,
		displayName: uniqueLabel(`${source.displayName} (copy)`, names),
		zones
	};

	doc.blueprints.push(copy);
	return copy;
}

// ---------------------------------------------------------------------------
// Dangling-reference detection (#110 / #111 delete-anytime)
// ---------------------------------------------------------------------------

/** One place a blueprint id is referenced from the setup program. */
export interface BlueprintRef {
	/** The referenced blueprint id. */
	blueprint: string;
	/** Doc path of the referencing `blueprint` field, e.g. `setup[2].to.blueprint`. */
	docPath: string;
}

/**
 * Collect every `blueprint` id reference reachable from the setup program:
 * bare refs (`placeSeats`/`placeZone`), zone references (`place`/`shuffle`/
 * `deal`/`move`/`flip`/`roll`), and nested `get: 'count'` zone refs inside
 * conditions and deal counts. A generic deep walk keeps this exhaustive without
 * enumerating every verb shape.
 */
export function collectBlueprintRefs(nodes: SetupNode[]): BlueprintRef[] {
	const out: BlueprintRef[] = [];
	walk(nodes, 'setup', out);
	return out;
}

function walk(value: unknown, path: string, out: BlueprintRef[]): void {
	if (Array.isArray(value)) {
		value.forEach((v, i) => walk(v, `${path}[${i}]`, out));
		return;
	}
	if (value === null || typeof value !== 'object') return;

	const obj = value as Record<string, unknown>;
	if (typeof obj.blueprint === 'string' && obj.blueprint.length > 0) {
		out.push({ blueprint: obj.blueprint, docPath: `${path}.blueprint` });
	}
	for (const [key, child] of Object.entries(obj)) {
		walk(child, `${path}.${key}`, out);
	}
}

/**
 * Doc paths of setup steps still referencing `blueprintId`. Empty means the
 * blueprint can be deleted with no dangling references; a non-empty result is
 * what the editor surfaces as a delete warning (delete stays allowed — #111 —
 * and live validation flags any refs left behind).
 */
export function findBlueprintReferences(doc: GameSetup, blueprintId: string): string[] {
	return collectBlueprintRefs(doc.setup)
		.filter((r) => r.blueprint === blueprintId)
		.map((r) => r.docPath);
}
