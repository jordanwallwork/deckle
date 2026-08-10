/**
 * The per-verb animation registry for setup replay (#121, decision #107).
 *
 * Compute-first execution (#120) already produced the whole run in one shot; the
 * replay layer re-enacts the {@link SetupStep} trace as a visible, skippable
 * build-up. This registry is the *extension seam*: one entry per verb, each
 * deciding how long its step holds on screen before the replay advances. New
 * verbs (or richer bespoke animations) plug in here without touching the
 * playback controller.
 *
 * Where a bespoke tabletop animation already exists it is reused for its timing —
 * `shuffle` borrows the riffle's duration from `../tabletop/animations` so the
 * replay pauses exactly as long as a hand-triggered shuffle would. Verbs with no
 * bespoke animation fall back to a single tunable {@link REPLAY_STEP_MS} beat, so
 * the table still builds up "one major step at a time" (decision #107).
 *
 * Pure and unit-testable: durations are a function of the step alone — no DOM,
 * no clock. The Svelte glue that renders each frame need not be tested.
 */

import { SHUFFLE_ANIMATION_CARDS, shuffleAnimationDuration } from '../tabletop/animations';
import type { SetupStep } from './interpreter';
import type { Verb } from './types';

/**
 * The nominal beat of a single replay step (~500ms per decision #107). Tunable:
 * every verb without a bespoke animation holds for exactly this long, and it is
 * the floor for those that do.
 */
export const REPLAY_STEP_MS = 500;

/** How one verb's step animates during replay. Extend by adding an entry. */
export interface VerbReplayAnimation {
  verb: Verb;
  /** How long this step should hold on screen before the replay advances (ms). */
  duration(step: SetupStep): number;
}

/** A verb whose step holds for the flat {@link REPLAY_STEP_MS} beat. */
function flatBeat(verb: Verb): VerbReplayAnimation {
  return { verb, duration: () => REPLAY_STEP_MS };
}

/**
 * Per-verb replay animations. All eight verbs are present so every trace step
 * has a handler; `shuffle` reuses the existing riffle timing, the rest hold for
 * the flat beat (sensible timed defaults, decision #107).
 */
export const replayRegistry: Record<Verb, VerbReplayAnimation> = {
  placeSeats: flatBeat('placeSeats'),
  placeZone: flatBeat('placeZone'),
  place: flatBeat('place'),
  shuffle: {
    verb: 'shuffle',
    // Reuse the hand-shuffle riffle timing so a replayed shuffle pauses for the
    // same fan-out/fan-in a designer sees when pressing S on a deck.
    duration: () => Math.max(REPLAY_STEP_MS, shuffleAnimationDuration(SHUFFLE_ANIMATION_CARDS))
  },
  deal: flatBeat('deal'),
  move: flatBeat('move'),
  flip: flatBeat('flip'),
  roll: flatBeat('roll')
};

/** The hold duration for a trace step, dispatched through {@link replayRegistry}. */
export function replayStepDuration(step: SetupStep): number {
  return replayRegistry[step.verb].duration(step);
}
