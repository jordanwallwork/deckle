/**
 * Setup DSL types.
 *
 * The setup DSL is a JSON AST — there is no parsed text grammar; the graphical
 * sentence-builder editor is the authoring surface and the AST is what it reads
 * and writes (lossless round-trip). The types here define that AST plus the
 * error models used by validation (static) and execution (runtime).
 *
 * The language is *designed for growth* into full game rules (phases, moves,
 * triggers, end conditions) but only setup features are modelled here; the
 * reserved keys on {@link GameSetup} hold that space without being used yet.
 *
 * See design decisions on issue #98 (#104 core semantics, #102 zone/seat model,
 * #103 ownership/visibility, #110 validation & failure semantics).
 */

/**
 * The document version understood by this build. Documents are migrated on read
 * (client-side `upgradeGameSetup` chain, elsewhere) up to this ceiling; a
 * document declaring a higher version cannot be understood and is rejected by
 * {@link validateGameSetup}.
 */
export const CURRENT_SETUP_VERSION = 1;

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

/**
 * A named setup configuration. Persisted server-side (one jsonb document per
 * {@link GameSetup}) and belonging to a project.
 */
export interface GameSetup {
	/** Schema version; enables future migrations. See {@link CURRENT_SETUP_VERSION}. */
	version: number;
	/** Smallest supported player count (>= 1, <= {@link maxPlayers}). */
	minPlayers: number;
	/** Largest supported player count. */
	maxPlayers: number;
	/** Options surfaced in the Play prompt and readable via `get: 'option'`. */
	options: SetupOption[];
	/** Zone bundles the setup steps instantiate by id. */
	blueprints: ZoneBlueprint[];
	/** The ordered setup program. */
	setup: SetupNode[];

