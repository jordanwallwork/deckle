import { api } from './client';
import type {
  DataSource,
  CreateDataSourceDto,
  UpdateDataSourceDto,
  SyncDataSourceMetadataRequest,
  DataSourceMetadata,
  CopySampleDataSourceDto,
  CreateSpreadsheetDataSourceDto,
  UpdateSpreadsheetDataSourceDto
} from '$lib/types';

/**
 * Data Sources API
 */
export const dataSourcesApi = {
  /**
   * Get all data sources for a project
   */
  getAll: (projectId?: string, fetchFn?: typeof fetch) =>
    api.get<DataSource[]>(`/data-sources/project/${projectId ?? ''}`, undefined, fetchFn),

  /**
   * Get a single data source by ID
   */
  getById: (id: string, fetchFn?: typeof fetch) =>
    api.get<DataSource>(`/data-sources/${id}`, undefined, fetchFn),

  /**
   * Get metadata for a data source (e.g., spreadsheet info)
   */
  getMetadata: (id: string, fetchFn?: typeof fetch) =>
    api.get<DataSourceMetadata>(`/data-sources/${id}/metadata`, undefined, fetchFn),

  /**
   * Create a new data source
   */
  create: (data: CreateDataSourceDto, fetchFn?: typeof fetch) =>
    api.post<DataSource>(`/data-sources/${data.type}`, data, undefined, fetchFn),

  /**
   * Update a data source
   */
  update: (id: string, data: UpdateDataSourceDto, fetchFn?: typeof fetch) =>
    api.put<DataSource>(`/data-sources/${id}`, data, undefined, fetchFn),

  /**
   * Update a spreadsheet data source (name and JSON data)
   */
  updateSpreadsheet: (id: string, data: UpdateSpreadsheetDataSourceDto, fetchFn?: typeof fetch) =>
    api.put<DataSource>(`/data-sources/${id}/spreadsheet`, data, undefined, fetchFn),

  /**
   * Sync data source metadata (headers and row count)
   */
  sync: (id: string, data: SyncDataSourceMetadataRequest, fetchFn?: typeof fetch) =>
    api.post<DataSource>(`/data-sources/${id}/sync`, data, undefined, fetchFn),

  /**
   * Delete a data source
   */
  delete: (id: string, fetchFn?: typeof fetch) =>
    api.delete<void>(`/data-sources/${id}`, undefined, fetchFn),

  /**
   * Get data from a data source (CSV as 2D array)
   */
  getData: (id: string, fetchFn?: typeof fetch) =>
    api.get<{ data: string[][] }>(`/data-sources/${id}/data`, undefined, fetchFn),

  /**
   * Copy a sample data source into a project
   */
  copySample: (data: CopySampleDataSourceDto, fetchFn?: typeof fetch) =>
    api.post<DataSource>('/data-sources/copy-sample', data, undefined, fetchFn),

  /**
   * Create a spreadsheet data source
   */
  createSpreadsheet: (data: CreateSpreadsheetDataSourceDto, fetchFn?: typeof fetch) =>
    api.post<DataSource>('/data-sources/spreadsheet', data, undefined, fetchFn),

  /**
   * Get spreadsheet data source detail (includes JsonData)
   */
  getSpreadsheetDetail: (id: string, fetchFn?: typeof fetch) =>
    api.get<DataSource>(`/data-sources/${id}/spreadsheet`, undefined, fetchFn)
};
