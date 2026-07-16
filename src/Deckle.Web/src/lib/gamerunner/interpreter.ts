/**
 * The setup DSL interpreter (issue #117, architecture decision #108).
 *
 * `runSetup` is a PURE function: it walks the JSON AST of a statically-valid
 * {@link GameSetup} document and builds a {@link TabletopState} up from a blank
 * table, emitting a linear {@link SetupStep} trace that the animated-replay
 * layer (#107) consumes. It never touches `Math.random`, the DOM, the network
 * or the clock — all randomness comes from a seeded PRNG threaded through an
 * explicit {@link RunContext}, and all ids are minted from a deterministic
 * counter on that context. Same seed + options + playerCount ⇒ identical output.
 *
 * The interpreter assumes the document already passed {@link validateGameSetup}
 * (structure, referential integrity, condition typing). It does NOT re-run those
 * checks; it only fails fast on the runtime conditions validation cannot see —
 * insufficient cards, a reference to a zone not on the table, a missing card
 * field — surfacing each as a closed-union {@link SetupRunError}. A failed run
 * applies nothing: `runSetup` returns a result union, never a partial state.
 *
 * State reuse: the output is exactly the tabletop engine's `TabletopState`, and
 * the pure tabletop operations (`shufflePile`, `rollPile`, …) do the shuffling
 * and rolling. Blueprint instantiation reuses #115's `instantiateBlueprint` /
 * `placeZone`. Ownership & visibility ride alongside as a #116 `VisibilityMap`
 * (the tabletop `Zone` deliberately carries no ownership fields), so the result
 * feeds straight into `computeViewState`.
 */

