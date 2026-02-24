import { describe, it, expect } from 'vitest';
import { mmToPx, ptToPx } from './size.utils';

describe('mmToPx', () => {
  it('converts 25.4 mm (1 inch) to the given DPI', () => {
    expect(mmToPx(25.4, 96)).toBe(96);
    expect(mmToPx(25.4, 300)).toBe(300);
  });

  it('rounds to the nearest integer', () => {
    // 1mm at 96 DPI = 1/25.4 * 96 ≈ 3.779 → 4
    expect(mmToPx(1, 96)).toBe(4);
  });

  it('returns 0 for 0 mm', () => {
    expect(mmToPx(0, 300)).toBe(0);
  });

  it('scales linearly with DPI', () => {
    const low = mmToPx(10, 96);
    const high = mmToPx(10, 192);
    expect(high).toBe(low * 2);
  });
});

describe('ptToPx', () => {
  it('converts 72pt (1 typographic inch) to the given DPI', () => {
    // 72pt × 0.352778 mm/pt ≈ 25.4 mm → 1 inch → DPI pixels
    expect(ptToPx(72, 96)).toBe(96);
    expect(ptToPx(72, 300)).toBe(300);
  });

  it('returns 0 for 0 pt', () => {
    expect(ptToPx(0, 300)).toBe(0);
  });
});
