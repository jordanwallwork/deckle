import { describe, expect, it } from 'vitest';
import { parseSortDirection, toggleSort } from './sort';

describe('parseSortDirection', () => {
  it('accepts asc and desc', () => {
    expect(parseSortDirection('asc')).toBe('asc');
    expect(parseSortDirection('desc')).toBe('desc');
  });

  it.each([null, undefined, '', 'ASC', 'up', 'ascending'])('rejects %s', (value) => {
    expect(parseSortDirection(value)).toBeNull();
  });
});

describe('toggleSort', () => {
  it('reverses the direction when the active column is clicked', () => {
    expect(toggleSort({ sortBy: 'name', sortDir: 'asc' }, 'name', 'asc')).toEqual({
      sortBy: 'name',
      sortDir: 'desc'
    });
    expect(toggleSort({ sortBy: 'name', sortDir: 'desc' }, 'name', 'asc')).toEqual({
      sortBy: 'name',
      sortDir: 'asc'
    });
  });

  it('switches to a new column in its initial direction, ignoring the current direction', () => {
    expect(toggleSort({ sortBy: 'name', sortDir: 'desc' }, 'storage', 'desc')).toEqual({
      sortBy: 'storage',
      sortDir: 'desc'
    });
    expect(toggleSort({ sortBy: 'createdAt', sortDir: 'desc' }, 'role', 'asc')).toEqual({
      sortBy: 'role',
      sortDir: 'asc'
    });
  });
});
