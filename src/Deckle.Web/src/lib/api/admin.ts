import { api } from './client';
import type { AdminUser, AdminUserListResponse, AdminSampleComponentListResponse } from '$lib/types';

export interface GetUsersParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface GetSamplesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
}

/**
 * Admin API
 */
export const adminApi = {
  /**
   * Get list of users with pagination and search
   */
  getUsers: (params?: GetUsersParams, fetchFn?: typeof fetch) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/admin/users?${queryString}` : '/admin/users';

    return api.get<AdminUserListResponse>(endpoint, undefined, fetchFn);
  },

  /**
   * Get a specific user by ID
   */
  getUser: (id: string, fetchFn?: typeof fetch) =>
    api.get<AdminUser>(`/admin/users/${id}`, undefined, fetchFn),

  /**
   * Update user role
   */
  updateUserRole: (id: string, role: string, fetchFn?: typeof fetch) =>
    api.put<AdminUser>(`/admin/users/${id}/role`, { role }, undefined, fetchFn),

  /**
   * Update user storage quota
   */
  updateUserQuota: (id: string, storageQuotaMb: number, fetchFn?: typeof fetch) =>
    api.put<AdminUser>(`/admin/users/${id}/quota`, { storageQuotaMb }, undefined, fetchFn),

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
  }
};
