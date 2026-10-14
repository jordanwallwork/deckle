import { ApiError } from '$lib/api/client';

/** Machine-readable `code` values the API returns alongside auth errors */
export type AuthErrorCode = 'email_not_confirmed' | 'account_disabled' | 'invalid_token';

const AUTH_ERROR_CODES: readonly AuthErrorCode[] = [
  'email_not_confirmed',
  'account_disabled',
  'invalid_token'
];

export const ACCOUNT_DISABLED_MESSAGE =
  'This account has been disabled. If you think this is a mistake, please get in touch.';

function isAuthErrorCode(value: unknown): value is AuthErrorCode {
  return typeof value === 'string' && (AUTH_ERROR_CODES as readonly string[]).includes(value);
}

/**
 * Extract the auth error code from an API error, e.g. `{ error, code: "account_disabled" }`.
 * Returns null for anything else.
 */
export function getAuthErrorCode(error: unknown): AuthErrorCode | null {
  if (!(error instanceof ApiError)) return null;
  const code: unknown = error.response?.code;
  return isAuthErrorCode(code) ? code : null;
}

/** A user-facing message for an error thrown by a sign-in, register or confirm call */
export function getAuthErrorMessage(error: unknown): string {
  if (getAuthErrorCode(error) === 'account_disabled') return ACCOUNT_DISABLED_MESSAGE;
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Too many attempts. Please wait a moment and try again.';
    return error.message;
  }
  return 'An unexpected error occurred. Please try again.';
}

/** Maps the `?error=` query parameter set by server-side redirects (e.g. Google sign-in) */
export function getRedirectErrorMessage(code: string | null): string | null {
  if (code === 'account_disabled') return ACCOUNT_DISABLED_MESSAGE;
  return null;
}
