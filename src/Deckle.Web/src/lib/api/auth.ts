import { api } from './client';
import type { User } from '$lib/types';

/**
 * Google Sheets Auth Status Response
 */
export interface GoogleSheetsAuthStatus {
  authorized: boolean;
  email?: string;
}

/**
 * Authentication API
 */
export const authApi = {
  /**
   * Get current user information
   */
  me: (fetchFn?: typeof fetch) => api.get<User>('/auth/me', undefined, fetchFn),

  /**
   * Check Google Sheets authorization status
   */
  googleSheetsStatus: (fetchFn?: typeof fetch) =>
    api.get<GoogleSheetsAuthStatus>('/google-sheets-auth/status', undefined, fetchFn),

  /**
   * Get Google Sheets authorization URL
   * Returns the URL to redirect to for OAuth flow
   */
  googleSheetsAuthorize: (fetchFn?: typeof fetch) =>
    api.get<{ authUrl: string }>('/google-sheets-auth/authorize', undefined, fetchFn),
};
