/**
 * Deterministic pseudo-randomness for the setup interpreter.
 *
 * Setup runs must be reproducible: the same `seed` + `options` + `playerCount`
 * produce byte-identical output (decision #108, "within-version determinism").
 * `Math.random` is therefore banned inside the interpreter — every shuffle and
 * roll draws from a {@link mulberry32} stream seeded from those three inputs.
 *
 * mulberry32 is a tiny, fast, well-distributed 32-bit PRNG. It is not
 * cryptographic and its exact stream is an implementation detail (determinism
 * is only promised within a build), which is precisely the contract we want.
 */

/**
 * A mulberry32 PRNG. Returns a function yielding floats in [0, 1), suitable as
 * the injectable `random` argument the tabletop operations already accept.
 */
export function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return function next(): number {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A fast, order-sensitive 32-bit string hash (FNV-1a variant). */
function hashString(input: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

/**
 * Fold the run's determinism inputs into a single 32-bit seed. Changing the
 * seed, the player count, or any option value changes the stream — so re-runs
 * with the same choices replay identically while a fresh seed generally
 * deals differently. Option keys are sorted so ordering never affects the hash.
 */
export function deriveSeed(
	seed: number,
	playerCount: number,
	options: Record<string, string | number | boolean>
): number {
	const sortedOptions = Object.keys(options)
		.sort((a, b) => a.localeCompare(b))
		.map((k) => `${k}=${String(options[k])}`)
		.join('&');
	return hashString(`${seed}|${playerCount}|${sortedOptions}`);
}

/** Build the seeded PRNG for a run from its determinism inputs. */
export function createRng(
	seed: number,
	playerCount: number,
	options: Record<string, string | number | boolean>
): () => number {
	return mulberry32(deriveSeed(seed, playerCount, options));
}
