/**
 * Glue between the Play dialog and the pure game runner (#120).
 *
 * These helpers assemble the inputs the runner needs from what the live tabletop
 * already has — the project's components become both the validator's
 * {@link ProjectContext} and (via the store's prebuilt {@link Templates}) the
 * interpreter's spawn templates — and decide the two run-time gates the dialog
 * turns on: whether the table must be wiped first, and what seed to run with.
 */

import type { ProjectContext } from '$lib/gamerunner/types';
import type { GameComponent } from '$lib/types';
import type { TabletopState } from '$lib/tabletop';

/**
 * Build the {@link ProjectContext} static validation needs from the project's
 * components — the referential-integrity facts (`id`, `name`, `type`) the
 * validator checks component references against.
 */
export function buildProjectContext(components: GameComponent[]): ProjectContext {
  return {
    components: components.map((c) => ({ id: c.id, name: c.name, type: c.type }))
  };
}

/**
 * Whether the table currently holds anything a run would overwrite. Used to
 * decide if the wipe must be confirmed (decision #107 — "confirm wipe only when
 * non-empty"). Any pile or zone counts as content.
 */
export function tableHasContent(state: TabletopState): boolean {
  return Object.keys(state.piles).length > 0 || Object.keys(state.zones).length > 0;
}

/**
 * A fresh determinism seed for a run. Re-runs default to a new seed (decision
 * #107). The rng is injectable so the choice is testable.
 */
export function generateSeed(rng: () => number = Math.random): number {
  return Math.floor(rng() * 0x7fffffff);
}

/**
 * How a (re-)run picks its seed (decision #107 — "new seed by default + 'replay
 * same deal'"). `'new'` always mints a fresh seed; `'same'` reuses the last
 * run's seed so a deterministic interpreter reproduces the identical deal.
 */
export type SeedMode = 'new' | 'same';

/**
 * Resolve the seed to run with. `'same'` reuses {@link lastSeed} when one is
 * known (an earlier run of this setup), otherwise falls back to a fresh seed —
 * so "replay same deal" degrades gracefully to a new deal when there is nothing
 * to replay. Pure and testable: the rng is injectable.
 */
export function chooseSeed(
  mode: SeedMode,
  lastSeed: number | null,
  rng: () => number = Math.random
): number {
  if (mode === 'same' && lastSeed !== null) return lastSeed;
  return generateSeed(rng);
}
