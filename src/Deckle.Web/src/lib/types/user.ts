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

export interface ExternalLink {
  label: string;
  url: string;
}

// Current user DTO from /auth/me and /auth/profile endpoints
export interface CurrentUser {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  picture?: string;
  role?: string;
  bio?: string;
  externalLinks?: ExternalLink[];
}

/** Returned by POST /auth/register when the email must be confirmed before signing in */
export interface RegistrationPendingResponse {
  requiresConfirmation: true;
}

export function isRegistrationPending(
  response: CurrentUser | RegistrationPendingResponse | undefined
): response is RegistrationPendingResponse {
  return (response as RegistrationPendingResponse | undefined)?.requiresConfirmation === true;
}

export interface UpdateProfileRequest {
  bio?: string | null;
  externalLinks?: ExternalLink[] | null;
}

// Public profile types
export interface PublicProjectSummary {
  name: string;
  code: string;
  description?: string;
  visibility: import('./project').ProjectVisibility;
  ownerUsername: string;
}

export interface PublicUserProfile {
  username: string;
  name?: string;
  bio?: string;
  picture?: string;
  externalLinks?: ExternalLink[];
  projects: PublicProjectSummary[];
}

// Admin user management types
export interface AdminUser {
  id: string;
  email: string;
  username?: string;
  name?: string;
  pictureUrl?: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
  storageQuotaMb: number;
  storageUsedBytes: number;
  projectCount: number;
  emailConfirmed: boolean;
  isDisabled: boolean;
}

export interface AdminApiKey {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
}

/** A project owned by the user, as shown on the admin user detail page */
export interface AdminUserProject {
  id: string;
  name: string;
  code: string;
  ownerUsername: string;
  visibility: string;
  componentCount: number;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUser {
  emailConfirmedAt?: string;
  disabledAt?: string;
  hasGoogleSignIn: boolean;
  hasPassword: boolean;
  apiKeys: AdminApiKey[];
  projects: AdminUserProject[];
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
