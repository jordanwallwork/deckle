import { api } from './client';
import type {
  AdminUser,
  AdminUserListResponse,
  AdminSampleComponentListResponse,
  AdminSampleDataSourceListResponse,
  AdminSampleDataSourceDetail,
  CreateSampleDataSourceDto,
  UpdateSampleDataSourceDto,
  CreateCardDto,
  CreatePlayerMatDto,
  CardComponent,
  PlayerMatComponent,
  GameComponent
} from '$lib/types';

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
   * Link/unlink a data source to a sample component
   */
  updateSampleComponentDataSource: (
    componentId: string,
    dataSourceId: string | null,
    fetchFn?: typeof fetch
  ) =>
    api.put<GameComponent>(
      `/admin/samples/${componentId}/datasource`,
      { dataSourceId },
      undefined,
      fetchFn
    ),

  /**
   * Get list of sample data sources with pagination and search
   */
  getSampleDataSources: (params?: GetSampleDataSourcesParams, fetchFn?: typeof fetch) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.search) searchParams.set('search', params.search);

    const queryString = searchParams.toString();
    const endpoint = queryString ? `/admin/data-sources?${queryString}` : '/admin/data-sources';

    return api.get<AdminSampleDataSourceListResponse>(endpoint, undefined, fetchFn);
  },

  /**
   * Get a sample data source by ID (with JsonData)
   */
  getSampleDataSource: (id: string, fetchFn?: typeof fetch) =>
    api.get<AdminSampleDataSourceDetail>(`/admin/data-sources/${id}`, undefined, fetchFn),

  /**
   * Create a sample data source
   */
  createSampleDataSource: (data: CreateSampleDataSourceDto, fetchFn?: typeof fetch) =>
    api.post<AdminSampleDataSourceDetail>('/admin/data-sources', data, undefined, fetchFn),

  /**
   * Update a sample data source
   */
  updateSampleDataSource: (id: string, data: UpdateSampleDataSourceDto, fetchFn?: typeof fetch) =>
    api.put<AdminSampleDataSourceDetail>(`/admin/data-sources/${id}`, data, undefined, fetchFn),

  /**
   * Delete a sample data source
   */
  deleteSampleDataSource: (id: string, fetchFn?: typeof fetch) =>
    api.delete(`/admin/data-sources/${id}`, undefined, fetchFn)
};