	// Reserved for growth into full rules — not interpreted at setup scope.
	phases?: unknown;
	moves?: unknown;
	triggers?: unknown;
	end?: unknown;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export type SetupOptionType = 'boolean' | 'number' | 'select';

interface SetupOptionBase {
	/** Stable id referenced by `get: 'option'`. Unique within the document. */
	id: string;
	/** Human label shown in the Play prompt. */
	label: string;
}

export interface BooleanOption extends SetupOptionBase {
	type: 'boolean';
	default: boolean;
}

export interface NumberOption extends SetupOptionBase {
	type: 'number';
	default: number;
	min?: number;
	max?: number;
}

export interface SelectOption extends SetupOptionBase {
	type: 'select';
	/** Allowed values; `default` must be one of these. */
	choices: string[];
	default: string;
}

export type SetupOption = BooleanOption | NumberOption | SelectOption;

// ---------------------------------------------------------------------------
// Zones & blueprints
// ---------------------------------------------------------------------------

/**
 * Zone scope. `table` zones are unowned and shared; `seat` zones are stamped
 * once per seat and owned by that seat; `edge` zones sit between seats (always
 * N edges for N seats) and are unowned.
 */
export type ZoneScope = 'table' | 'seat' | 'edge';

/** How a zone's cards present to viewers (orthogonal to per-card flip). */
export type FaceVisibility = 'all' | 'owner' | 'others' | 'none';

/** Whether the zone's contents are hidden from non-owners entirely. */
export type ZonePresence = 'visible' | 'hidden-from-non-owners';

/**
 * A drawn zone bundle. The script instantiates blueprints by {@link id}; the
 * blueprint's {@link role} doubles as its display name and must be unique.
 */
export interface ZoneBlueprint {
	/** Stable id, referenced by {@link ZoneReference.blueprint} and place verbs. */
	id: string;
	/** Fixed scope of this blueprint. */
	scope: ZoneScope;
	/** Display name / role label. Unique within the document. */
	role: string;
	faceVisibility: FaceVisibility;
	presence: ZonePresence;
}

/** Which seat a seat-scoped {@link ZoneReference} resolves to. */
export type SeatSelector =
	| { kind: 'each' } // implicit fan-out across all seats
	| { kind: 'current' } // the loop seat; only valid inside a forEachSeat node
	| { kind: 'index'; index: number };

/** Which edge an edge-scoped {@link ZoneReference} resolves to. */
export type EdgeSelector = { kind: 'each' } | { kind: 'index'; index: number };

/**
 * A reference to a zone (or a fan-out set of zones). Zones are addressed by the
 * blueprint that defines them; seat/edge blueprints resolve to one zone per
 * seat/edge, so a selector narrows which. Component ids never appear here — only
 * spawn steps ({@link PlaceAction}, {@link RollAction}) name components.
 */
export interface ZoneReference {
	/** {@link ZoneBlueprint.id} of the target zone bundle. */
	blueprint: string;
	/** Required for seat-scoped blueprints; invalid otherwise. */
	seat?: SeatSelector;
	/** Required for edge-scoped blueprints; invalid otherwise. */
	edge?: EdgeSelector;
}

// ---------------------------------------------------------------------------
// Value expressions & conditions
// ---------------------------------------------------------------------------

/** The primitive types a {@link ValueExpr} can evaluate to. */
export type ValueType = 'number' | 'string' | 'boolean';

/**
 * A typed value expression, readable inside conditions. `get` expressions pull
 * from the run context; `const` is a literal.
 */
export type ValueExpr =
	| { get: 'playerCount' } // number
	| { get: 'option'; option: string } // type follows the option's declaration
	| { get: 'count'; zone: ZoneReference } // number of cards in a zone
	| { get: 'cardField'; field: string } // string, in card-scoped context
	| { const: number | string | boolean };

/** Comparison operators. Ordering operators require numeric operands. */
export type ComparisonOp = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte';

export interface Comparison {
	op: ComparisonOp;
	left: ValueExpr;
	right: ValueExpr;
}

/**
 * A boolean condition. Three-layer algebra: `all`/`any`/`not` combinators over
 * typed {@link Comparison}s.
 */
export type Condition =
	| { all: Condition[] }
	| { any: Condition[] }
	| { not: Condition }
	| Comparison;

// ---------------------------------------------------------------------------
// Actions (verbs)
// ---------------------------------------------------------------------------

/** Card facing when placed/dealt/flipped. */
export type Facing = 'up' | 'down';

/** The eight setup verbs. */
export type Verb =
	| 'placeSeats'
	| 'placeZone'
	| 'place'
	| 'shuffle'
	| 'deal'
	| 'move'
	| 'flip'
	| 'roll';

/** Instantiate the seat ring by stamping a seat-scoped blueprint once per seat. */
export interface PlaceSeatsAction {
	do: 'placeSeats';
	/** A seat-scoped {@link ZoneBlueprint.id}. */
	blueprint: string;
}

/** Instantiate a table- or edge-scoped zone from a blueprint. */
export interface PlaceZoneAction {
	do: 'placeZone';
	/** A table- or edge-scoped {@link ZoneBlueprint.id}. */
	blueprint: string;
	/** Required when the blueprint is edge-scoped. */
	edge?: EdgeSelector;
}

/** Spawn component instances into a zone. */
export interface PlaceAction {
	do: 'place';
	/** Component id — the only place a component id may appear (besides roll). */
	component: string;
	zone: ZoneReference;
	facing?: Facing;
	/** How many to spawn (default 1). */
	count?: number;
}

/** Shuffle the cards in a zone. */
export interface ShuffleAction {
	do: 'shuffle';
	zone: ZoneReference;
}

/** Deal cards from one zone to another (fan-out via `to`'s seat selector). */
export interface DealAction {
	do: 'deal';
	/** Number of cards per target. A literal or a numeric value expression. */
	count: number | ValueExpr;
	from: ZoneReference;
	to: ZoneReference;
	facing?: Facing;
}

/** Move cards between zones. */
export interface MoveAction {
	do: 'move';
	/** Number of cards to move; omit to move all. */
	count?: number;
	from: ZoneReference;
	to: ZoneReference;
	facing?: Facing;
}

/** Flip the cards in a zone to a facing. */
export interface FlipAction {
	do: 'flip';
	zone: ZoneReference;
	facing: Facing;
}

/** Roll dice. */
export interface RollAction {
	do: 'roll';
	/** Dice component id. */
	component: string;
	/** Optional zone to place the rolled dice into. */
	zone?: ZoneReference;
}

export type Action =
	| PlaceSeatsAction
	| PlaceZoneAction
	| PlaceAction
	| ShuffleAction
	| DealAction
	| MoveAction
	| FlipAction
	| RollAction;

// ---------------------------------------------------------------------------
// Nodes
// ---------------------------------------------------------------------------

/** Conditional branch: run `then` when `when` holds, else `else`. */
export interface WhenNode {
	when: Condition;
	then: SetupNode[];
	else?: SetupNode[];
}

/** Explicit loop over seats; `{ seat: { kind: 'current' } }` is valid in `body`. */
export interface ForEachSeatNode {
	forEachSeat: {
		body: SetupNode[];
	};
}

/** A node in the setup program: an action, a conditional, or a seat loop. */
export type SetupNode = Action | WhenNode | ForEachSeatNode;

// ---------------------------------------------------------------------------
// Error models
// ---------------------------------------------------------------------------

/**
 * A static validation error. Flat model: a JSON-ish path into the document plus
 * a human message. Errors only — there are no warnings.
 */
export interface SetupValidationError {
	/** Path into the document, e.g. `setup[2].to.blueprint`. */
	docPath: string;
	message: string;
}

/** Closed union of runtime failure kinds (produced by the interpreter, not the validator). */
export type SetupRunErrorKind =
	| 'insufficient-cards'
	| 'zone-not-on-table'
	| 'card-field-miss'
	| 'stale-reference'
	| 'internal';

/**
 * A runtime failure. Failed runs apply nothing; the error is surfaced in the
 * Play dialog. Carries the {@link SetupRunErrorKind} plus the path of the step
 * that failed.
 */
export interface SetupRunError {
	kind: SetupRunErrorKind;
	docPath: string;
	message: string;
}

// ---------------------------------------------------------------------------
// Validation input
// ---------------------------------------------------------------------------

/** A component visible to the setup, used for referential-integrity checks. */
export interface ProjectComponentRef {
	id: string;
	name: string;
	type: 'Card' | 'Dice' | 'GameBoard' | 'PlayerMat';
}

/** The project-scoped facts {@link validateGameSetup} needs. */
export interface ProjectContext {
	components: ProjectComponentRef[];
}
