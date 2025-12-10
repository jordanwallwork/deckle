import { api } from './client';
import type { DataSource, CreateDataSourceDto } from '$lib/types';

/**
 * Data Sources API
 */
export const dataSourcesApi = {
  /**
   * Get all data sources for a project
   */
  listByProject: (projectId: string, fetchFn?: typeof fetch) =>
    api.get<DataSource[]>(`/data-sources/project/${projectId}`, undefined, fetchFn),

  /**
   * Get a single data source by ID
   */
  getById: (id: string, fetchFn?: typeof fetch) =>
    api.get<DataSource>(`/data-sources/${id}`, undefined, fetchFn),

  /**
   * Get metadata for a data source (e.g., spreadsheet info)
   */
  getMetadata: (id: string, fetchFn?: typeof fetch) =>
    api.get<any>(`/data-sources/${id}/metadata`, undefined, fetchFn),

  /**
   * Create a new data source
   */
  create: (data: CreateDataSourceDto, fetchFn?: typeof fetch) =>
    api.post<DataSource>('/data-sources', data, undefined, fetchFn),

  /**
   * Delete a data source
   */
  delete: (id: string, fetchFn?: typeof fetch) =>
    api.delete<void>(`/data-sources/${id}`, undefined, fetchFn),
};
