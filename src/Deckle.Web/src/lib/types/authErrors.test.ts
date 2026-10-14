import { describe, it, expect } from 'vitest';
import { ApiError } from '$lib/api/client';
import {
  ACCOUNT_DISABLED_MESSAGE,
  getAuthErrorCode,
  getAuthErrorMessage,
  getRedirectErrorMessage
} from './authErrors';
import { isRegistrationPending } from './user';

describe('getAuthErrorCode', () => {
  it('returns the code from an ApiError response', () => {
    const err = new ApiError(403, 'Email not confirmed', {
      error: 'Email not confirmed',
      code: 'email_not_confirmed'
    });
    expect(getAuthErrorCode(err)).toBe('email_not_confirmed');
  });

  it('returns null for an unknown code', () => {
    expect(getAuthErrorCode(new ApiError(403, 'x', { code: 'something_else' }))).toBeNull();
  });

  it('returns null when the response has no code', () => {
    expect(getAuthErrorCode(new ApiError(400, 'Invalid email or password', { error: 'x' }))).toBeNull();
    expect(getAuthErrorCode(new ApiError(500, 'Server error'))).toBeNull();
  });

  it('returns null for non-ApiErrors', () => {
    expect(getAuthErrorCode(new Error('boom'))).toBeNull();
    expect(getAuthErrorCode({ response: { code: 'account_disabled' } })).toBeNull();
  });
});

describe('getAuthErrorMessage', () => {
  it('uses a friendly message for disabled accounts', () => {
    const err = new ApiError(403, 'Account disabled', { code: 'account_disabled' });
    expect(getAuthErrorMessage(err)).toBe(ACCOUNT_DISABLED_MESSAGE);
  });

  it('uses the API message for other ApiErrors', () => {
    const err = new ApiError(400, 'Invalid email or password', { error: 'Invalid email or password' });
    expect(getAuthErrorMessage(err)).toBe('Invalid email or password');
  });

  it('explains rate limiting', () => {
    expect(getAuthErrorMessage(new ApiError(429, 'HTTP 429: Too Many Requests'))).toMatch(/too many/i);
  });

  it('falls back to a generic message for unknown errors', () => {
    expect(getAuthErrorMessage(new Error('boom'))).toMatch(/unexpected error/i);
  });
});

describe('getRedirectErrorMessage', () => {
  it('maps account_disabled', () => {
    expect(getRedirectErrorMessage('account_disabled')).toBe(ACCOUNT_DISABLED_MESSAGE);
  });

  it('ignores missing or unknown codes', () => {
    expect(getRedirectErrorMessage(null)).toBeNull();
    expect(getRedirectErrorMessage('whatever')).toBeNull();
  });
});

describe('isRegistrationPending', () => {
  it('detects a pending registration', () => {
    expect(isRegistrationPending({ requiresConfirmation: true })).toBe(true);
  });

  it('returns false for a signed-in user', () => {
    expect(isRegistrationPending({ id: '1', email: 'a@example.com' })).toBe(false);
    expect(isRegistrationPending(undefined)).toBe(false);
  });
});
