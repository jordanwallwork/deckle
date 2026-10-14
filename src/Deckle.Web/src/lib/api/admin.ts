import { api } from './client';
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserListResponse,
  AdminSampleComponentListResponse,
  CreateCardDto,
  CreatePlayerMatDto,
  CardComponent,
  PlayerMatComponent,
  GameComponent,
  SortDirection
} from '$lib/types';

export type AdminUserRoleFilter = 'User' | 'Administrator';
export type AdminUserStatusFilter = 'Active' | 'Unconfirmed' | 'Disabled';
export type AdminUserSortKey =
  | 'name'
  | 'createdAt'
  | 'lastLoginAt'
  | 'storage'
  | 'projects'
  | 'role';

export interface GetUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Inclusive, formatted yyyy-MM-dd */
  createdFrom?: string;
  /** Inclusive, formatted yyyy-MM-dd */
  createdTo?: string;
  /** Inclusive, formatted yyyy-MM-dd */
  lastLoginFrom?: string;
  /** Inclusive, formatted yyyy-MM-dd */
  lastLoginTo?: string;
  role?: AdminUserRoleFilter;
  status?: AdminUserStatusFilter;
  /** Defaults to createdAt on the server */
  sortBy?: AdminUserSortKey;
  /** Defaults to the sort key's natural direction on the server */
  sortDir?: SortDirection;
}

const USER_FILTER_KEYS = [
  'search',
  'createdFrom',
  'createdTo',
  'lastLoginFrom',
  'lastLoginTo',
  'role',
  'status',
  'sortBy',
  'sortDir'
] as const;

export interface GetSamplesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
}

export interface GetSampleDataSourcesParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

/**
 * Admin API
 */
export const adminApi = {
  /**
   * Get list of users with pagination, search and filters
   */
  getUsers: (params?: GetUsersParams, fetchFn?: typeof fetch) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    for (const key of USER_FILTER_KEYS) {
      const value = params?.[key];
      if (value) searchParams.set(key, value);
    }

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/admin/users?${queryString}` : '/admin/users';

    return api.get<AdminUserListResponse>(endpoint, undefined, fetchFn);
  },

  /**
   * Get a user's full admin detail (sign-in methods, API keys, owned projects)
   */
  getUser: (id: string, fetchFn?: typeof fetch) =>
    api.get<AdminUserDetail>(`/admin/users/${id}`, undefined, fetchFn),

  /**
   * Update user role (cannot target yourself)
   */
  updateUserRole: (id: string, role: string, fetchFn?: typeof fetch) =>
    api.put<AdminUserDetail>(`/admin/users/${id}/role`, { role }, undefined, fetchFn),

  /**
   * Update user storage quota
   */
  updateUserQuota: (id: string, storageQuotaMb: number, fetchFn?: typeof fetch) =>
    api.put<AdminUser>(`/admin/users/${id}/quota`, { storageQuotaMb }, undefined, fetchFn),

  /**
   * Rename a user; null (or empty) clears the name
   */
  updateUserName: (id: string, name: string | null, fetchFn?: typeof fetch) =>
    api.put<AdminUserDetail>(`/admin/users/${id}/name`, { name }, undefined, fetchFn),

  /**
   * Re-send the email confirmation link (password accounts that are not yet confirmed)
   */
  resendConfirmation: (id: string, fetchFn?: typeof fetch) =>
    api.post<AdminUserDetail>(
      `/admin/users/${id}/resend-confirmation`,
      undefined,
      undefined,
      fetchFn
    ),

  /**
   * Manually mark a user's email as confirmed
   */
  confirmUserEmail: (id: string, fetchFn?: typeof fetch) =>
    api.post<AdminUserDetail>(`/admin/users/${id}/confirm-email`, undefined, undefined, fetchFn),

  /**
   * Disable or re-enable an account (cannot target yourself)
   */
  setUserDisabled: (id: string, disabled: boolean, fetchFn?: typeof fetch) =>
    api.put<AdminUserDetail>(`/admin/users/${id}/disabled`, { disabled }, undefined, fetchFn),

  /**
   * Revoke one of a user's API keys
   */
  revokeUserApiKey: (id: string, keyId: string, fetchFn?: typeof fetch) =>
    api.delete<void>(`/admin/users/${id}/api-keys/${keyId}`, undefined, fetchFn),

  /**
   * Get list of sample components with pagination, search, and filtering
   */
  getSamples: (params?: GetSamplesParams, fetchFn?: typeof fetch) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.type) searchParams.set('type', params.type);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/admin/samples?${queryString}` : '/admin/samples';

    return api.get<AdminSampleComponentListResponse>(endpoint, undefined, fetchFn);
  },

  /**
   * Create a sample card component
   */
  createSampleCard: (data: CreateCardDto, fetchFn?: typeof fetch) =>
    api.post<CardComponent>('/admin/samples/cards', data, undefined, fetchFn),

  /**
   * Create a sample player mat component
   */
  createSamplePlayerMat: (data: CreatePlayerMatDto, fetchFn?: typeof fetch) =>
    api.post<PlayerMatComponent>('/admin/samples/playermats', data, undefined, fetchFn),

  /**
   * Get a sample component by ID (with full details)
   */
  getSample: (id: string, fetchFn?: typeof fetch) =>
    api.get<GameComponent>(`/admin/samples/${id}`, undefined, fetchFn),

  /**
   * Save a sample component design
   */
  saveSampleDesign: (id: string, part: string, design: string | null, fetchFn?: typeof fetch) =>
    api.put<GameComponent>(`/admin/samples/${id}/design/${part}`, { design }, undefined, fetchFn),

  /**
   * Update data source for a sample component
   */
  updateSampleDataSource: (id: string, dataSourceId: string | null, fetchFn?: typeof fetch) =>
    api.put<GameComponent>(`/admin/samples/${id}/datasource`, { dataSourceId }, undefined, fetchFn)
};
