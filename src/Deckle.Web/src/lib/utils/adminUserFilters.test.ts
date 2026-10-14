import { describe, expect, it } from 'vitest';
import {
  buildUserQuery,
  emptyUserFilters,
  parseUserFilters,
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
