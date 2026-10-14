import { describe, it, expect } from 'vitest';
import type { FileDirectory } from '$lib/types';
import { buildBreadcrumbs } from './breadcrumbs';

const base = '/projects/me/proj/image-library';

function dir(id: string, name: string, parentDirectoryId: string | null = null): FileDirectory {
  return { id, name, parentDirectoryId, projectId: 'p', createdAt: '', updatedAt: '' };
}

describe('buildBreadcrumbs', () => {
  it('returns only the library root at the top level', () => {
    expect(buildBreadcrumbs(base, '')).toEqual([
      { label: 'Image Library', href: base, directoryId: null }
    ]);
  });

  it('adds a crumb per folder linking to its cumulative path', () => {
    const dirs = [dir('c', 'cards'), dir('h', 'heroes', 'c')];
    expect(buildBreadcrumbs(base, 'cards/heroes', dirs)).toEqual([
      { label: 'Image Library', href: base, directoryId: null },
      { label: 'cards', href: `${base}/cards`, directoryId: 'c' },
      { label: 'heroes', href: `${base}/cards/heroes`, directoryId: 'h' }
    ]);
  });

  it('resolves folders by parent, not just by name', () => {
    const dirs = [dir('a', 'art'), dir('x', 'art', 'a'), dir('c', 'cards'), dir('y', 'art', 'c')];
    expect(buildBreadcrumbs(base, 'cards/art', dirs).map((c) => c.directoryId)).toEqual([
      null,
      'c',
      'y'
    ]);
  });

  it('leaves the folder unresolved from the first unknown segment down', () => {
    const dirs = [dir('c', 'cards'), dir('h', 'heroes', 'c')];
    expect(buildBreadcrumbs(base, 'missing/heroes', dirs).map((c) => c.directoryId)).toEqual([
      null,
      undefined,
      undefined
    ]);
  });

  it('ignores empty segments and encodes folder names in links', () => {
    expect(buildBreadcrumbs(base, '/my art//#1/').map((c) => [c.label, c.href])).toEqual([
      ['Image Library', base],
      ['my art', `${base}/my%20art`],
      ['#1', `${base}/my%20art/%231`]
    ]);
  });
});
