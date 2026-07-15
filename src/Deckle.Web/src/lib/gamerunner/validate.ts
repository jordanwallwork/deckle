/**
 * Static validation of a setup DSL document.
 *
 * Scope (per decision #110): structure + referential integrity + condition
 * type-checking. No flow analysis — whether a given step has enough cards, or
 * whether a zone is actually on the table when a step runs, is a *runtime*
 * concern surfaced as a {@link SetupRunError}, not caught here.
 *
 * The result is a flat array of {@link SetupValidationError} (errors only, no
 * warnings). Save is never gated on validity; this runs live in the editor and
 * as the pre-run gate, and the client persists the resulting validity boolean.
 *
 * The input is untyped (parsed JSON), so every access is defensive.
 */

import {
	CURRENT_SETUP_VERSION,
	type ProjectContext,
	type SetupValidationError,
	type ValueType,
	type ZoneScope
} from './types';

const VERBS = new Set([
	'placeSeats',
	'placeZone',
	'place',
	'shuffle',
	'deal',
	'move',
	'flip',
	'roll'
]);
const FACINGS = new Set(['up', 'down']);
const FACE_VISIBILITIES = new Set(['all', 'owner', 'others', 'none']);
const PRESENCES = new Set(['visible', 'hidden-from-non-owners']);
const ZONE_SCOPES = new Set<ZoneScope>(['table', 'seat', 'edge']);
const COMPARISON_OPS = new Set(['eq', 'ne', 'lt', 'lte', 'gt', 'gte']);
const ORDERING_OPS = new Set(['lt', 'lte', 'gt', 'gte']);

// ---------------------------------------------------------------------------
// Small type guards
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
	return typeof value === 'string';
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

function isNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
	return isNumber(value) && Number.isInteger(value);
}

// ---------------------------------------------------------------------------
// Validation context
// ---------------------------------------------------------------------------

interface Ctx {
	errors: SetupValidationError[];
	optionTypes: Map<string, ValueType>;
	blueprintScopes: Map<string, ZoneScope>;
	componentIds: Set<string>;
	componentTypes: Map<string, string>;
}

