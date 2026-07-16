import { describe, it, expect } from 'vitest';
import type { PlayChoices } from './choices';
import { choicesKey, loadRememberedChoices, saveRememberedChoices } from './storage';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => (map.has(k) ? (map.get(k) as string) : null),
    key: (i) => Array.from(map.keys())[i] ?? null,
    removeItem: (k) => map.delete(k),
    setItem: (k, v) => void map.set(k, v)
  } as Storage;
}

const choices: PlayChoices = { playerCount: 3, options: { rounds: 2, mode: 'hard' } };

describe('play choices storage', () => {
  it('round-trips saved choices per setup id', () => {
    const store = memoryStorage();
    saveRememberedChoices('setup-1', choices, store);
    expect(store.getItem(choicesKey('setup-1'))).toBeTruthy();
    expect(loadRememberedChoices('setup-1', store)).toEqual(choices);
  });

  it('scopes choices by setup id', () => {
    const store = memoryStorage();
    saveRememberedChoices('setup-1', choices, store);
    expect(loadRememberedChoices('setup-2', store)).toBeNull();
  });

  it('returns null for a missing entry', () => {
    expect(loadRememberedChoices('nope', memoryStorage())).toBeNull();
  });

  it('returns null for a corrupt entry', () => {
    const store = memoryStorage();
    store.setItem(choicesKey('setup-1'), '{not json');
    expect(loadRememberedChoices('setup-1', store)).toBeNull();
  });

  it('ignores non-object JSON', () => {
    const store = memoryStorage();
    store.setItem(choicesKey('setup-1'), '[1,2,3]');
    expect(loadRememberedChoices('setup-1', store)).toBeNull();
  });
});
