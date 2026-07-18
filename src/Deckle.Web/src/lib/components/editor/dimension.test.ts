import { describe, it, expect } from 'vitest';
import {
  px,
  mm,
  percent,
  toDimension,
  toStored,
  toCss,
  toPx,
  type Dimension
} from './dimension';

// ============================================================================
// Constructors
// ============================================================================

describe('constructors', () => {
  it('px builds a px dimension', () => {
    expect(px(10)).toEqual({ unit: 'px', value: 10 });
  });

  it('mm builds an mm dimension', () => {
    expect(mm(5)).toEqual({ unit: 'mm', value: 5 });
  });

  it('percent builds a percent dimension', () => {
    expect(percent(50)).toEqual({ unit: 'percent', value: 50 });
  });
});

// ============================================================================
// toDimension
// ============================================================================

describe('toDimension', () => {
  it('parses a number as px', () => {
    expect(toDimension(10)).toEqual(px(10));
    expect(toDimension(0)).toEqual(px(0));
  });

  it('parses an mm string', () => {
    expect(toDimension('5mm')).toEqual(mm(5));
    expect(toDimension('25.4mm')).toEqual(mm(25.4));
  });

  it('parses a percent string', () => {
    expect(toDimension('50%')).toEqual(percent(50));
  });

  it('parses a px string', () => {
    expect(toDimension('10px')).toEqual(px(10));
  });

  it('parses a bare numeric string as px', () => {
    expect(toDimension('12')).toEqual(px(12));
    expect(toDimension('12.5')).toEqual(px(12.5));
  });

  it('returns undefined for undefined', () => {
    expect(toDimension(undefined)).toBeUndefined();
  });

  it('returns undefined for an empty string', () => {
    expect(toDimension('')).toBeUndefined();
    expect(toDimension('   ')).toBeUndefined();
  });

  it('returns undefined for unparseable strings', () => {
    expect(toDimension('auto')).toBeUndefined();
    expect(toDimension('abc')).toBeUndefined();
  });
});

// ============================================================================
// toStored
// ============================================================================

describe('toStored', () => {
  it('serializes px to a plain number (canonicalization)', () => {
    expect(toStored(px(10))).toBe(10);
  });

  it('serializes mm to an mm string', () => {
    expect(toStored(mm(5))).toBe('5mm');
  });

  it('serializes percent to a % string', () => {
    expect(toStored(percent(50))).toBe('50%');
  });

  it('returns undefined for undefined', () => {
    expect(toStored(undefined)).toBeUndefined();
  });

  it('round-trips canonical inputs', () => {
    expect(toStored(toDimension(10))).toBe(10);
    expect(toStored(toDimension('5mm'))).toBe('5mm');
    expect(toStored(toDimension('50%'))).toBe('50%');
  });

  it('canonicalizes a "10px" string to the number 10', () => {
    expect(toStored(toDimension('10px'))).toBe(10);
  });
});

// ============================================================================
// toCss
// ============================================================================

describe('toCss', () => {
  it('returns undefined for undefined', () => {
    expect(toCss(undefined)).toBeUndefined();
  });

  it('renders px as a px string', () => {
    expect(toCss(px(10))).toBe('10px');
  });

  it('renders mm with dpi as a px string', () => {
    // 25.4mm at 96 DPI = 96px
    expect(toCss(mm(25.4), 96)).toBe('96px');
  });

  it('renders mm without dpi as an mm string', () => {
    expect(toCss(mm(10))).toBe('10mm');
  });

  it('renders percent as a % string', () => {
    expect(toCss(percent(50))).toBe('50%');
    expect(toCss(percent(100), 96)).toBe('100%');
  });
});

// ============================================================================
// toPx
// ============================================================================

describe('toPx', () => {
  it('returns undefined for undefined', () => {
    expect(toPx(undefined)).toBeUndefined();
  });

  it('returns the value for px', () => {
    expect(toPx(px(42))).toBe(42);
  });

  it('converts mm using dpi', () => {
    // 25.4mm at 96 DPI = 96px
    expect(toPx(mm(25.4), 96)).toBe(96);
  });

  it('converts percent with an explicit reference', () => {
    // 25% of a 200px reference = 50px
    expect(toPx(percent(25), 96, 200)).toBe(50);
  });

  it('returns undefined for percent without a reference', () => {
    expect(toPx(percent(25), 96)).toBeUndefined();
  });
});
