import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  formatShortDate,
  getFileNameWithoutExtension,
  getFileExtension
} from './file.utils';

describe('formatFileSize', () => {
  it('formats 0 bytes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
  });

  it('formats bytes', () => {
    expect(formatFileSize(500)).toBe('500 Bytes');
  });

  it('formats kilobytes', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
  });

  it('formats megabytes', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
  });

  it('formats gigabytes', () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('formats with decimal places', () => {
    // 1536 / 1024 = 1.5
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });
});

describe('formatShortDate', () => {
  it('formats a date string as a short date', () => {
    const result = formatShortDate('2024-06-15T12:00:00Z');
    expect(result).toContain('2024');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
  });
});

describe('getFileNameWithoutExtension', () => {
  it('removes the extension', () => {
    expect(getFileNameWithoutExtension('photo.jpg')).toBe('photo');
  });

  it('removes only the last extension for names with multiple dots', () => {
    expect(getFileNameWithoutExtension('archive.tar.gz')).toBe('archive.tar');
  });

  it('returns the filename unchanged when there is no extension', () => {
    expect(getFileNameWithoutExtension('README')).toBe('README');
  });

  it('does not strip a leading dot (hidden files)', () => {
    // lastDot is at index 0, which is not > 0, so the full name is returned
    expect(getFileNameWithoutExtension('.gitignore')).toBe('.gitignore');
  });
});

describe('getFileExtension', () => {
  it('returns the extension including the dot', () => {
    expect(getFileExtension('photo.jpg')).toBe('.jpg');
  });

  it('returns the last extension for names with multiple dots', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('.gz');
  });

  it('returns an empty string when there is no extension', () => {
    expect(getFileExtension('README')).toBe('');
  });

  it('returns an empty string for a leading-dot-only name', () => {
    expect(getFileExtension('.gitignore')).toBe('');
  });
});
