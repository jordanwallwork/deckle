import { describe, it, expect } from 'vitest';
import { CARD_SIZES, DICE_TYPES, DICE_STYLES, DICE_COLORS, PLAYER_MAT_SIZES } from './components';

describe('CARD_SIZES', () => {
  it('includes Standard Poker with the correct dimensions', () => {
    const standard = CARD_SIZES.find((s) => s.value === 'StandardPoker');
    expect(standard).toBeDefined();
    expect(standard?.widthMm).toBe(63.5);
    expect(standard?.heightMm).toBe(88.9);
  });

  it('all sizes have positive dimensions', () => {
    for (const size of CARD_SIZES) {
      expect(size.widthMm).toBeGreaterThan(0);
      expect(size.heightMm).toBeGreaterThan(0);
    }
  });

  it('square sizes have equal width and height', () => {
    const squareSizes = CARD_SIZES.filter((s) => s.value.includes('Square'));
    expect(squareSizes.length).toBeGreaterThan(0);
    for (const size of squareSizes) {
      expect(size.widthMm).toBe(size.heightMm);
    }
  });

  it('all sizes have a non-empty label and value', () => {
    for (const size of CARD_SIZES) {
      expect(size.label.length).toBeGreaterThan(0);
      expect(size.value.length).toBeGreaterThan(0);
    }
  });
});

describe('DICE_TYPES', () => {
  it('includes all standard dice types', () => {
    const values = DICE_TYPES.map((d) => d.value);
    expect(values).toContain('D4');
    expect(values).toContain('D6');
    expect(values).toContain('D8');
    expect(values).toContain('D10');
    expect(values).toContain('D12');
    expect(values).toContain('D20');
  });

  it('each type has a matching label', () => {
    for (const dice of DICE_TYPES) {
      expect(dice.label).toBe(dice.value);
    }
  });
});

describe('DICE_STYLES', () => {
  it('includes Numbered, Pips, and Blank styles', () => {
    const values = DICE_STYLES.map((s) => s.value);
    expect(values).toContain('Numbered');
    expect(values).toContain('Pips');
    expect(values).toContain('Blank');
  });
});

describe('DICE_COLORS', () => {
  it('all colors have a valid hex value', () => {
    for (const color of DICE_COLORS) {
      expect(color.hex).toMatch(/^#[0-9a-fA-F]{3,8}$/);
    }
  });

  it('colorblindFriendly is a boolean on every color', () => {
    for (const color of DICE_COLORS) {
      expect(typeof color.colorblindFriendly).toBe('boolean');
    }
  });

  it('includes at least one colorblind-friendly color', () => {
    expect(DICE_COLORS.some((c) => c.colorblindFriendly)).toBe(true);
  });
});

describe('PLAYER_MAT_SIZES', () => {
  it('includes A4 with the correct dimensions', () => {
    const a4 = PLAYER_MAT_SIZES.find((s) => s.value === 'A4');
    expect(a4).toBeDefined();
    expect(a4?.widthMm).toBe(210);
    expect(a4?.heightMm).toBe(297);
  });

  it('includes US Letter with the correct dimensions', () => {
    const letter = PLAYER_MAT_SIZES.find((s) => s.value === 'USLetter');
    expect(letter).toBeDefined();
    expect(letter?.widthMm).toBe(215.9);
    expect(letter?.heightMm).toBe(279.4);
  });

  it('all sizes have positive dimensions', () => {
    for (const size of PLAYER_MAT_SIZES) {
      expect(size.widthMm).toBeGreaterThan(0);
      expect(size.heightMm).toBeGreaterThan(0);
    }
  });
});
