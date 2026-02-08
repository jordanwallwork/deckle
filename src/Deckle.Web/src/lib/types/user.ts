// User entity types

export interface User {
  id: string;
  googleId: string;
  email: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  pictureUrl?: string;
  locale?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

// Current user DTO from /auth/me endpoint
export interface CurrentUser {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  picture?: string;
  role?: string;
}

// Admin user management types
export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  pictureUrl?: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  storageQuotaMb: number;
  storageUsedBytes: number;
  projectCount: number;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Username availability response
export interface UsernameAvailabilityResponse {
  available: boolean;
  error?: string;
}

// Set username request
export interface SetUsernameRequest {
  username: string;
}

// Set username response
export interface SetUsernameResponse {
  username: string;
}

// Admin sample component types
export interface AdminSampleComponent {
  id: string;
  type: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  stats: Record<string, string>;
  dataSource?: { id: string; name: string } | null;
}

export interface AdminSampleComponentListResponse {
  components: AdminSampleComponent[];
  totalCount: number;
  page: number;
  pageSize: number;
}

// Admin sample data source types
export interface AdminSampleDataSource {
  id: string;
  name: string;
  headers?: string[] | null;
  rowCount?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSampleDataSourceDetail extends AdminSampleDataSource {
  jsonData?: string | null;
}

export interface AdminSampleDataSourceListResponse {
  dataSources: AdminSampleDataSource[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface CreateSampleDataSourceDto {
  name: string;
  jsonData?: string | null;
}

export interface UpdateSampleDataSourceDto {
  name: string;
  jsonData?: string | null;
}
