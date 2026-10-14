import type { SortDirection, SortState } from '$lib/types';

export const SORT_DIRECTIONS: readonly SortDirection[] = ['asc', 'desc'];

export function parseSortDirection(value: string | null | undefined): SortDirection | null {
  return SORT_DIRECTIONS.includes(value as SortDirection) ? (value as SortDirection) : null;
}

/**
 * The sort after a header click: the active column reverses direction, any other
 * column becomes active in its initial direction.
 */
export function toggleSort<K extends string>(
  current: SortState<K>,
  key: K,
  initialDirection: SortDirection
): SortState<K> {
  if (current.sortBy === key) {
    return { sortBy: key, sortDir: current.sortDir === 'asc' ? 'desc' : 'asc' };
  }
  return { sortBy: key, sortDir: initialDirection };
}
