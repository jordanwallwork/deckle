// DataSource entity types

export type DataSourceType = 'GoogleSheets' | 'Sample';

export type DataSourceSyncStatus = 'idle' | 'syncing' | 'error';

export interface DataSource {
  id: string;
  projectId: string | null;
  name: string;
  type: DataSourceType;
  connectionString: string;
  googleSheetsId?: string;
  googleSheetsUrl?: string;
  sheetGid?: number;
  csvExportUrl?: string;
  jsonData?: string | null;
  headers?: string[];
  rowCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataSourceDto {
  projectId: string;
  name: string;
  url: string;
  sheetGid?: number;
}

export interface UpdateDataSourceDto {
  name: string;
}

export interface SyncDataSourceMetadataRequest {
  headers: string[];
  rowCount: number;
}

export interface CopySampleDataSourceDto {
  projectId: string;
  sampleDataSourceId: string;
}

export interface DataSourceMetadata {
  id: string;
  name: string;
  googleSheetsId?: string;
  googleSheetsUrl?: string;
  sheetGid?: number;
  csvExportUrl?: string;
}
