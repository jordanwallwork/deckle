import { describe, it, expect } from 'vitest';
import { REPLAY_STEP_MS, replayRegistry, replayStepDuration } from './replayRegistry';
import type { SetupStep } from './interpreter';
import type { Verb } from './types';

const ALL_VERBS: Verb[] = [
  'placeSeats',
  'placeZone',
  'place',
  'shuffle',
  'deal',
  'move',
  'flip',
  'roll'
];

/** A minimal step for a given verb — enough for the registry's duration fn. */
function stepFor(verb: Verb): SetupStep {
  const base = { docPath: 'setup[0]' };
  switch (verb) {
    case 'placeSeats':
      return { verb, ...base, blueprint: 'b', zoneIds: ['z1'], seatCount: 2 };
    case 'placeZone':
      return { verb, ...base, blueprint: 'b', zoneIds: ['z1'] };
    case 'place':
      return { verb, ...base, component: 'c', zoneIds: ['z1'], pileIds: ['p1'], cardIds: ['x'], facing: 'up' };
    case 'shuffle':
      return { verb, ...base, zoneIds: ['z1'], orders: {} };
    case 'deal':
      return { verb, ...base, fromZoneId: 'z1', count: 1, deals: [] };
    case 'move':
      return { verb, ...base, fromZoneId: 'z1', moves: [] };
    case 'flip':
      return { verb, ...base, zoneIds: ['z1'], facing: 'up', cardIds: [] };
    case 'roll':
      return { verb, ...base, component: 'd', zoneId: null, pileIds: [], rolls: [] };
  }
}

describe('replayRegistry', () => {
  it('has an entry for every one of the eight verbs', () => {
    expect(Object.keys(replayRegistry).sort()).toEqual([...ALL_VERBS].sort());
    for (const verb of ALL_VERBS) {
      expect(replayRegistry[verb].verb).toBe(verb);
    }
  });

  it('gives every verb a positive hold duration', () => {
    for (const verb of ALL_VERBS) {
      expect(replayStepDuration(stepFor(verb))).toBeGreaterThan(0);
    }
  });

  it('reuses the riffle timing for shuffle (never below the flat beat)', () => {
    expect(replayStepDuration(stepFor('shuffle'))).toBeGreaterThanOrEqual(REPLAY_STEP_MS);
  });

  it('holds non-bespoke verbs for the flat beat', () => {
    expect(replayStepDuration(stepFor('placeSeats'))).toBe(REPLAY_STEP_MS);
    expect(replayStepDuration(stepFor('deal'))).toBe(REPLAY_STEP_MS);
  });
});
