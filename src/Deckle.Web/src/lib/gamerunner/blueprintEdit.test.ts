import { describe, it, expect } from 'vitest';
import {
	VISIBILITY_PRESETS,
	matchVisibilityPreset,
	applyVisibilityPreset,
	createZone,
	addZone,
	deleteZone,
	createBlueprint,
	addBlueprint,
	deleteBlueprint,
	duplicateBlueprint,
	collectBlueprintRefs,
	findBlueprintReferences
} from './blueprintEdit';
import { validateGameSetup } from './validate';
import type { Blueprint, GameSetup, ProjectContext, Zone } from './types';

const projectContext: ProjectContext = {
	components: [{ id: 'card-1', name: 'Card One', type: 'Card' }]
};

function zone(over: Partial<Zone> = {}): Zone {
	return {
		id: 'z1',
		role: 'Hand',
		name: 'Hand',
		geometry: { type: 'freeform', rect: { x: 0, y: 0, width: 100, height: 100 } },
		faceVisibility: 'all',
		presence: 'visible',
		...over
	};
}

function docWith(blueprints: Blueprint[], setup: GameSetup['setup'] = []): GameSetup {
	return {
		version: 1,
		minPlayers: 1,
		maxPlayers: 4,
		options: [],
		blueprints,
		setup
	};
}

// ---------------------------------------------------------------------------
// Visibility presets
// ---------------------------------------------------------------------------

