import { describe, it, expect } from 'vitest';
import { emptyGameSetup } from './document';
import { validateGameSetup } from './validate';
import { CURRENT_SETUP_VERSION } from './types';

describe('emptyGameSetup', () => {
	it('produces a document at the current version with empty collections', () => {
		const doc = emptyGameSetup();
		expect(doc.version).toBe(CURRENT_SETUP_VERSION);
		expect(doc.options).toEqual([]);
		expect(doc.blueprints).toEqual([]);
		expect(doc.setup).toEqual([]);
		expect(doc.minPlayers).toBeGreaterThanOrEqual(1);
		expect(doc.maxPlayers).toBeGreaterThanOrEqual(doc.minPlayers);
	});

	it('is valid (a newly created setup starts valid)', () => {
		expect(validateGameSetup(emptyGameSetup(), { components: [] })).toEqual([]);
	});

	it('returns a fresh object each call', () => {
		expect(emptyGameSetup()).not.toBe(emptyGameSetup());
	});
});
