import { describe, it, expect } from 'vitest';
import type { GameSetup, SetupOption } from '$lib/gamerunner/types';
import {
  clampPlayerCount,
  coerceOptionValue,
  defaultChoices,
  coerceChoices
} from './choices';

function setup(overrides: Partial<GameSetup> = {}): GameSetup {
  return {
    version: 1,
    minPlayers: 2,
    maxPlayers: 4,
    options: [],
    blueprints: [],
    setup: [],
    ...overrides
  };
}

const boolOpt: SetupOption = { id: 'variant', label: 'Variant', type: 'boolean', default: false };
const numOpt: SetupOption = { id: 'rounds', label: 'Rounds', type: 'number', default: 3, min: 1, max: 5 };
const selOpt: SetupOption = {
  id: 'mode',
  label: 'Mode',
  type: 'select',
  choices: ['easy', 'hard'],
  default: 'easy'
};

describe('clampPlayerCount', () => {
  it('clamps below min up to min', () => {
    expect(clampPlayerCount(1, 2, 4)).toBe(2);
  });
  it('clamps above max down to max', () => {
    expect(clampPlayerCount(9, 2, 4)).toBe(4);
  });
  it('rounds and keeps in-band values', () => {
    expect(clampPlayerCount(3.4, 2, 4)).toBe(3);
  });
  it('falls back to min for non-finite input', () => {
    expect(clampPlayerCount(Number.NaN, 2, 4)).toBe(2);
  });
});

describe('coerceOptionValue', () => {
  it('keeps valid booleans, else default', () => {
    expect(coerceOptionValue(boolOpt, true)).toBe(true);
    expect(coerceOptionValue(boolOpt, 'nope')).toBe(false);
  });
  it('clamps numbers to min/max and defaults non-numbers', () => {
    expect(coerceOptionValue(numOpt, 10)).toBe(5);
    expect(coerceOptionValue(numOpt, 0)).toBe(1);
    expect(coerceOptionValue(numOpt, 'x')).toBe(3);
  });
  it('accepts only listed select choices', () => {
    expect(coerceOptionValue(selOpt, 'hard')).toBe('hard');
    expect(coerceOptionValue(selOpt, 'other')).toBe('easy');
  });
});

describe('defaultChoices', () => {
  it('seeds min players and option defaults', () => {
    const choices = defaultChoices(setup({ options: [boolOpt, numOpt, selOpt] }));
    expect(choices.playerCount).toBe(2);
    expect(choices.options).toEqual({ variant: false, rounds: 3, mode: 'easy' });
  });
});

describe('coerceChoices', () => {
  const s = setup({ options: [boolOpt, numOpt, selOpt] });

  it('returns defaults when nothing remembered', () => {
    expect(coerceChoices(s, null)).toEqual(defaultChoices(s));
  });

  it('overlays and clamps remembered choices against the current doc', () => {
    const merged = coerceChoices(s, {
      playerCount: 99,
      options: { variant: true, rounds: 100, mode: 'gone' }
    });
    expect(merged.playerCount).toBe(4);
    expect(merged.options).toEqual({ variant: true, rounds: 5, mode: 'easy' });
  });

  it('ignores remembered options no longer in the document', () => {
    const merged = coerceChoices(s, { options: { removed: 'x' } as never });
    expect(merged.options).toEqual({ variant: false, rounds: 3, mode: 'easy' });
  });
});
