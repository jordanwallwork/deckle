import { describe, expect, it } from 'vitest';
import {
  buildUserQuery,
  DEFAULT_USER_SORT,
  emptyUserFilters,
  parseUserFilters,
  parseUserSort,
  USER_SORT_INITIAL_DIRECTION,
  toUserQueryParams,
  type AdminUserFilters
} from './adminUserFilters';

const fullFilters: AdminUserFilters = {
  search: 'bob',
  createdFrom: '2026-01-01',
  createdTo: '2026-01-31',
  lastLoginFrom: '2026-02-01',
  lastLoginTo: '2026-02-28',
  role: 'Administrator',
  status: 'Unconfirmed'
};

describe('buildUserQuery', () => {
  it('includes only page and pageSize when no filters are set', () => {
    expect(buildUserQuery(emptyUserFilters(), 1, 20)).toBe('?page=1&pageSize=20');
  });

  it('includes every set filter alongside the page', () => {
    const query = new URLSearchParams(buildUserQuery(fullFilters, 3, 50));

    expect(Object.fromEntries(query)).toEqual({
      ...fullFilters,
      page: '3',
      pageSize: '50'
    });
  });

  it('omits blank and whitespace-only filters and trims search', () => {
    const query = buildUserQuery({ ...emptyUserFilters(), search: '  ', role: 'User' }, 1, 20);

    expect(query).toBe('?role=User&page=1&pageSize=20');
  });

  it('encodes special characters in search', () => {
    const query = buildUserQuery({ ...emptyUserFilters(), search: 'a&b c' }, 1, 20);

    expect(new URLSearchParams(query).get('search')).toBe('a&b c');
  });

  it('round-trips through parseUserFilters', () => {
    const query = buildUserQuery(fullFilters, 2, 20);

    expect(parseUserFilters(new URLSearchParams(query))).toEqual(fullFilters);
  });

  it('includes a non-default sort alongside filters and page', () => {
    const query = new URLSearchParams(
      buildUserQuery(fullFilters, 2, 20, { sortBy: 'storage', sortDir: 'asc' })
    );

    expect(Object.fromEntries(query)).toEqual({
      ...fullFilters,
      sortBy: 'storage',
      sortDir: 'asc',
      page: '2',
      pageSize: '20'
    });
  });

  it('omits the default sort', () => {
    expect(buildUserQuery(emptyUserFilters(), 1, 20, { ...DEFAULT_USER_SORT })).toBe(
      '?page=1&pageSize=20'
    );
  });

  it('keeps the default key when only the direction differs', () => {
    const query = buildUserQuery(emptyUserFilters(), 1, 20, {
      sortBy: 'createdAt',
      sortDir: 'asc'
    });

    expect(query).toBe('?sortBy=createdAt&sortDir=asc&page=1&pageSize=20');
  });

  it('round-trips the sort through parseUserSort', () => {
    const sort = { sortBy: 'lastLoginAt', sortDir: 'asc' } as const;
    const query = buildUserQuery(fullFilters, 3, 20, sort);

    expect(parseUserSort(new URLSearchParams(query))).toEqual(sort);
  });
});

describe('parseUserSort', () => {
  const parse = (params: Record<string, string>) => parseUserSort(new URLSearchParams(params));

  it('defaults to sign-up date, newest first, when no sort is set', () => {
    expect(parse({})).toEqual({ sortBy: 'createdAt', sortDir: 'desc' });
  });

  it.each(['name', 'createdAt', 'lastLoginAt', 'storage', 'projects', 'role'] as const)(
    'accepts %s in both directions',
    (sortBy) => {
      expect(parse({ sortBy, sortDir: 'asc' })).toEqual({ sortBy, sortDir: 'asc' });
      expect(parse({ sortBy, sortDir: 'desc' })).toEqual({ sortBy, sortDir: 'desc' });
    }
  );

  it('falls back to the default sort for an unknown key, whatever the direction', () => {
    expect(parse({ sortBy: 'email', sortDir: 'asc' })).toEqual(DEFAULT_USER_SORT);
    expect(parse({ sortBy: 'NAME', sortDir: 'asc' })).toEqual(DEFAULT_USER_SORT);
  });

  it("uses the key's initial direction when the direction is missing or invalid", () => {
    expect(parse({ sortBy: 'name' })).toEqual({ sortBy: 'name', sortDir: 'asc' });
    expect(parse({ sortBy: 'storage', sortDir: 'sideways' })).toEqual({
      sortBy: 'storage',
      sortDir: 'desc'
    });
  });

  it('returns a fresh object rather than the shared default', () => {
    expect(parse({})).not.toBe(DEFAULT_USER_SORT);
  });
});

describe('USER_SORT_INITIAL_DIRECTION', () => {
  it('starts dates and quantities descending and text columns ascending', () => {
    expect(USER_SORT_INITIAL_DIRECTION).toEqual({
      name: 'asc',
      createdAt: 'desc',
      lastLoginAt: 'desc',
      storage: 'desc',
      projects: 'desc',
      role: 'asc'
    });
  });
});

describe('parseUserFilters', () => {
  it('returns empty filters when nothing is set', () => {
    expect(parseUserFilters(new URLSearchParams())).toEqual(emptyUserFilters());
  });

  it('drops malformed dates and unknown role/status values', () => {
    const filters = parseUserFilters(
      new URLSearchParams({
        createdFrom: 'yesterday',
        lastLoginTo: '2026-13',
        role: 'Owner',
        status: 'Banned'
      })
    );

    expect(filters).toEqual(emptyUserFilters());
  });
});

describe('toUserQueryParams', () => {
  it('omits unset filters', () => {
    expect(toUserQueryParams({ ...emptyUserFilters(), status: 'Disabled' })).toEqual({
      status: 'Disabled'
    });
  });

  it('passes every set filter through', () => {
    expect(toUserQueryParams(fullFilters)).toEqual(fullFilters);
  });
});
