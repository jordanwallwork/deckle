// DataSource entity types

export type DataSourceType = 'GoogleSheets';

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
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataSourceDto {
  projectId: string;
  name: string;
  url: string;
  sheetGid?: number;
}
