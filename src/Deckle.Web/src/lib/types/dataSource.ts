// DataSource entity types

export type DataSourceType = 'GoogleSheets';

export type DataSourceSyncStatus = 'idle' | 'syncing' | 'error';

export interface DataSource {
  id: string;
  projectId: string;
  name: string;
  type: DataSourceType;
  connectionString: string;
  googleSheetsId?: string;
  googleSheetsUrl?: string;
  sheetGid?: number;
  csvExportUrl?: string;
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

export interface SyncDataSourceMetadataRequest {
  headers: string[];
  rowCount: number;
}
