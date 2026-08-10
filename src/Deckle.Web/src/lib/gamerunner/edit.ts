/**
 * Pure AST-edit helpers for the setup DSL — the tested seam behind the graphical
 * sentence-builder editor (#123). The editor's state *is* the DSL AST (lossless
 * round-trip, #104), so every structural gesture in the UI (add / delete / move
 * a step, insert between steps, change a verb, set a slot value) is a small,
 * deterministic mutation defined and unit-tested here rather than buried in a
 * component.
 *
 * The list operations mutate the passed `SetupNode[]` in place: the editor holds
 * the document as Svelte `$state`, whose deep proxy makes in-place mutation
 * reactive. Keeping them here (not inline in `.svelte`) is what makes them
 * testable — see `edit.test.ts`.
 *
 * NOTE (per #101/#98): the sentence-builder is the chosen surface, with Blockly
 * held in reserve as the escape hatch if the language outgrows a linear
 * step-list. If that day comes, this helper layer (which manipulates the AST,
 * not the DOM) is the seam a Blockly adapter would target instead of a rewrite.
 */

import { validateGameSetup } from './validate';
import type {
	Action,
	ForEachSeatNode,
	GameSetup,
	ProjectContext,
	SetupNode,
	Verb,
	WhenNode,
	ZoneReference
} from './types';

/** The kinds a new step can be created as: any verb, or a block node. */
export type NodeKind = Verb | 'when' | 'forEachSeat';

/** An empty zone reference — structurally present but unresolved, so validation
 * flags it and the editor renders an "a zone…" placeholder slot. */
function emptyRef(): ZoneReference {
	return { blueprint: '', role: '' };
}

/**
 * Build a fresh node of the given kind with sensible defaults. References are
 * left empty on purpose so the new step renders with clearly-unfilled slots
 * (which live validation underlines) rather than guessing a target.
 */
export function createNode(kind: NodeKind): SetupNode {
	switch (kind) {
		case 'placeSeats':
			return { do: 'placeSeats', blueprint: '' };
		case 'placeZone':
			return { do: 'placeZone', blueprint: '' };
		case 'place':
			return { do: 'place', component: '', zone: emptyRef(), facing: 'down', count: 1 };
		case 'shuffle':
			return { do: 'shuffle', zone: emptyRef() };
		case 'deal':
			return { do: 'deal', count: 1, from: emptyRef(), to: emptyRef(), facing: 'down' };
		case 'move':
			return { do: 'move', from: emptyRef(), to: emptyRef() };
		case 'flip':
			return { do: 'flip', zone: emptyRef(), facing: 'up' };
		case 'roll':
			return { do: 'roll', component: '' };
		case 'when':
			return {
				when: { op: 'eq', left: { get: 'playerCount' }, right: { const: 2 } },
				then: []
			} satisfies WhenNode;
		case 'forEachSeat':
			return { forEachSeat: { body: [] } } satisfies ForEachSeatNode;
	}
}

// ---------------------------------------------------------------------------
// Structural list operations (mutate in place)
// ---------------------------------------------------------------------------

/** Insert `node` at `index` (clamped into range). */
export function insertStep(list: SetupNode[], index: number, node: SetupNode): void {
	const i = Math.max(0, Math.min(index, list.length));
	list.splice(i, 0, node);
}

/** Append `node` to the end of the list. */
export function appendStep(list: SetupNode[], node: SetupNode): void {
	list.push(node);
}

/** Delete the step at `index` (no-op when out of range). */
export function deleteStep(list: SetupNode[], index: number): void {
	if (index < 0 || index >= list.length) return;
	list.splice(index, 1);
}

/**
 * Move the step at `from` to `to`, where `to` is interpreted as the destination
 * index in the list *after* removal. No-op for out-of-range or identical
 * positions.
 */