import {
	DEFAULT_GRID_CELL_HEIGHT,
	DEFAULT_GRID_CELL_WIDTH,
	DEFAULT_GRID_COLUMNS,
	DEFAULT_SPREAD_OVERLAP
} from '../tabletop/zones';
import { rollPile, shufflePile } from '../tabletop/operations';
import type { Card, Pile, TabletopState, Templates, Zone } from '../tabletop/types';
import type { VisibilityMap, ZoneVisibility } from '../tabletop/visibility';
import { instantiateBlueprint, placedZoneId, placeZone, type PlacedZone } from './instantiate';
import { createRng } from './rng';
import type {
	Action,
	Blueprint,
	Comparison,
	Condition,
	DealAction,
	EdgeSelector,
	Facing,
	FlipAction,
	GameSetup,
	MoveAction,
	PlaceAction,
	PlaceSeatsAction,
	PlaceZoneAction,
	RollAction,
	SetupNode,
	SetupRunError,
	SetupRunErrorKind,
	ShuffleAction,
	ValueExpr,
	Verb,
	WhenNode,
	ZoneReference
} from './types';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** The per-run inputs to {@link runSetup} (mirrors decision #108's signature). */
export interface RunSetupInput {
	/** How many seats to build (must sit within the document's min/max). */
	playerCount: number;
	/** Chosen option values, keyed by {@link SetupOption.id}. */
	options: Record<string, string | number | boolean>;
	/** Determinism seed; same seed + options + playerCount ⇒ identical output. */
	seed: number;
	/** Component templates available to spawn (from `buildInitialTabletop`). */
	templates: Templates;
}

/** A dealt card in a {@link SetupStep} trace (one per card handed out). */
export interface DealtCard {
	toZoneId: string;
	cardId: string;
	pileId: string;
	facing?: Facing;
}

/** One target of a `move` step (a source may fan out across several targets). */
export interface MovedCards {
	toZoneId: string;
	cardIds: string[];
	pileId: string | null;
	facing?: Facing;
}

/** One die result in a `roll` step. */
export interface DieRoll {
	cardId: string;
	value: number;
}

/**
 * One executed verb, in execution order. Rich enough for #107's replay to
 * re-enact the change: the verb, its resolved target zones/components, and the
 * concrete piles/cards it created or touched. Discriminated by {@link Verb}.
 */
export type SetupStep =
	| { verb: 'placeSeats'; docPath: string; blueprint: string; zoneIds: string[]; seatCount: number }
	| { verb: 'placeZone'; docPath: string; blueprint: string; zoneIds: string[] }
	| {
			verb: 'place';
			docPath: string;
			component: string;
			zoneIds: string[];
			pileIds: string[];
			cardIds: string[];
			facing: Facing;
	  }
	| { verb: 'shuffle'; docPath: string; zoneIds: string[]; orders: Record<string, string[]> }
	| { verb: 'deal'; docPath: string; fromZoneId: string; count: number; deals: DealtCard[] }
	| { verb: 'move'; docPath: string; fromZoneId: string; moves: MovedCards[] }
	| { verb: 'flip'; docPath: string; zoneIds: string[]; facing: Facing; cardIds: string[] }
	| {
			verb: 'roll';
			docPath: string;
			component: string;
			zoneId: string | null;
			pileIds: string[];
			rolls: DieRoll[];
	  };

/** A successful run: the built table, the ownership map, and the step trace. */
export interface RunSetupSuccess {
	ok: true;
	state: TabletopState;
	visibility: VisibilityMap;
	trace: SetupStep[];
}

/**
 * The result of {@link runSetup}. A discriminated union rather than a throw:
 * `ok: true` carries the state/trace; `ok: false` carries the
 * {@link SetupRunError}. A failed run applies nothing — there is no partial
 * state to inspect.
 */
export type RunSetupResult = RunSetupSuccess | { ok: false; error: SetupRunError };

// ---------------------------------------------------------------------------
// Run context & fail-fast
// ---------------------------------------------------------------------------

/**
 * The mutable execution context threaded through every op: the seeded PRNG, the
 * id counter, and the resolved run inputs. This is the single source of both
 * randomness and identity, which is what makes a run reproducible.
 */
interface RunContext {
	random: () => number;
	playerCount: number;
	options: Record<string, string | number | boolean>;
	templates: Templates;
	/** Blueprints indexed by id for reference resolution. */
	blueprints: Map<string, Blueprint>;
	state: TabletopState;
	visibility: VisibilityMap;
	trace: SetupStep[];
	counter: number;
}

/** A card-scoped evaluation frame (only present when a card field is in scope). */
interface CardScope {
	mergeData: Record<string, string> | null;
}

/** Thrown internally to unwind a failed run; caught at the {@link runSetup} boundary. */
class SetupRunFailure extends Error {
	constructor(readonly error: SetupRunError) {
		super(error.message);
		this.name = 'SetupRunFailure';
	}
}

function fail(kind: SetupRunErrorKind, docPath: string, message: string): never {
	throw new SetupRunFailure({ kind, docPath, message });
}

function nextId(ctx: RunContext, prefix: string): string {
	ctx.counter += 1;
	return `${prefix}-${ctx.counter}`;
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function emptyState(): TabletopState {
	return {
		cards: {},
		piles: {},
		zones: {},
		zoneOrder: [],
		rootPileIds: [],
		selection: { kind: 'none' },
		editingZoneId: null
	};
}

// ---------------------------------------------------------------------------
// Zone placement (placeSeats / placeZone)
// ---------------------------------------------------------------------------

/** Turn a #115 {@link PlacedZone} into a concrete tabletop {@link Zone}. */
function placedToZone(placed: PlacedZone): Zone {
	const base = {
		id: placed.id,
		name: placed.name,
		x: placed.rect.x,
		y: placed.rect.y,
		width: placed.rect.width,
		height: placed.rect.height,
		pileIds: [] as string[],
		locked: false
	};
	switch (placed.type) {
		case 'freeform':
			return { ...base, type: 'freeform' };
		case 'group':
			return { ...base, type: 'group' };
		case 'spread':
			return {
				...base,
				type: 'spread',
				direction: placed.spread?.direction ?? 'row',
				overlap: placed.spread?.overlap ?? DEFAULT_SPREAD_OVERLAP
			};
		case 'grid':
			return {
				...base,
				type: 'grid',
				cellWidth: placed.grid?.cellWidth ?? DEFAULT_GRID_CELL_WIDTH,
				cellHeight: placed.grid?.cellHeight ?? DEFAULT_GRID_CELL_HEIGHT,
				columns: placed.grid?.columns ?? DEFAULT_GRID_COLUMNS
			};
	}
}

/** Add a placed zone to the table plus its ownership/visibility metadata. */
function addPlacedZone(ctx: RunContext, placed: PlacedZone): string {
	ctx.state.zones[placed.id] = placedToZone(placed);
	ctx.state.zoneOrder.push(placed.id);
	const vis: ZoneVisibility = {
		faceVisibility: placed.faceVisibility,
		presence: placed.presence
	};
	if (placed.seatIndex !== undefined) vis.ownerSeat = placed.seatIndex;
	ctx.visibility[placed.id] = vis;
	return placed.id;
}

function runPlaceSeats(ctx: RunContext, action: PlaceSeatsAction, docPath: string): void {
	const blueprint = ctx.blueprints.get(action.blueprint);
	if (!blueprint) fail('internal', `${docPath}.blueprint`, `Unknown blueprint "${action.blueprint}".`);
	const placed = instantiateBlueprint(blueprint, ctx.playerCount);
	const zoneIds = placed.map((p) => addPlacedZone(ctx, p));
	ctx.trace.push({
		verb: 'placeSeats',
		docPath,
		blueprint: action.blueprint,
		zoneIds,
		seatCount: ctx.playerCount
	});
}

function runPlaceZone(ctx: RunContext, action: PlaceZoneAction, docPath: string): void {
	const blueprint = ctx.blueprints.get(action.blueprint);
	if (!blueprint) fail('internal', `${docPath}.blueprint`, `Unknown blueprint "${action.blueprint}".`);

	let placed: PlacedZone[];
	if (blueprint.scope === 'edge') {
		const indices = resolveEdgeIndices(ctx, action.edge, `${docPath}.edge`);
		placed = indices.flatMap((i) => placeZone(blueprint, i));
	} else {
		placed = placeZone(blueprint);
	}
	const zoneIds = placed.map((p) => addPlacedZone(ctx, p));
	ctx.trace.push({ verb: 'placeZone', docPath, blueprint: action.blueprint, zoneIds });
}

// ---------------------------------------------------------------------------
// Reference resolution
// ---------------------------------------------------------------------------

function resolveEdgeIndices(ctx: RunContext, edge: EdgeSelector | undefined, docPath: string): number[] {
	if (!edge) fail('internal', docPath, 'edge selector required for an edge-scoped blueprint.');
	if (edge.kind === 'each') return range(ctx.playerCount);
	return [edge.index];
}

function range(n: number): number[] {
	return Array.from({ length: Math.max(0, n) }, (_, i) => i);
}

/**
 * Resolve a {@link ZoneReference} to the concrete tabletop zone id(s) it names,
 * fanning out for `each` selectors. Each resolved zone must already be on the
 * table (placed by a prior placeSeats/placeZone) — a miss is a runtime
 * `zone-not-on-table` failure, exactly the case static validation cannot see.
 */
function resolveZoneRefs(
	ctx: RunContext,
	ref: ZoneReference,
	docPath: string,
	loopSeat: number | undefined
): string[] {
	const blueprint = ctx.blueprints.get(ref.blueprint);
	if (!blueprint) fail('internal', `${docPath}.blueprint`, `Unknown blueprint "${ref.blueprint}".`);
	const zone = blueprint.zones.find((z) => z.role === ref.role);
	if (!zone) fail('internal', `${docPath}.role`, `Blueprint "${ref.blueprint}" has no role "${ref.role}".`);

	const indices = placementIndices(ctx, blueprint.scope, ref, docPath, loopSeat);
	const ids = indices.map((i) => placedZoneId(blueprint.id, zone.id, blueprint.scope, i));

	for (const id of ids) {
		if (!ctx.state.zones[id]) {
			fail('zone-not-on-table', docPath, `Zone "${ref.role}" is not on the table when this step runs.`);
		}
	}
	return ids;
}

function placementIndices(
	ctx: RunContext,
	scope: Blueprint['scope'],
	ref: ZoneReference,
	docPath: string,
	loopSeat: number | undefined
): number[] {
	if (scope === 'table') return [0];
	if (scope === 'edge') return resolveEdgeIndices(ctx, ref.edge, `${docPath}.edge`);

	// seat scope
	const seat = ref.seat;
	if (!seat) fail('internal', `${docPath}.seat`, 'seat selector required for a seat-scoped zone.');
	switch (seat.kind) {
		case 'each':
			return range(ctx.playerCount);
		case 'index':
			return [seat.index];
		case 'current':
			if (loopSeat === undefined) {
				fail('internal', `${docPath}.seat`, 'seat "current" used outside a forEachSeat loop.');
			}
			return [loopSeat];
	}
}

/** Resolve a reference that must name exactly one zone (deal/move source). */
function resolveSingleZone(
	ctx: RunContext,
	ref: ZoneReference,
	docPath: string,
	loopSeat: number | undefined
): string {
	const ids = resolveZoneRefs(ctx, ref, docPath, loopSeat);
	if (ids.length !== 1) {
		fail('internal', docPath, 'Expected a reference to a single zone here.');
	}
	return ids[0];
}

// ---------------------------------------------------------------------------
// Card / pile primitives
// ---------------------------------------------------------------------------

function makeCard(
	ctx: RunContext,
	templateId: string,
	mergeData: Record<string, string> | null,
	isFlipped: boolean
): string {
	const card: Card = { id: nextId(ctx, 'card'), templateId, mergeData, isFlipped, rotation: 0 };
	ctx.state.cards[card.id] = card;
	return card.id;
}

/** Create a pile holding the given cards in a zone (or the root table when null). */
function makePile(ctx: RunContext, zoneId: string | null, cardIds: string[]): string {
	const pile: Pile = { id: nextId(ctx, 'pile'), zoneId, x: 0, y: 0, locked: false, cardIds };
	ctx.state.piles[pile.id] = pile;
	if (zoneId === null) ctx.state.rootPileIds.push(pile.id);
	else ctx.state.zones[zoneId].pileIds.push(pile.id);
	return pile.id;
}

/**
 * Draw the top card from a zone, removing it. Cards are drawn from the top of
 * the zone's last pile (a deck is one pile, top = end of `cardIds`); an emptied
 * pile is removed so the zone never holds a phantom empty stack. Returns null
 * when the zone holds no cards.
 */
function drawTopCard(ctx: RunContext, zoneId: string): string | null {
	const zone = ctx.state.zones[zoneId];
	for (let i = zone.pileIds.length - 1; i >= 0; i--) {
		const pile = ctx.state.piles[zone.pileIds[i]];
		if (!pile || pile.cardIds.length === 0) continue;
		const cardId = pile.cardIds.pop() as string;
		if (pile.cardIds.length === 0) {
			zone.pileIds.splice(i, 1);
			delete ctx.state.piles[pile.id];
		}
		return cardId;
	}
	return null;
}

/** Apply a facing to a card, honouring flippability (dice never flip). */
function applyFacing(ctx: RunContext, cardId: string, facing: Facing | undefined): void {
	if (facing === undefined) return;
	const card = ctx.state.cards[cardId];
	const template = ctx.templates[card.templateId];
	if (template?.flippable === false) return;
	card.isFlipped = facing === 'down';
}

// ---------------------------------------------------------------------------
// Verbs that touch cards
// ---------------------------------------------------------------------------

function runPlace(ctx: RunContext, action: PlaceAction, docPath: string, loopSeat: number | undefined): void {
	const template = ctx.templates[action.component];
	if (!template) fail('internal', `${docPath}.component`, `Unknown component "${action.component}".`);

	const zoneIds = resolveZoneRefs(ctx, action.zone, `${docPath}.zone`, loopSeat);
	const count = action.count ?? 1;
	// Face heuristic mirrors the tabletop's spawn: an explicit facing wins;
	// otherwise a multi-card flippable stack spawns face-down (a deck).
	const heuristicDown = template.flippable && template.instances.length > 1;
	const faceDown = action.facing ? action.facing === 'down' : heuristicDown;
	const facing: Facing = faceDown ? 'down' : 'up';

	const pileIds: string[] = [];
	const cardIds: string[] = [];
	for (const zoneId of zoneIds) {
		for (let i = 0; i < count; i++) {
			const cards = template.instances.map((inst) =>
				makeCard(ctx, template.id, inst, template.flippable ? faceDown : false)
			);
			pileIds.push(makePile(ctx, zoneId, cards));
			cardIds.push(...cards);
		}
	}
	ctx.trace.push({ verb: 'place', docPath, component: action.component, zoneIds, pileIds, cardIds, facing });
}

function runShuffle(ctx: RunContext, action: ShuffleAction, docPath: string, loopSeat: number | undefined): void {
	const zoneIds = resolveZoneRefs(ctx, action.zone, `${docPath}.zone`, loopSeat);
	const orders: Record<string, string[]> = {};
	for (const zoneId of zoneIds) {
		const zone = ctx.state.zones[zoneId];
		// Shuffle each multi-card pile (a deck) in place, and permute pile order
		// so multi-pile zones shuffle too. Both draw from the seeded PRNG.
		for (const pileId of zone.pileIds) shufflePile(ctx.state, pileId, ctx.random);
		if (zone.pileIds.length > 1) {
			zone.pileIds = fisherYates(zone.pileIds, ctx.random);
		}
		orders[zoneId] = zone.pileIds.flatMap((id) => ctx.state.piles[id].cardIds);
	}
	ctx.trace.push({ verb: 'shuffle', docPath, zoneIds, orders });
}

function fisherYates<T>(items: readonly T[], random: () => number): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

function runDeal(ctx: RunContext, action: DealAction, docPath: string, loopSeat: number | undefined): void {
	const fromZoneId = resolveSingleZone(ctx, action.from, `${docPath}.from`, loopSeat);
	const toZoneIds = resolveZoneRefs(ctx, action.to, `${docPath}.to`, loopSeat);
	const count = resolveCount(ctx, action.count, `${docPath}.count`, loopSeat);

	const deals: DealtCard[] = [];
	// One card at a time, round-robin across targets — the physical deal, and
	// what makes "not enough cards" fail the same way it would on a real table.
	for (let n = 0; n < count; n++) {
		for (const toZoneId of toZoneIds) {
			const cardId = drawTopCard(ctx, fromZoneId);
			if (cardId === null) {
				fail('insufficient-cards', docPath, 'Not enough cards to complete this deal.');
			}
			applyFacing(ctx, cardId, action.facing);
			const pileId = makePile(ctx, toZoneId, [cardId]);
			deals.push({ toZoneId, cardId, pileId, facing: action.facing });
		}
	}
	ctx.trace.push({ verb: 'deal', docPath, fromZoneId, count, deals });
}

function runMove(ctx: RunContext, action: MoveAction, docPath: string, loopSeat: number | undefined): void {
	const fromZoneId = resolveSingleZone(ctx, action.from, `${docPath}.from`, loopSeat);
	const toZoneIds = resolveZoneRefs(ctx, action.to, `${docPath}.to`, loopSeat);

	const moves: MovedCards[] = [];
	for (const toZoneId of toZoneIds) {
		// With a count, take exactly that many (failing if short). Without one,
		// drain the source into this target (only meaningful for a single target).
		const drawn: string[] = [];
		if (action.count === undefined) {
			let cardId = drawTopCard(ctx, fromZoneId);
			while (cardId !== null) {
				drawn.push(cardId);
				cardId = drawTopCard(ctx, fromZoneId);
			}
		} else {
			for (let n = 0; n < action.count; n++) {
				const cardId = drawTopCard(ctx, fromZoneId);
				if (cardId === null) {
					fail('insufficient-cards', docPath, 'Not enough cards to complete this move.');
				}
				drawn.push(cardId);
			}
		}
		// Cards were drawn top-first; reverse so the moved stack keeps the source's
		// bottom-to-top order in its new pile.
		const cardIds = drawn.reverse();
		for (const cardId of cardIds) applyFacing(ctx, cardId, action.facing);
		const pileId = cardIds.length > 0 ? makePile(ctx, toZoneId, cardIds) : null;
		moves.push({ toZoneId, cardIds, pileId, facing: action.facing });
	}
	ctx.trace.push({ verb: 'move', docPath, fromZoneId, moves });
}

function runFlip(ctx: RunContext, action: FlipAction, docPath: string, loopSeat: number | undefined): void {
	const zoneIds = resolveZoneRefs(ctx, action.zone, `${docPath}.zone`, loopSeat);
	const cardIds: string[] = [];
	for (const zoneId of zoneIds) {
		const zone = ctx.state.zones[zoneId];
		for (const pileId of zone.pileIds) {
			for (const cardId of ctx.state.piles[pileId].cardIds) {
				const template = ctx.templates[ctx.state.cards[cardId].templateId];
				if (template?.flippable === false) continue;
				ctx.state.cards[cardId].isFlipped = action.facing === 'down';
				cardIds.push(cardId);
			}
		}
	}
	ctx.trace.push({ verb: 'flip', docPath, zoneIds, facing: action.facing, cardIds });
}

function runRoll(ctx: RunContext, action: RollAction, docPath: string, loopSeat: number | undefined): void {
	const template = ctx.templates[action.component];
	if (!template) fail('internal', `${docPath}.component`, `Unknown component "${action.component}".`);

	const zoneId = action.zone ? resolveSingleZone(ctx, action.zone, `${docPath}.zone`, loopSeat) : null;

	// Spawn each die as its own pile (dice never stack) and roll it from the
	// seeded PRNG via the existing tabletop operation.
	const pileIds: string[] = [];
	const rolls: DieRoll[] = [];
	for (const inst of template.instances) {
		const cardId = makeCard(ctx, template.id, inst, false);
		const pileId = makePile(ctx, zoneId, [cardId]);
		rollPile(ctx.state, ctx.templates, pileId, ctx.random);
		pileIds.push(pileId);
		rolls.push({ cardId, value: ctx.state.cards[cardId].diceValue ?? 0 });
	}
	ctx.trace.push({ verb: 'roll', docPath, component: action.component, zoneId, pileIds, rolls });
}

// ---------------------------------------------------------------------------
// Conditions & value expressions
// ---------------------------------------------------------------------------

function evalValue(
	ctx: RunContext,
	expr: ValueExpr,
	docPath: string,
	loopSeat: number | undefined,
	card: CardScope | undefined
): number | string | boolean {
	if ('const' in expr) return expr.const;
	switch (expr.get) {
		case 'playerCount':
			return ctx.playerCount;
		case 'option': {
			const value = ctx.options[expr.option];
			// Fall back to a neutral value; validation guarantees the option exists,
			// but an omitted choice at runtime should not crash the run.
			return value ?? 0;
		}
		case 'count': {
			const zoneIds = resolveZoneRefs(ctx, expr.zone, `${docPath}.zone`, loopSeat);
			return zoneIds.reduce((sum, id) => sum + countCardsInZone(ctx, id), 0);
		}
		case 'cardField': {
			if (!card) {
				fail('card-field-miss', docPath, `No card in scope to read field "${expr.field}".`);
			}
			const value = card.mergeData?.[expr.field];
			if (value === undefined) {
				fail('card-field-miss', docPath, `Card has no field "${expr.field}".`);
			}
			return value;
		}
	}
}

function countCardsInZone(ctx: RunContext, zoneId: string): number {
	const zone = ctx.state.zones[zoneId];
	return zone.pileIds.reduce((sum, id) => sum + (ctx.state.piles[id]?.cardIds.length ?? 0), 0);
}

function evalComparison(
	ctx: RunContext,
	cmp: Comparison,
	docPath: string,
	loopSeat: number | undefined,
	card: CardScope | undefined
): boolean {
	const left = evalValue(ctx, cmp.left, `${docPath}.left`, loopSeat, card);
	const right = evalValue(ctx, cmp.right, `${docPath}.right`, loopSeat, card);
	switch (cmp.op) {
		case 'eq':
			return left === right;
		case 'ne':
			return left !== right;
		case 'lt':
			return Number(left) < Number(right);
		case 'lte':
			return Number(left) <= Number(right);
		case 'gt':
			return Number(left) > Number(right);
		case 'gte':
			return Number(left) >= Number(right);
	}
}

function evalCondition(
	ctx: RunContext,
	condition: Condition,
	docPath: string,
	loopSeat: number | undefined,
	card: CardScope | undefined
): boolean {
	if ('all' in condition) {
		return condition.all.every((c, i) => evalCondition(ctx, c, `${docPath}.all[${i}]`, loopSeat, card));
	}
	if ('any' in condition) {
		return condition.any.some((c, i) => evalCondition(ctx, c, `${docPath}.any[${i}]`, loopSeat, card));
	}
	if ('not' in condition) {
		return !evalCondition(ctx, condition.not, `${docPath}.not`, loopSeat, card);
	}
	return evalComparison(ctx, condition, docPath, loopSeat, card);
}

// ---------------------------------------------------------------------------
// Node execution
// ---------------------------------------------------------------------------

const ACTION_VERBS = new Set<Verb>([
	'placeSeats',
	'placeZone',
	'place',
	'shuffle',
	'deal',
	'move',
	'flip',
	'roll'
]);

function isAction(node: SetupNode): node is Action {
	return 'do' in node && ACTION_VERBS.has((node as Action).do);
}

function runAction(ctx: RunContext, action: Action, docPath: string, loopSeat: number | undefined): void {
	switch (action.do) {
		case 'placeSeats':
			return runPlaceSeats(ctx, action, docPath);
		case 'placeZone':
			return runPlaceZone(ctx, action, docPath);
		case 'place':
			return runPlace(ctx, action, docPath, loopSeat);
		case 'shuffle':
			return runShuffle(ctx, action, docPath, loopSeat);
		case 'deal':
			return runDeal(ctx, action, docPath, loopSeat);
		case 'move':
			return runMove(ctx, action, docPath, loopSeat);
		case 'flip':
			return runFlip(ctx, action, docPath, loopSeat);
		case 'roll':
			return runRoll(ctx, action, docPath, loopSeat);
	}
}

function runNode(ctx: RunContext, node: SetupNode, docPath: string, loopSeat: number | undefined): void {
	if (isAction(node)) {
		runAction(ctx, node, docPath, loopSeat);
		return;
	}
	if ('when' in node) {
		const when = node as WhenNode;
		const branch = evalCondition(ctx, when.when, `${docPath}.when`, loopSeat, undefined)
			? when.then
			: (when.else ?? []);
		const key = branch === when.then ? 'then' : 'else';
		branch.forEach((child, i) => runNode(ctx, child, `${docPath}.${key}[${i}]`, loopSeat));
		return;
	}
	// forEachSeat
	const body = node.forEachSeat.body;
	for (let seat = 0; seat < ctx.playerCount; seat++) {
		body.forEach((child, i) =>
			runNode(ctx, child, `${docPath}.forEachSeat.body[${i}]`, seat)
		);
	}
}

function resolveCount(
	ctx: RunContext,
	count: number | ValueExpr,
	docPath: string,
	loopSeat: number | undefined
): number {
	if (typeof count === 'number') return count;
	const value = evalValue(ctx, count, docPath, loopSeat, undefined);
	const n = Number(value);
	if (!Number.isFinite(n) || n < 0) {
		fail('internal', docPath, 'count expression did not evaluate to a non-negative number.');
	}
	return Math.floor(n);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Execute a statically-valid setup document, building a fresh {@link TabletopState}.
 * Pure and deterministic: same `doc` + `input` (seed, options, playerCount)
 * yield byte-identical output. Returns a result union — a success carries the
 * built state, its {@link VisibilityMap} and the {@link SetupStep} trace; a
 * failure carries a {@link SetupRunError} and applies nothing.
 */
export function runSetup(doc: GameSetup, input: RunSetupInput): RunSetupResult {
	const ctx: RunContext = {
		random: createRng(input.seed, input.playerCount, input.options),
		playerCount: input.playerCount,
		options: input.options,
		templates: input.templates,
		blueprints: new Map(doc.blueprints.map((bp) => [bp.id, bp])),
		state: emptyState(),
		visibility: {},
		trace: [],
		counter: 0
	};

	try {
		doc.setup.forEach((node, i) => runNode(ctx, node, `setup[${i}]`, undefined));
	} catch (e) {
		if (e instanceof SetupRunFailure) return { ok: false, error: e.error };
		throw e;
	}

	return { ok: true, state: ctx.state, visibility: ctx.visibility, trace: ctx.trace };
}
