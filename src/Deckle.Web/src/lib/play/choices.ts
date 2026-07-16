/**
 * Pure helpers for the Play dialog's configuration state (#120).
 *
 * A {@link PlayChoices} is the user's answer to the Play prompt: how many seats,
 * and a value per declared option. These helpers seed defaults from the setup
 * document, clamp values to their bounds, and merge in remembered choices — all
 * pure so they can be unit-tested and reused by the dialog runes without touching
 * the DOM or storage.
 */

import type { GameSetup, NumberOption, SetupOption } from '$lib/gamerunner/types';

/** A single option value, matching the interpreter's `RunSetupInput.options`. */
export type OptionValue = string | number | boolean;

/** The user's configured answers to a setup's Play prompt. */
export interface PlayChoices {
  playerCount: number;
  options: Record<string, OptionValue>;
}

/** Clamp (and round) a player count into the document's `[min, max]` band. */
export function clampPlayerCount(count: number, min: number, max: number): number {
  const lo = Math.max(1, Math.min(min, max));
  const hi = Math.max(min, max, 1);
  if (!Number.isFinite(count)) return lo;
  return Math.min(hi, Math.max(lo, Math.round(count)));
}

function clampNumber(value: number, option: NumberOption): number {
  let v = value;
  if (option.min !== undefined) v = Math.max(option.min, v);
  if (option.max !== undefined) v = Math.min(option.max, v);
  return v;
}

/**
 * Coerce an arbitrary (remembered or user-entered) value into a valid value for
 * the given option, falling back to the option's default when it cannot be made
 * to fit. Number options are clamped to their declared min/max; select options
 * must name one of their choices.
 */
export function coerceOptionValue(option: SetupOption, raw: unknown): OptionValue {
  switch (option.type) {
    case 'boolean':
      return typeof raw === 'boolean' ? raw : option.default;
    case 'number': {
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n)) return option.default;
      return clampNumber(n, option);
    }
    case 'select':
      return typeof raw === 'string' && option.choices.includes(raw) ? raw : option.default;
  }
}

/** The choices a fresh Play prompt starts from: min players, option defaults. */
export function defaultChoices(setup: GameSetup): PlayChoices {
  return {
    playerCount: clampPlayerCount(setup.minPlayers, setup.minPlayers, setup.maxPlayers),
    options: Object.fromEntries(setup.options.map((o) => [o.id, o.default]))
  };
}

/**
 * Merge remembered choices onto the setup's defaults, clamped/validated against
 * the *current* document (options may have been added, removed or re-bounded
 * since the choices were saved). Unknown remembered options are dropped; missing
 * ones fall back to their default.
 */
export function coerceChoices(setup: GameSetup, remembered: Partial<PlayChoices> | null): PlayChoices {
  const base = defaultChoices(setup);
  if (!remembered) return base;

  const playerCount =
    typeof remembered.playerCount === 'number'
      ? clampPlayerCount(remembered.playerCount, setup.minPlayers, setup.maxPlayers)
      : base.playerCount;

  const options = { ...base.options };
  const rememberedOptions = remembered.options;
  if (rememberedOptions && typeof rememberedOptions === 'object') {
    for (const option of setup.options) {
      if (option.id in rememberedOptions) {
        options[option.id] = coerceOptionValue(option, rememberedOptions[option.id]);
      }
    }
  }

  return { playerCount, options };
}