export function moveStep(list: SetupNode[], from: number, to: number): void {
	if (from < 0 || from >= list.length) return;
	const clampedTo = Math.max(0, Math.min(to, list.length - 1));
	if (from === clampedTo) return;
	const [node] = list.splice(from, 1);
	list.splice(clampedTo, 0, node);
}

/** Move the step at `index` by `delta` positions (e.g. -1 up, +1 down). */
export function moveStepBy(list: SetupNode[], index: number, delta: number): void {
	moveStep(list, index, index + delta);
}

/**
 * Replace the action at `index` with a fresh default of `verb`. Verbs share
 * little structure, so a clean re-create is clearer than field-by-field
 * migration; the UI re-renders the new sentence with its own slots.
 */
export function changeVerb(list: SetupNode[], index: number, verb: Verb): void {
	if (index < 0 || index >= list.length) return;
	list[index] = createNode(verb);
}

/**
 * Set a single slot value on a node (or nested holder). A thin, typed wrapper so
 * slot writes go through one tested path; the mutation is what drives the
 * reactive re-validate.
 */
export function setSlotValue<T extends object, K extends keyof T>(
	holder: T,
	key: K,
	value: T[K]
): void {
	holder[key] = value;
}

// ---------------------------------------------------------------------------
// Validity
// ---------------------------------------------------------------------------

/**
 * Compute the persisted validity flag for a document (per #110 the client
 * computes this at save time and the server stores it verbatim). True iff the
 * document has zero validation errors against the project context.
 */
export function computeIsValid(doc: unknown, ctx: ProjectContext): boolean {
	return validateGameSetup(doc, ctx).length === 0;
}

// ---------------------------------------------------------------------------
// Zone reference options (for the zone dropdown slots)
// ---------------------------------------------------------------------------

/** A selectable zone target for a dropdown slot. */
export interface ZoneOption {
	/** Stable key = `${blueprint}::${role}`, matches {@link zoneRefKey}. */
	key: string;
	/** Human label, e.g. `hand (Player area)`. */
	label: string;
	/** The reference to write when this option is chosen. */
	ref: ZoneReference;
}

/**
 * Stable key for a zone reference, keyed on the (blueprint, role) pair that
 * identifies which zone template it points at. Selectors (seat/edge) are
 * assigned by context and are not part of the key.
 */
export function zoneRefKey(ref: ZoneReference | undefined): string {
	if (!ref || !ref.blueprint || !ref.role) return '';
	return `${ref.blueprint}::${ref.role}`;
}

/**
 * Enumerate the zone targets a slot can point at, one per (blueprint, role).
 * The seat/edge selector is derived from scope and context: seat zones resolve
 * to the loop seat inside a `forEachSeat` (`current`) and otherwise fan out
 * (`each`); edge zones fan out. (Explicit index selection is a later
 * refinement — see #123 notes.)
 */
export function zoneOptions(doc: GameSetup, insideSeatLoop = false): ZoneOption[] {
	const options: ZoneOption[] = [];
	for (const bp of doc.blueprints ?? []) {
		for (const zone of bp.zones ?? []) {
			const ref: ZoneReference = { blueprint: bp.id, role: zone.role };
			if (bp.scope === 'seat') {
				ref.seat = insideSeatLoop ? { kind: 'current' } : { kind: 'each' };
			} else if (bp.scope === 'edge') {
				ref.edge = { kind: 'each' };
			}
			options.push({
				key: `${bp.id}::${zone.role}`,
				label: `${zone.name || zone.role} (${bp.displayName})`,
				ref
			});
		}
	}
	return options;
}

/** Narrowing guard: is this node an action (has a `do` verb)? */
export function isAction(node: SetupNode): node is Action {
	return 'do' in node;
}

/** Narrowing guard: is this node a `when` conditional? */
export function isWhenNode(node: SetupNode): node is WhenNode {
	return 'when' in node;
}

/** Narrowing guard: is this node a `forEachSeat` loop? */
export function isForEachSeatNode(node: SetupNode): node is ForEachSeatNode {
	return 'forEachSeat' in node;
}
