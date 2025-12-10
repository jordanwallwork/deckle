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
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataSourceDto {
  name: string;
  type: DataSourceType;
  googleSheetsUrl: string;
}
