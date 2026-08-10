import { describe, it, expect } from 'vitest';
import { errorsUnder, hasErrorUnder, ownErrors } from './errors';
import type { SetupValidationError } from '$lib/gamerunner';

const errors: SetupValidationError[] = [
	{ docPath: 'setup[0].zone.blueprint', message: 'unknown blueprint' },
	{ docPath: 'setup[1].when.left', message: 'bad operand' },
	{ docPath: 'setup[1].then[0].to', message: 'bad zone' },
	{ docPath: 'setup[2].forEachSeat.body[0].zone', message: 'nested zone' }
];

describe('hasErrorUnder / errorsUnder', () => {
	it('matches a slot subpath', () => {
		expect(hasErrorUnder(errors, 'setup[0].zone')).toBe(true);
		expect(hasErrorUnder(errors, 'setup[0].facing')).toBe(false);
	});

	it('does not treat a sibling index as a prefix', () => {
		// setup[1] must not match setup[10]-style siblings
		expect(errorsUnder(errors, 'setup[1]').map((e) => e.docPath)).toEqual([
			'setup[1].when.left',
			'setup[1].then[0].to'
		]);
	});
});

describe('ownErrors', () => {
	it('excludes errors inside a nested then/else list', () => {
		const own = ownErrors(errors, 'setup[1]').map((e) => e.docPath);
		expect(own).toEqual(['setup[1].when.left']);
	});

	it('excludes errors inside a forEachSeat body', () => {
		expect(ownErrors(errors, 'setup[2]')).toEqual([]);
	});

	it('includes an action node’s own slot error', () => {
		expect(ownErrors(errors, 'setup[0]').map((e) => e.docPath)).toEqual([
			'setup[0].zone.blueprint'
		]);
	});
});
