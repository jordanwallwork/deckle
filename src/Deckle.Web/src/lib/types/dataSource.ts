// DataSource entity types

export type DataSourceType = 'GoogleSheets' | 'Sample' | 'Spreadsheet';

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
  sourceDataSourceId?: string | null;
  headers?: string[];
  rowCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataSourceDto {
  type: DataSourceType;
  projectId?: string;
  name: string;
}

export interface CreateGoogleSheetsDataSourceDto extends CreateDataSourceDto {
  type: 'GoogleSheets';
  url: string;
  sheetGid?: number;
}

export interface CreateSpreadsheetDataSourceDto extends CreateDataSourceDto {
  type: 'Spreadsheet';
}

export interface UpdateDataSourceDto {
  name: string;
  jsonData?: string;
}

export interface SyncDataSourceMetadataRequest {
  headers: string[];
  rowCount: number;
}

export interface CopySampleDataSourceDto {
  projectId: string;
  sampleDataSourceId: string;
}

export interface UpdateSpreadsheetDataSourceDto {
  name: string;
  jsonData?: string | null;
}

export interface DataSourceMetadata {
  id: string;
  name: string;
  googleSheetsId?: string;
  googleSheetsUrl?: string;
  sheetGid?: number;
  csvExportUrl?: string;
}
