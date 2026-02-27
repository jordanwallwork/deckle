import { describe, it, expect } from 'vitest';
import { ApiError } from '$lib/api/client';
import {
  isValidationError,
  getValidationErrors,
  getFieldValidation,
  getGeneralErrors
} from './validation';

const makeValidationError = (errors: Record<string, string[]>) =>
  new ApiError(400, 'Validation failed', { errors });

describe('isValidationError', () => {
  it('returns true for a 400 ApiError with an errors object', () => {
    const err = makeValidationError({ Name: ['Name is required'] });
    expect(isValidationError(err)).toBe(true);
  });

  it('returns false for a non-400 ApiError', () => {
    expect(isValidationError(new ApiError(500, 'Server error'))).toBe(false);
    expect(isValidationError(new ApiError(404, 'Not found'))).toBe(false);
  });

  it('returns false for a 400 ApiError without an errors object in the response', () => {
    expect(isValidationError(new ApiError(400, 'Bad request'))).toBe(false);
    expect(isValidationError(new ApiError(400, 'Bad request', { message: 'oops' }))).toBe(false);
  });

  it('returns false for a plain Error', () => {
    expect(isValidationError(new Error('something went wrong'))).toBe(false);
  });

  it('returns false for non-Error values', () => {
    expect(isValidationError('string error')).toBe(false);
    expect(isValidationError(null)).toBe(false);
    expect(isValidationError(undefined)).toBe(false);
    expect(isValidationError(42)).toBe(false);
  });
});

describe('getValidationErrors', () => {
  it('returns the response when the error is a validation error', () => {
    const err = makeValidationError({ Name: ['Required'] });
    expect(getValidationErrors(err)).toEqual({ errors: { Name: ['Required'] } });
  });

  it('returns null for a non-validation ApiError', () => {
    expect(getValidationErrors(new ApiError(500, 'Server error'))).toBeNull();
  });

  it('returns null for non-ApiError values', () => {
    expect(getValidationErrors(new Error('plain error'))).toBeNull();
    expect(getValidationErrors(null)).toBeNull();
  });
});

describe('getFieldValidation', () => {
  const errors = {
    errors: {
      Name: ['Name is required', 'Name must be at least 3 characters'],
      Email: []
    }
  };

  it('returns invalid=true with messages for a field that has errors', () => {
    expect(getFieldValidation(errors, 'Name')).toEqual({
      invalid: true,
      messages: ['Name is required', 'Name must be at least 3 characters']
    });
  });

  it('returns invalid=false with empty messages for a field with an empty array', () => {
    expect(getFieldValidation(errors, 'Email')).toEqual({ invalid: false, messages: [] });
  });

  it('returns invalid=false with empty messages for a field not present in the errors', () => {
    expect(getFieldValidation(errors, 'UnknownField')).toEqual({ invalid: false, messages: [] });
  });

  it('returns invalid=false with empty messages when validationErrors is null', () => {
    expect(getFieldValidation(null, 'Name')).toEqual({ invalid: false, messages: [] });
  });
});

describe('getGeneralErrors', () => {
  it('returns errors stored under the empty-string key', () => {
    const errors = { errors: { '': ['Something went wrong globally'], Name: ['Required'] } };
    expect(getGeneralErrors(errors)).toEqual(['Something went wrong globally']);
  });

  it('returns an empty array when there are no general errors', () => {
    const errors = { errors: { Name: ['Required'] } };
    expect(getGeneralErrors(errors)).toEqual([]);
  });

  it('returns an empty array when validationErrors is null', () => {
    expect(getGeneralErrors(null)).toEqual([]);
  });
});
