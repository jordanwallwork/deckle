import type { AdminUserRoleFilter, AdminUserStatusFilter, GetUsersParams } from '$lib/api/admin';

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
 * filters and page. Shared by filtering (page 1) and pagination so neither drops the other.
 */
export function buildUserQuery(filters: AdminUserFilters, page: number, pageSize: number): string {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = filters[key].trim();
    if (value) params.set(key, value);
  }
  params.set('page', page.toString());
  params.set('pageSize', pageSize.toString());
  return `?${params.toString()}`;
}
