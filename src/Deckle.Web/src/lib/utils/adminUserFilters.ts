import type {
  AdminUserRoleFilter,
  AdminUserSortKey,
  AdminUserStatusFilter,
  GetUsersParams
} from '$lib/api/admin';
import type { SortDirection, SortState } from '$lib/types';
import { parseSortDirection } from './sort';

/**
 * Filters on the admin users index. Empty strings mean "not filtered" so the
 * values bind directly to form inputs; dates are `yyyy-MM-dd` (inclusive).
 */
export interface AdminUserFilters {
  search: string;
  createdFrom: string;
  createdTo: string;
  lastLoginFrom: string;
  lastLoginTo: string;
  role: AdminUserRoleFilter | '';
  status: AdminUserStatusFilter | '';
}

export const ROLE_FILTERS: readonly AdminUserRoleFilter[] = ['User', 'Administrator'];
export const STATUS_FILTERS: readonly AdminUserStatusFilter[] = [
  'Active',
  'Unconfirmed',
  'Disabled'
];

export type AdminUserSort = SortState<AdminUserSortKey>;

/**
 * The direction a column sorts in when first clicked: newest/largest first for dates and
 * counts, alphabetical for name and role. Also used when the URL has a key but no valid direction.
 */
export const USER_SORT_INITIAL_DIRECTION: Readonly<Record<AdminUserSortKey, SortDirection>> = {
  name: 'asc',
  createdAt: 'desc',
  lastLoginAt: 'desc',
  storage: 'desc',
  projects: 'desc',
  role: 'asc'
};

const USER_SORT_KEYS = Object.keys(USER_SORT_INITIAL_DIRECTION) as AdminUserSortKey[];

/** Matches the API's default order */
export const DEFAULT_USER_SORT: Readonly<AdminUserSort> = { sortBy: 'createdAt', sortDir: 'desc' };

const FILTER_KEYS = [
  'search',
  'createdFrom',
  'createdTo',
  'lastLoginFrom',
  'lastLoginTo',
  'role',
  'status'
] as const satisfies readonly (keyof AdminUserFilters)[];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function emptyUserFilters(): AdminUserFilters {
  return {
    search: '',
    createdFrom: '',
    createdTo: '',
    lastLoginFrom: '',
    lastLoginTo: '',
    role: '',
    status: ''
  };
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | '' {
  return allowed.includes(value as T) ? (value as T) : '';
}

function dateParam(value: string | null): string {
  return value && DATE_PATTERN.test(value) ? value : '';
}

/**
 * Reads filters from a URL's query string, dropping malformed dates and unknown role/status values
 */
export function parseUserFilters(searchParams: URLSearchParams): AdminUserFilters {
  return {
    search: searchParams.get('search')?.trim() ?? '',
    createdFrom: dateParam(searchParams.get('createdFrom')),
    createdTo: dateParam(searchParams.get('createdTo')),
    lastLoginFrom: dateParam(searchParams.get('lastLoginFrom')),
    lastLoginTo: dateParam(searchParams.get('lastLoginTo')),
    role: oneOf(searchParams.get('role'), ROLE_FILTERS),
    status: oneOf(searchParams.get('status'), STATUS_FILTERS)
  };
}

/**
 * Reads the sort from a URL's query string. An unknown or missing key gives the default sort;
 * a valid key with an unknown or missing direction uses that key's initial direction.
 */
export function parseUserSort(searchParams: URLSearchParams): AdminUserSort {
  const sortBy = oneOf(searchParams.get('sortBy'), USER_SORT_KEYS);
  if (!sortBy) return { ...DEFAULT_USER_SORT };
  return {
    sortBy,
    sortDir: parseSortDirection(searchParams.get('sortDir')) ?? USER_SORT_INITIAL_DIRECTION[sortBy]
  };
}

function isDefaultSort(sort: AdminUserSort): boolean {
  return sort.sortBy === DEFAULT_USER_SORT.sortBy && sort.sortDir === DEFAULT_USER_SORT.sortDir;
}

/**
 * Converts filters to API params, omitting anything not set
 */
export function toUserQueryParams(filters: AdminUserFilters): GetUsersParams {
  const params: GetUsersParams = {};
  if (filters.search) params.search = filters.search;
  if (filters.createdFrom) params.createdFrom = filters.createdFrom;
  if (filters.createdTo) params.createdTo = filters.createdTo;
  if (filters.lastLoginFrom) params.lastLoginFrom = filters.lastLoginFrom;
  if (filters.lastLoginTo) params.lastLoginTo = filters.lastLoginTo;
  if (filters.role) params.role = filters.role;
  if (filters.status) params.status = filters.status;
  return params;
}

/**
 * Builds the admin users index query string (including the leading "?") for the given
 * filters, sort and page. Shared by filtering, sorting and pagination so none drops the others.
 * The default sort is left out to keep URLs short.
 */
export function buildUserQuery(
  filters: AdminUserFilters,
  page: number,
  pageSize: number,
  sort: AdminUserSort = DEFAULT_USER_SORT
): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  if (!isDefaultSort(sort)) {
    params.set('sortBy', sort.sortBy);
    params.set('sortDir', sort.sortDir);
  }
  params.set('page', page.toString());
  params.set('pageSize', pageSize.toString());
  return `?${params.toString()}`;
}
