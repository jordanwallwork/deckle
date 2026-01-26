// Shared validation rules for forms

export const EMAIL_RULES = {
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  messages: {
    required: 'Email is required',
    invalid: 'Please enter a valid email address'
  }
} as const;

export const USERNAME_RULES = {
  minLength: 3,
  maxLength: 30,
  pattern: /^[a-zA-Z0-9_]+$/,
  inputPattern: /[^a-z0-9_]/g,
  messages: {
    tooShort: 'Username must be at least 3 characters',
    tooLong: 'Username must be 30 characters or less',
    invalidChars: 'Username can only contain letters, numbers, and underscores',
    taken: 'Username is already taken'
  }
} as const;