describe('visibility presets', () => {
	it('defines the five #103 presets', () => {
		expect(VISIBILITY_PRESETS.map((p) => p.id).sort()).toEqual(
			['deck', 'hanabi-hand', 'hand', 'secret-stash', 'tableau'].sort()
		);
	});

	it('maps each preset to the #103 axis pair', () => {
		const byId = Object.fromEntries(VISIBILITY_PRESETS.map((p) => [p.id, p]));
		expect(byId.hand).toMatchObject({ faceVisibility: 'owner', presence: 'visible' });
		expect(byId.deck).toMatchObject({ faceVisibility: 'none', presence: 'visible' });
		expect(byId.tableau).toMatchObject({ faceVisibility: 'all', presence: 'visible' });
		expect(byId['hanabi-hand']).toMatchObject({ faceVisibility: 'others', presence: 'visible' });
		expect(byId['secret-stash']).toMatchObject({
			faceVisibility: 'owner',
			presence: 'hidden-from-non-owners'
		});
	});

	it('applies a preset by setting BOTH axes', () => {
		const z = zone({ faceVisibility: 'all', presence: 'visible' });
		applyVisibilityPreset(z, 'secret-stash');
		expect(z.faceVisibility).toBe('owner');
		expect(z.presence).toBe('hidden-from-non-owners');
	});

	it('is a no-op for an unknown preset id', () => {
		const z = zone({ faceVisibility: 'others', presence: 'visible' });
		applyVisibilityPreset(z, 'nope');
		expect(z.faceVisibility).toBe('others');
		expect(z.presence).toBe('visible');
	});

	it('round-trips: matchVisibilityPreset finds the applied preset', () => {
		const z = zone();
		applyVisibilityPreset(z, 'hanabi-hand');
		expect(matchVisibilityPreset(z)).toBe('hanabi-hand');
	});

	it('returns null when axes match no preset', () => {
		// none + hidden-from-non-owners is not one of the five presets.
		expect(matchVisibilityPreset({ faceVisibility: 'none', presence: 'hidden-from-non-owners' })).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Zone operations
// ---------------------------------------------------------------------------

describe('zone operations', () => {
	it('adds a zone with an id and role unique within the blueprint', () => {
		const bp: Blueprint = { id: 'b1', scope: 'seat', displayName: 'Seat', zones: [] };
		const a = addZone(bp);
		const b = addZone(bp);
		expect(bp.zones).toHaveLength(2);
		expect(a.id).not.toBe(b.id);
		expect(a.role).not.toBe(b.role);
		expect(a.name).toBe(a.role);
	});

	it('createZone does not mutate the blueprint', () => {
		const bp: Blueprint = { id: 'b1', scope: 'seat', displayName: 'Seat', zones: [] };
		createZone(bp);
		expect(bp.zones).toHaveLength(0);
	});

	it('deletes a zone by id and is a no-op for an absent id', () => {
		const bp: Blueprint = {
			id: 'b1',
			scope: 'seat',
			displayName: 'Seat',
			zones: [zone({ id: 'a' }), zone({ id: 'b', role: 'R2' })]
		};
		deleteZone(bp, 'a');
		expect(bp.zones.map((z) => z.id)).toEqual(['b']);
		deleteZone(bp, 'missing');
		expect(bp.zones).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Blueprint operations
// ---------------------------------------------------------------------------

describe('blueprint operations', () => {
	it('adds a blueprint with the chosen scope, a starter zone, unique id and name', () => {
		const doc = docWith([]);
		const a = addBlueprint(doc, 'seat');
		const b = addBlueprint(doc, 'seat');
		expect(doc.blueprints).toHaveLength(2);
		expect(a.scope).toBe('seat');
		expect(a.zones).toHaveLength(1);
		expect(a.id).not.toBe(b.id);
		expect(a.displayName).not.toBe(b.displayName);
	});

	it('produces a document that validates', () => {
		const doc = docWith([]);
		addBlueprint(doc, 'seat');
		addBlueprint(doc, 'table');
		expect(validateGameSetup(doc, projectContext)).toEqual([]);
	});

	it('deletes a blueprint by id', () => {
		const doc = docWith([]);
		const bp = addBlueprint(doc, 'table');
		deleteBlueprint(doc, bp.id);
		expect(doc.blueprints).toHaveLength(0);
	});

	it('duplicates a blueprint deeply with fresh ids and a unique name', () => {
		const doc = docWith([]);
		const src = addBlueprint(doc, 'seat');
		addZone(src); // src now has 2 zones
		const copy = duplicateBlueprint(doc, src.id);
		expect(copy).not.toBeNull();
		expect(doc.blueprints).toHaveLength(2);
		expect(copy!.id).not.toBe(src.id);
		expect(copy!.displayName).not.toBe(src.displayName);
		expect(copy!.zones).toHaveLength(src.zones.length);
		// zone ids are unique within the copy (their placed ids differ from the
		// source's anyway, since the blueprint id differs)
		expect(new Set(copy!.zones.map((z) => z.id)).size).toBe(copy!.zones.length);
		// deep copy — mutating the copy leaves the source alone
		copy!.zones[0].name = 'CHANGED';
		expect(src.zones[0].name).not.toBe('CHANGED');
	});

	it('duplicate result validates (no id/name collisions)', () => {
		const doc = docWith([]);
		const src = addBlueprint(doc, 'seat');
		duplicateBlueprint(doc, src.id);
		expect(validateGameSetup(doc, projectContext)).toEqual([]);
	});

	it('returns null when duplicating an absent blueprint', () => {
		const doc = docWith([]);
		expect(duplicateBlueprint(doc, 'nope')).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Dangling-reference detection
// ---------------------------------------------------------------------------

describe('blueprint reference detection', () => {
	const doc = docWith(
		[
			{ id: 'seats', scope: 'seat', displayName: 'Seats', zones: [zone({ id: 'z', role: 'Hand' })] },
			{ id: 'deck', scope: 'table', displayName: 'Deck', zones: [zone({ id: 'z', role: 'Draw' })] }
		],
		[
			{ do: 'placeSeats', blueprint: 'seats' },
			{ do: 'placeZone', blueprint: 'deck' },
			{ do: 'shuffle', zone: { blueprint: 'deck', role: 'Draw' } },
			{
				do: 'deal',
				count: 2,
				from: { blueprint: 'deck', role: 'Draw' },
				to: { blueprint: 'seats', role: 'Hand', seat: { kind: 'each' } },
				facing: 'down'
			}
		]
	);

	it('collects bare refs and zone refs across verbs', () => {
		const refs = collectBlueprintRefs(doc.setup);
		const ids = refs.map((r) => r.blueprint).sort();
		expect(ids).toEqual(['deck', 'deck', 'deck', 'seats', 'seats'].sort());
	});

	it('finds every doc path referencing a blueprint', () => {
		expect(findBlueprintReferences(doc, 'seats')).toEqual([
			'setup[0].blueprint',
			'setup[3].to.blueprint'
		]);
	});

	it('finds refs nested in conditions and loops', () => {
		const nested = docWith(
			[{ id: 'deck', scope: 'table', displayName: 'Deck', zones: [zone({ role: 'Draw' })] }],
			[
				{
					when: {
						op: 'gt',
						left: { get: 'count', zone: { blueprint: 'deck', role: 'Draw' } },
						right: { const: 0 }
					},
					then: [{ do: 'shuffle', zone: { blueprint: 'deck', role: 'Draw' } }]
				}
			]
		);
		expect(findBlueprintReferences(nested, 'deck')).toEqual([
			'setup[0].when.left.zone.blueprint',
			'setup[0].then[0].zone.blueprint'
		]);
	});

	it('reports no references for an unreferenced blueprint', () => {
		expect(findBlueprintReferences(doc, 'unused')).toEqual([]);
	});

	it('deleting a referenced blueprint leaves dangling refs the validator flags', () => {
		const live = structuredClone(doc);
		expect(findBlueprintReferences(live, 'deck').length).toBeGreaterThan(0);
		deleteBlueprint(live, 'deck');
		const errors = validateGameSetup(live, projectContext);
		expect(errors.some((e) => /Unknown blueprint "deck"/.test(e.message))).toBe(true);
	});
});
