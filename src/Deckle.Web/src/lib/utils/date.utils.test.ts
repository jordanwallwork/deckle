import { describe, it, expect } from 'vitest';
import { formatRelativeTime } from './date.utils';

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

describe('formatRelativeTime', () => {
  it('returns "Just now" for times less than 1 minute ago', () => {
    expect(formatRelativeTime(ago(30_000))).toBe('Just now');
  });

  it('returns singular "1 minute ago"', () => {
    expect(formatRelativeTime(ago(1 * 60_000 + 500))).toBe('1 minute ago');
  });

  it('returns plural "N minutes ago"', () => {
    expect(formatRelativeTime(ago(5 * 60_000 + 500))).toBe('5 minutes ago');
  });

  it('returns singular "1 hour ago"', () => {
    expect(formatRelativeTime(ago(1 * 3_600_000 + 500))).toBe('1 hour ago');
  });

  it('returns plural "N hours ago"', () => {
    expect(formatRelativeTime(ago(3 * 3_600_000 + 500))).toBe('3 hours ago');
  });

  it('returns singular "1 day ago"', () => {
    expect(formatRelativeTime(ago(1 * 86_400_000 + 500))).toBe('1 day ago');
  });

  it('returns plural "N days ago" for dates within 7 days', () => {
    expect(formatRelativeTime(ago(3 * 86_400_000 + 500))).toBe('3 days ago');
  });

  it('returns a formatted date string for dates older than 7 days', () => {
    const result = formatRelativeTime('2020-01-15T12:00:00Z');
    expect(result).not.toMatch(/ago$/);
    expect(result).not.toBe('Just now');
    // Should contain the year
    expect(result).toContain('2020');
  });
});
