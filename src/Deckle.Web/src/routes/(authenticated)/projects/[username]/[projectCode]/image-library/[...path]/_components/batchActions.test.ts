import { describe, it, expect } from 'vitest';
import type { FileDirectory } from '$lib/types';
import {
  mergeTags,
  subtractTags,
  unionTags,
  runBatch,
  buildDirectoryTree
} from './batchActions';

function dir(id: string, name: string, parentDirectoryId: string | null = null): FileDirectory {
  return { id, name, parentDirectoryId, projectId: 'p', createdAt: '', updatedAt: '' };
}

describe('mergeTags', () => {
  it('appends new tags and skips case-insensitive duplicates', () => {
    expect(mergeTags(['Hero', 'red'], ['hero', 'Blue', 'blue', ' '])).toEqual([
      'Hero',
      'red',
      'Blue'
    ]);
  });

  it('trims added tags', () => {
    expect(mergeTags([], ['  card  '])).toEqual(['card']);
  });
});

describe('subtractTags', () => {
  it('removes matching tags case-insensitively', () => {
    expect(subtractTags(['Hero', 'red', 'blue'], ['hero', ' RED '])).toEqual(['blue']);
  });

  it('ignores tags that are not present', () => {
    expect(subtractTags(['a'], ['b'])).toEqual(['a']);
  });
});

describe('unionTags', () => {
  it('returns a sorted, de-duplicated union', () => {
    expect(unionTags([['b', 'A'], ['a', 'c'], []])).toEqual(['A', 'b', 'c']);
  });
});

describe('runBatch', () => {
  it('reports succeeded and failed items without stopping on failure', async () => {
    const result = await runBatch([1, 2, 3, 4], (n) =>
      n % 2 === 0 ? Promise.reject(new Error('even')) : Promise.resolve()
    );
    expect(result.succeeded.sort()).toEqual([1, 3]);
    expect(result.failed.sort()).toEqual([2, 4]);
  });

  it('never runs more than the concurrency limit at once', async () => {
    let running = 0;
    let peak = 0;
    await runBatch(
      Array.from({ length: 10 }, (_, i) => i),
      async () => {
        running++;
        peak = Math.max(peak, running);
        await new Promise((r) => setTimeout(r, 1));
        running--;
      },
      3
    );
    expect(peak).toBe(3);
  });

  it('handles an empty list', async () => {
    expect(await runBatch([], async () => {})).toEqual({ succeeded: [], failed: [] });
  });
});

describe('buildDirectoryTree', () => {
  const dirs = [
    dir('b', 'Beta'),
    dir('a', 'alpha'),
    dir('a2', 'Zed', 'a'),
    dir('a1', 'Inner', 'a'),
    dir('a1x', 'Deep', 'a1')
  ];

  it('flattens depth-first with alphabetical siblings', () => {
    expect(buildDirectoryTree(dirs).map((n) => [n.directory.id, n.depth])).toEqual([
      ['a', 0],
      ['a1', 1],
      ['a1x', 2],
      ['a2', 1],
      ['b', 0]
    ]);
  });

  it('omits excluded directories and their descendants', () => {
    expect(buildDirectoryTree(dirs, ['a1']).map((n) => n.directory.id)).toEqual(['a', 'a2', 'b']);
  });
});