function err(ctx: Ctx, docPath: string, message: string): void {
	ctx.errors.push({ docPath, message });
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Validate a setup document against a project context.
 * @returns an empty array when the document is valid.
 */
export function validateGameSetup(doc: unknown, projectContext: ProjectContext): SetupValidationError[] {
	const ctx: Ctx = {
		errors: [],
		optionTypes: new Map(),
		blueprintScopes: new Map(),
		componentIds: new Set(projectContext.components.map((c) => c.id)),
		componentTypes: new Map(projectContext.components.map((c) => [c.id, c.type]))
	};

	if (!isObject(doc)) {
		err(ctx, '', 'Setup document must be an object.');
		return ctx.errors;
	}

	validateVersion(ctx, doc.version);
	validatePlayerCounts(ctx, doc.minPlayers, doc.maxPlayers);
	validateOptions(ctx, doc.options);
	validateBlueprints(ctx, doc.blueprints);
	validateSetupProgram(ctx, doc.setup);

	return ctx.errors;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function validateVersion(ctx: Ctx, version: unknown): void {
	if (!isInteger(version) || version < 1) {
		err(ctx, 'version', 'version must be a positive integer.');
		return;
	}
	if (version > CURRENT_SETUP_VERSION) {
		err(
			ctx,
			'version',
			`Unsupported version ${version}; this build understands up to ${CURRENT_SETUP_VERSION}.`
		);
	}
}

function validatePlayerCounts(ctx: Ctx, min: unknown, max: unknown): void {
	const minOk = isInteger(min) && min >= 1;
	const maxOk = isInteger(max) && max >= 1;
	if (!minOk) err(ctx, 'minPlayers', 'minPlayers must be an integer >= 1.');
	if (!maxOk) err(ctx, 'maxPlayers', 'maxPlayers must be an integer >= 1.');
	if (minOk && maxOk && min > max) {
		err(ctx, 'maxPlayers', 'maxPlayers must be >= minPlayers.');
	}
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

function validateOptions(ctx: Ctx, options: unknown): void {
	if (!Array.isArray(options)) {
		err(ctx, 'options', 'options must be an array.');
		return;
	}

	const seen = new Set<string>();
	options.forEach((opt, i) => validateOption(ctx, opt, `options[${i}]`, seen));
}

function validateOption(ctx: Ctx, opt: unknown, path: string, seen: Set<string>): void {
	if (!isObject(opt)) {
		err(ctx, path, 'Option must be an object.');
		return;
	}

	if (!isNonEmptyString(opt.id)) {
		err(ctx, `${path}.id`, 'Option id must be a non-empty string.');
	} else if (seen.has(opt.id)) {
		err(ctx, `${path}.id`, `Duplicate option id "${opt.id}".`);
	} else {
		seen.add(opt.id);
	}

	if (!isNonEmptyString(opt.label)) {
		err(ctx, `${path}.label`, 'Option label must be a non-empty string.');
	}

	switch (opt.type) {
		case 'boolean':
			if (typeof opt.default !== 'boolean') {
				err(ctx, `${path}.default`, 'Boolean option default must be true or false.');
			}
			registerOptionType(ctx, opt.id, 'boolean');
			break;
		case 'number':
			validateNumberOption(ctx, opt, path);
			registerOptionType(ctx, opt.id, 'number');
			break;
		case 'select':
			validateSelectOption(ctx, opt, path);
			registerOptionType(ctx, opt.id, 'string');
			break;
		default:
			err(ctx, `${path}.type`, 'Option type must be "boolean", "number" or "select".');
	}
}

function registerOptionType(ctx: Ctx, id: unknown, type: ValueType): void {
	if (isNonEmptyString(id) && !ctx.optionTypes.has(id)) {
		ctx.optionTypes.set(id, type);
	}
}

function validateNumberOption(ctx: Ctx, opt: Record<string, unknown>, path: string): void {
	if (!isNumber(opt.default)) {
		err(ctx, `${path}.default`, 'Number option default must be a number.');
	}
	const hasMin = opt.min !== undefined;
	const hasMax = opt.max !== undefined;
	if (hasMin && !isNumber(opt.min)) err(ctx, `${path}.min`, 'Option min must be a number.');
	if (hasMax && !isNumber(opt.max)) err(ctx, `${path}.max`, 'Option max must be a number.');
	if (hasMin && hasMax && isNumber(opt.min) && isNumber(opt.max) && opt.min > opt.max) {
		err(ctx, `${path}.min`, 'Option min must be <= max.');
	}
	if (isNumber(opt.default)) {
		if (hasMin && isNumber(opt.min) && opt.default < opt.min) {
			err(ctx, `${path}.default`, 'Number option default is below min.');
		}
		if (hasMax && isNumber(opt.max) && opt.default > opt.max) {
			err(ctx, `${path}.default`, 'Number option default is above max.');
		}
	}
}

function validateSelectOption(ctx: Ctx, opt: Record<string, unknown>, path: string): void {
	if (!Array.isArray(opt.choices) || opt.choices.length === 0) {
		err(ctx, `${path}.choices`, 'Select option choices must be a non-empty array.');
		return;
	}
	if (!opt.choices.every(isString)) {
		err(ctx, `${path}.choices`, 'Select option choices must all be strings.');
		return;
	}
	if (!isString(opt.default)) {
		err(ctx, `${path}.default`, 'Select option default must be a string.');
	} else if (!opt.choices.includes(opt.default)) {
		err(ctx, `${path}.default`, 'Select option default must be one of choices.');
	}
}

// ---------------------------------------------------------------------------
// Blueprints
// ---------------------------------------------------------------------------

function validateBlueprints(ctx: Ctx, blueprints: unknown): void {
	if (!Array.isArray(blueprints)) {
		err(ctx, 'blueprints', 'blueprints must be an array.');
		return;
	}

	const seenIds = new Set<string>();
	const seenRoles = new Set<string>();
	blueprints.forEach((bp, i) => validateBlueprint(ctx, bp, `blueprints[${i}]`, seenIds, seenRoles));
}

function validateBlueprint(
	ctx: Ctx,
	bp: unknown,
	path: string,
	seenIds: Set<string>,
	seenRoles: Set<string>
): void {
	if (!isObject(bp)) {
		err(ctx, path, 'Blueprint must be an object.');
		return;
	}

	if (!isNonEmptyString(bp.id)) {
		err(ctx, `${path}.id`, 'Blueprint id must be a non-empty string.');
	} else if (seenIds.has(bp.id)) {
		err(ctx, `${path}.id`, `Duplicate blueprint id "${bp.id}".`);
	} else {
		seenIds.add(bp.id);
	}

	if (!ZONE_SCOPES.has(bp.scope as ZoneScope)) {
		err(ctx, `${path}.scope`, 'Blueprint scope must be "table", "seat" or "edge".');
	} else if (isNonEmptyString(bp.id)) {
		ctx.blueprintScopes.set(bp.id, bp.scope as ZoneScope);
	}

	if (!isNonEmptyString(bp.role)) {
		err(ctx, `${path}.role`, 'Blueprint role must be a non-empty string.');
	} else if (seenRoles.has(bp.role)) {
		err(ctx, `${path}.role`, `Duplicate blueprint role "${bp.role}".`);
	} else {
		seenRoles.add(bp.role);
	}

	if (!FACE_VISIBILITIES.has(bp.faceVisibility as string)) {
		err(ctx, `${path}.faceVisibility`, 'faceVisibility must be "all", "owner", "others" or "none".');
	}
	if (!PRESENCES.has(bp.presence as string)) {
		err(ctx, `${path}.presence`, 'presence must be "visible" or "hidden-from-non-owners".');
	}
}

// ---------------------------------------------------------------------------
// Setup program
// ---------------------------------------------------------------------------

function validateSetupProgram(ctx: Ctx, setup: unknown): void {
	if (!Array.isArray(setup)) {
		err(ctx, 'setup', 'setup must be an array of steps.');
		return;
	}
	setup.forEach((node, i) => validateNode(ctx, node, `setup[${i}]`, false));
}

function validateNode(ctx: Ctx, node: unknown, path: string, insideSeatLoop: boolean): void {
	if (!isObject(node)) {
		err(ctx, path, 'Step must be an object.');
		return;
	}

	if ('do' in node) {
		validateAction(ctx, node, path, insideSeatLoop);
	} else if ('when' in node) {
		validateWhenNode(ctx, node, path, insideSeatLoop);
	} else if ('forEachSeat' in node) {
		validateForEachSeatNode(ctx, node, path);
	} else {
		err(ctx, path, 'Step must be an action (do), a conditional (when) or a loop (forEachSeat).');
	}
}

function validateWhenNode(
	ctx: Ctx,
	node: Record<string, unknown>,
	path: string,
	insideSeatLoop: boolean
): void {
	validateCondition(ctx, node.when, `${path}.when`, insideSeatLoop);

	if (!Array.isArray(node.then)) {
		err(ctx, `${path}.then`, 'when.then must be an array of steps.');
	} else {
		node.then.forEach((n, i) => validateNode(ctx, n, `${path}.then[${i}]`, insideSeatLoop));
	}

	if (node.else !== undefined) {
		if (!Array.isArray(node.else)) {
			err(ctx, `${path}.else`, 'when.else must be an array of steps.');
		} else {
			node.else.forEach((n, i) => validateNode(ctx, n, `${path}.else[${i}]`, insideSeatLoop));
		}
	}
}

function validateForEachSeatNode(ctx: Ctx, node: Record<string, unknown>, path: string): void {
	const loop = node.forEachSeat;
	if (!isObject(loop) || !Array.isArray(loop.body)) {
		err(ctx, `${path}.forEachSeat`, 'forEachSeat must have a body array.');
		return;
	}
	loop.body.forEach((n, i) => validateNode(ctx, n, `${path}.forEachSeat.body[${i}]`, true));
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function validateAction(
	ctx: Ctx,
	action: Record<string, unknown>,
	path: string,
	insideSeatLoop: boolean
): void {
	const verb = action.do;
	if (!isString(verb) || !VERBS.has(verb)) {
		err(ctx, `${path}.do`, 'Unknown verb.');
		return;
	}

	switch (verb) {
		case 'placeSeats':
			validateBlueprintRef(ctx, action.blueprint, `${path}.blueprint`, 'seat');
			break;
		case 'placeZone':
			validatePlaceZone(ctx, action, path);
			break;
		case 'place':
			validateComponentRef(ctx, action.component, `${path}.component`);
			validateZoneRef(ctx, action.zone, `${path}.zone`, insideSeatLoop);
			validateFacing(ctx, action.facing, `${path}.facing`, false);
			validateOptionalCount(ctx, action.count, `${path}.count`);
			break;
		case 'shuffle':
			validateZoneRef(ctx, action.zone, `${path}.zone`, insideSeatLoop);
			break;
		case 'deal':
			validateDealCount(ctx, action.count, `${path}.count`, insideSeatLoop);
			validateZoneRef(ctx, action.from, `${path}.from`, insideSeatLoop);
			validateZoneRef(ctx, action.to, `${path}.to`, insideSeatLoop);
			validateFacing(ctx, action.facing, `${path}.facing`, false);
			break;
		case 'move':
			validateOptionalCount(ctx, action.count, `${path}.count`);
			validateZoneRef(ctx, action.from, `${path}.from`, insideSeatLoop);
			validateZoneRef(ctx, action.to, `${path}.to`, insideSeatLoop);
			validateFacing(ctx, action.facing, `${path}.facing`, false);
			break;
		case 'flip':
			validateZoneRef(ctx, action.zone, `${path}.zone`, insideSeatLoop);
			validateFacing(ctx, action.facing, `${path}.facing`, true);
			break;
		case 'roll':
			validateComponentRef(ctx, action.component, `${path}.component`, 'Dice');
			if (action.zone !== undefined) {
				validateZoneRef(ctx, action.zone, `${path}.zone`, insideSeatLoop);
			}
			break;
	}
}

function validatePlaceZone(ctx: Ctx, action: Record<string, unknown>, path: string): void {
	const scope = validateBlueprintRef(ctx, action.blueprint, `${path}.blueprint`);
	// placeZone instantiates table/edge zones; seat zones use placeSeats.
	if (scope === 'seat') {
		err(ctx, `${path}.blueprint`, 'placeZone cannot place a seat-scoped blueprint; use placeSeats.');
	}
	if (scope === 'edge') {
		validateEdgeSelector(ctx, action.edge, `${path}.edge`, true);
	} else if (action.edge !== undefined) {
		err(ctx, `${path}.edge`, 'edge selector is only valid for edge-scoped blueprints.');
	}
}

function validateFacing(ctx: Ctx, facing: unknown, path: string, required: boolean): void {
	if (facing === undefined) {
		if (required) err(ctx, path, 'facing is required and must be "up" or "down".');
		return;
	}
	if (!isString(facing) || !FACINGS.has(facing)) {
		err(ctx, path, 'facing must be "up" or "down".');
	}
}

function validateOptionalCount(ctx: Ctx, count: unknown, path: string): void {
	if (count === undefined) return;
	if (!isInteger(count) || count < 1) {
		err(ctx, path, 'count must be a positive integer.');
	}
}

function validateDealCount(ctx: Ctx, count: unknown, path: string, insideSeatLoop: boolean): void {
	if (isInteger(count)) {
		if (count < 1) err(ctx, path, 'count must be a positive integer.');
		return;
	}
	if (isObject(count)) {
		const type = inferValueType(ctx, count, path, insideSeatLoop);
		if (type !== undefined && type !== 'number') {
			err(ctx, path, 'count expression must evaluate to a number.');
		}
		return;
	}
	err(ctx, path, 'count must be a positive integer or a numeric expression.');
}

// ---------------------------------------------------------------------------
// References
// ---------------------------------------------------------------------------

function validateComponentRef(
	ctx: Ctx,
	component: unknown,
	path: string,
	requiredType?: string
): void {
	if (!isNonEmptyString(component)) {
		err(ctx, path, 'component must be a non-empty component id.');
		return;
	}
	if (!ctx.componentIds.has(component)) {
		err(ctx, path, `Unknown component "${component}".`);
		return;
	}
	if (requiredType !== undefined && ctx.componentTypes.get(component) !== requiredType) {
		err(ctx, path, `Component "${component}" must be of type ${requiredType}.`);
	}
}

/**
 * Validate a bare blueprint id reference (as used by placeSeats/placeZone).
 * @returns the referenced blueprint's scope when known.
 */
function validateBlueprintRef(
	ctx: Ctx,
	blueprint: unknown,
	path: string,
	requiredScope?: ZoneScope
): ZoneScope | undefined {
	if (!isNonEmptyString(blueprint)) {
		err(ctx, path, 'blueprint must be a non-empty blueprint id.');
		return undefined;
	}
	const scope = ctx.blueprintScopes.get(blueprint);
	if (scope === undefined) {
		err(ctx, path, `Unknown blueprint "${blueprint}".`);
		return undefined;
	}
	if (requiredScope !== undefined && scope !== requiredScope) {
		err(ctx, path, `Blueprint "${blueprint}" must be ${requiredScope}-scoped.`);
	}
	return scope;
}

function validateZoneRef(ctx: Ctx, zone: unknown, path: string, insideSeatLoop: boolean): void {
	if (!isObject(zone)) {
		err(ctx, path, 'Zone reference must be an object.');
		return;
	}
	const scope = validateBlueprintRef(ctx, zone.blueprint, `${path}.blueprint`);
	if (scope === undefined) return;

	switch (scope) {
		case 'seat':
			if (zone.edge !== undefined) {
				err(ctx, `${path}.edge`, 'edge selector is not valid for a seat-scoped zone.');
			}
			validateSeatSelector(ctx, zone.seat, `${path}.seat`, insideSeatLoop);
			break;
		case 'edge':
			if (zone.seat !== undefined) {
				err(ctx, `${path}.seat`, 'seat selector is not valid for an edge-scoped zone.');
			}
			validateEdgeSelector(ctx, zone.edge, `${path}.edge`, true);
			break;
		case 'table':
			if (zone.seat !== undefined) {
				err(ctx, `${path}.seat`, 'seat selector is not valid for a table-scoped zone.');
			}
			if (zone.edge !== undefined) {
				err(ctx, `${path}.edge`, 'edge selector is not valid for a table-scoped zone.');
			}
			break;
	}
}

function validateSeatSelector(
	ctx: Ctx,
	seat: unknown,
	path: string,
	insideSeatLoop: boolean
): void {
	if (!isObject(seat)) {
		err(ctx, path, 'seat selector is required for a seat-scoped zone.');
		return;
	}
	switch (seat.kind) {
		case 'each':
			break;
		case 'current':
			if (!insideSeatLoop) {
				err(ctx, path, 'seat "current" is only valid inside a forEachSeat loop.');
			}
			break;
		case 'index':
			if (!isInteger(seat.index) || seat.index < 0) {
				err(ctx, `${path}.index`, 'seat index must be a non-negative integer.');
			}
			break;
		default:
			err(ctx, `${path}.kind`, 'seat selector kind must be "each", "current" or "index".');
	}
}

function validateEdgeSelector(ctx: Ctx, edge: unknown, path: string, required: boolean): void {
	if (edge === undefined) {
		if (required) err(ctx, path, 'edge selector is required for an edge-scoped zone.');
		return;
	}
	if (!isObject(edge)) {
		err(ctx, path, 'edge selector must be an object.');
		return;
	}
	switch (edge.kind) {
		case 'each':
			break;
		case 'index':
			if (!isInteger(edge.index) || edge.index < 0) {
				err(ctx, `${path}.index`, 'edge index must be a non-negative integer.');
			}
			break;
		default:
			err(ctx, `${path}.kind`, 'edge selector kind must be "each" or "index".');
	}
}

// ---------------------------------------------------------------------------
// Conditions & value expressions
// ---------------------------------------------------------------------------

function validateCondition(
	ctx: Ctx,
	condition: unknown,
	path: string,
	insideSeatLoop: boolean
): void {
	if (!isObject(condition)) {
		err(ctx, path, 'Condition must be an object.');
		return;
	}

	if ('all' in condition || 'any' in condition) {
		const key = 'all' in condition ? 'all' : 'any';
		const branch = condition[key];
		if (!Array.isArray(branch)) {
			err(ctx, `${path}.${key}`, `"${key}" must be an array of conditions.`);
			return;
		}
		branch.forEach((c, i) => validateCondition(ctx, c, `${path}.${key}[${i}]`, insideSeatLoop));
		return;
	}

	if ('not' in condition) {
		validateCondition(ctx, condition.not, `${path}.not`, insideSeatLoop);
		return;
	}

	if ('op' in condition) {
		validateComparison(ctx, condition, path, insideSeatLoop);
		return;
	}

	err(ctx, path, 'Condition must be an "all", "any", "not" or a comparison.');
}

function validateComparison(
	ctx: Ctx,
	comparison: Record<string, unknown>,
	path: string,
	insideSeatLoop: boolean
): void {
	const op = comparison.op;
	if (!isString(op) || !COMPARISON_OPS.has(op)) {
		err(ctx, `${path}.op`, 'Comparison op must be one of eq, ne, lt, lte, gt, gte.');
	}

	const leftType = inferValueType(ctx, comparison.left, `${path}.left`, insideSeatLoop);
	const rightType = inferValueType(ctx, comparison.right, `${path}.right`, insideSeatLoop);

	if (leftType !== undefined && rightType !== undefined && leftType !== rightType) {
		err(ctx, path, `Cannot compare ${leftType} with ${rightType}.`);
		return;
	}

	// Ordering operators require numeric operands.
	if (isString(op) && ORDERING_OPS.has(op)) {
		const operandType = leftType ?? rightType;
		if (operandType !== undefined && operandType !== 'number') {
			err(ctx, `${path}.op`, `Operator "${op}" requires numeric operands.`);
		}
	}
}

/**
 * Infer the type of a value expression, reporting structural/referential errors.
 * @returns the inferred {@link ValueType}, or undefined when it can't be determined.
 */
function inferValueType(
	ctx: Ctx,
	expr: unknown,
	path: string,
	insideSeatLoop: boolean
): ValueType | undefined {
	if (!isObject(expr)) {
		err(ctx, path, 'Value expression must be an object.');
		return undefined;
	}

	if ('const' in expr) {
		const value = expr.const;
		if (typeof value === 'number') return 'number';
		if (typeof value === 'string') return 'string';
		if (typeof value === 'boolean') return 'boolean';
		err(ctx, `${path}.const`, 'const must be a number, string or boolean.');
		return undefined;
	}

	if (!('get' in expr)) {
		err(ctx, path, 'Value expression must be a "get" or a "const".');
		return undefined;
	}

	switch (expr.get) {
		case 'playerCount':
			return 'number';
		case 'count':
			validateZoneRef(ctx, expr.zone, `${path}.zone`, insideSeatLoop);
			return 'number';
		case 'cardField':
			if (!isNonEmptyString(expr.field)) {
				err(ctx, `${path}.field`, 'cardField field must be a non-empty string.');
			}
			return 'string';
		case 'option': {
			if (!isNonEmptyString(expr.option)) {
				err(ctx, `${path}.option`, 'option must reference an option id.');
				return undefined;
			}
			const type = ctx.optionTypes.get(expr.option);
			if (type === undefined) {
				err(ctx, `${path}.option`, `Unknown option "${expr.option}".`);
			}
			return type;
		}
		default:
			err(ctx, `${path}.get`, 'get must be "playerCount", "option", "count" or "cardField".');
			return undefined;
	}
}
