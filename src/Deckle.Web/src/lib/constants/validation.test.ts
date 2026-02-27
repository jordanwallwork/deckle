import { describe, it, expect } from 'vitest';
import { EMAIL_RULES, USERNAME_RULES } from './validation';

describe('EMAIL_RULES.pattern', () => {
  it('matches well-formed email addresses', () => {
    expect(EMAIL_RULES.pattern.test('user@example.com')).toBe(true);
    expect(EMAIL_RULES.pattern.test('user.name+tag@subdomain.example.co.uk')).toBe(true);
    expect(EMAIL_RULES.pattern.test('a@b.io')).toBe(true);
  });

  it('rejects addresses without an @ sign', () => {
    expect(EMAIL_RULES.pattern.test('notanemail')).toBe(false);
  });

  it('rejects addresses without a domain', () => {
    expect(EMAIL_RULES.pattern.test('@nodomain.com')).toBe(false);
  });

  it('rejects addresses without a TLD (no dot in domain)', () => {
    expect(EMAIL_RULES.pattern.test('user@nodot')).toBe(false);
  });

  it('rejects addresses containing spaces', () => {
    expect(EMAIL_RULES.pattern.test('user name@example.com')).toBe(false);
  });
});

describe('USERNAME_RULES', () => {
  it('has the correct minimum and maximum lengths', () => {
    expect(USERNAME_RULES.minLength).toBe(3);
    expect(USERNAME_RULES.maxLength).toBe(30);
  });

  describe('pattern', () => {
    it('matches alphanumeric usernames', () => {
      expect(USERNAME_RULES.pattern.test('validuser')).toBe(true);
      expect(USERNAME_RULES.pattern.test('User123')).toBe(true);
      expect(USERNAME_RULES.pattern.test('CamelCase')).toBe(true);
    });

    it('matches usernames with underscores', () => {
      expect(USERNAME_RULES.pattern.test('user_name')).toBe(true);
      expect(USERNAME_RULES.pattern.test('_leading')).toBe(true);
    });

    it('rejects usernames with spaces', () => {
      expect(USERNAME_RULES.pattern.test('user name')).toBe(false);
    });

    it('rejects usernames with hyphens', () => {
      expect(USERNAME_RULES.pattern.test('user-name')).toBe(false);
    });

    it('rejects usernames with special characters', () => {
      expect(USERNAME_RULES.pattern.test('user@name')).toBe(false);
      expect(USERNAME_RULES.pattern.test('user.name')).toBe(false);
    });
  });

  describe('inputPattern (characters to strip during input)', () => {
    it('strips uppercase letters, spaces, and special characters', () => {
      // Pattern is /[^a-z0-9_]/g — uppercase, spaces, and symbols are all stripped
      expect('Hello World!'.replace(USERNAME_RULES.inputPattern, '')).toBe('elloorld');
    });

    it('preserves lowercase letters, digits, and underscores', () => {
      expect('abc_123'.replace(USERNAME_RULES.inputPattern, '')).toBe('abc_123');
    });
  });
});
