import { ApiError } from '$lib/api/client';

/**
 * Validation error response from the API.
 * Maps field names to arrays of error messages.
 */
export interface ValidationErrorResponse {
	errors: Record<string, string[]>;
}

/**
 * Field-level validation state for a single form field.
 */
export interface FieldValidation {
	invalid: boolean;
	messages: string[];
}

/**
 * Check if an API error is a validation error (400 with errors object).
 */
export function isValidationError(error: unknown): error is ApiError & { response: ValidationErrorResponse } {
	return (
		error instanceof ApiError &&
		error.status === 400 &&
		error.response?.errors !== undefined &&
		typeof error.response.errors === 'object'
	);
}

/**
 * Extract validation errors from an ApiError.
 * Returns null if the error is not a validation error.
 */
export function getValidationErrors(error: unknown): ValidationErrorResponse | null {
	if (isValidationError(error)) {
		return error.response;
	}
	return null;
}

/**
 * Get validation state for a specific field.
 */
export function getFieldValidation(
	validationErrors: ValidationErrorResponse | null,
	field: string
): FieldValidation {
	if (!validationErrors) {
		return { invalid: false, messages: [] };
	}
	const messages = validationErrors.errors[field] || [];
	return { invalid: messages.length > 0, messages };
}

/**
 * Get general (non-field-specific) validation errors.
 */
export function getGeneralErrors(validationErrors: ValidationErrorResponse | null): string[] {
	if (!validationErrors) {
		return [];
	}
	return validationErrors.errors[''] || [];
}
