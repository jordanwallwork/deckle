import { describe, expect, it } from 'vitest';
import { formatStorage, getStoragePercentage } from './storage.utils';

const MB = 1024 * 1024;

describe('formatStorage', () => {
  it('formats usage under 1 MB in KB', () => {
    expect(formatStorage(512 * 1024, 50)).toBe('512.0 KB / 50 MB');
  });

  it('formats zero usage in KB', () => {
    expect(formatStorage(0, 50)).toBe('0.0 KB / 50 MB');
  });

  it('formats usage of 1 MB or more in MB', () => {
    expect(formatStorage(12.34 * MB, 100)).toBe('12.3 MB / 100 MB');
  });
});

describe('getStoragePercentage', () => {
  it('returns the percentage of the quota used', () => {
    expect(getStoragePercentage(25 * MB, 100)).toBe(25);
  });

  it('clamps to 100 when over quota', () => {
    expect(getStoragePercentage(200 * MB, 100)).toBe(100);
  });

  it('returns 0 when the quota is zero', () => {
    expect(getStoragePercentage(10 * MB, 0)).toBe(0);
  });
});
