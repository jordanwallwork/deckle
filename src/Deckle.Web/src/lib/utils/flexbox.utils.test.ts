import { describe, it, expect } from 'vitest';
import {
  cssToUserValue,
  userValueToCss,
  getXOptions,
  getYOptions,
  getAlignmentGridCells
} from './flexbox.utils';

describe('cssToUserValue', () => {
  describe('main axis, row direction (isColumn=false)', () => {
    it('maps flex-start to left', () => {
      expect(cssToUserValue('flex-start', 'main', false)).toBe('left');
    });

    it('maps flex-end to right', () => {
      expect(cssToUserValue('flex-end', 'main', false)).toBe('right');
    });

    it('maps center to center', () => {
      expect(cssToUserValue('center', 'main', false)).toBe('center');
    });

    it('maps space-between to space-between', () => {
      expect(cssToUserValue('space-between', 'main', false)).toBe('space-between');
    });

    it('maps space-around to space-around', () => {
      expect(cssToUserValue('space-around', 'main', false)).toBe('space-around');
    });

    it('normalises space-evenly to space-around', () => {
      expect(cssToUserValue('space-evenly', 'main', false)).toBe('space-around');
    });
  });

  describe('main axis, column direction (isColumn=true)', () => {
    it('maps flex-start to top', () => {
      expect(cssToUserValue('flex-start', 'main', true)).toBe('top');
    });

    it('maps flex-end to bottom', () => {
      expect(cssToUserValue('flex-end', 'main', true)).toBe('bottom');
    });

    it('maps center to center', () => {
      expect(cssToUserValue('center', 'main', true)).toBe('center');
    });
  });

  describe('cross axis, row direction (isColumn=false)', () => {
    it('maps flex-start to top', () => {
      expect(cssToUserValue('flex-start', 'cross', false)).toBe('top');
    });

    it('maps flex-end to bottom', () => {
      expect(cssToUserValue('flex-end', 'cross', false)).toBe('bottom');
    });

    it('maps center to center', () => {
      expect(cssToUserValue('center', 'cross', false)).toBe('center');
    });

    it('maps stretch to stretch', () => {
      expect(cssToUserValue('stretch', 'cross', false)).toBe('stretch');
    });

    it('normalises baseline to stretch', () => {
      expect(cssToUserValue('baseline', 'cross', false)).toBe('stretch');
    });
  });

  describe('cross axis, column direction (isColumn=true)', () => {
    it('maps flex-start to left', () => {
      expect(cssToUserValue('flex-start', 'cross', true)).toBe('left');
    });

    it('maps flex-end to right', () => {
      expect(cssToUserValue('flex-end', 'cross', true)).toBe('right');
    });
  });

  it('passes through unknown values unchanged', () => {
    expect(cssToUserValue('unknown-value', 'main', false)).toBe('unknown-value');
    expect(cssToUserValue('unknown-value', 'cross', true)).toBe('unknown-value');
  });
});

describe('userValueToCss', () => {
  describe('main axis', () => {
    it('maps left to flex-start', () => {
      expect(userValueToCss('left', 'main')).toBe('flex-start');
    });

    it('maps right to flex-end', () => {
      expect(userValueToCss('right', 'main')).toBe('flex-end');
    });

    it('maps top to flex-start', () => {
      expect(userValueToCss('top', 'main')).toBe('flex-start');
    });

    it('maps bottom to flex-end', () => {
      expect(userValueToCss('bottom', 'main')).toBe('flex-end');
    });

    it('maps center to center', () => {
      expect(userValueToCss('center', 'main')).toBe('center');
    });

    it('maps space-between to space-between', () => {
      expect(userValueToCss('space-between', 'main')).toBe('space-between');
    });

    it('maps space-around to space-around', () => {
      expect(userValueToCss('space-around', 'main')).toBe('space-around');
    });
  });

  describe('cross axis', () => {
    it('maps left to flex-start', () => {
      expect(userValueToCss('left', 'cross')).toBe('flex-start');
    });

    it('maps right to flex-end', () => {
      expect(userValueToCss('right', 'cross')).toBe('flex-end');
    });

    it('maps top to flex-start', () => {
      expect(userValueToCss('top', 'cross')).toBe('flex-start');
    });

    it('maps bottom to flex-end', () => {
      expect(userValueToCss('bottom', 'cross')).toBe('flex-end');
    });

    it('maps center to center', () => {
      expect(userValueToCss('center', 'cross')).toBe('center');
    });

    it('maps stretch to stretch', () => {
      expect(userValueToCss('stretch', 'cross')).toBe('stretch');
    });
  });

  it('passes through unknown values unchanged', () => {
    expect(userValueToCss('unknown-value', 'main')).toBe('unknown-value');
    expect(userValueToCss('unknown-value', 'cross')).toBe('unknown-value');
  });

  describe('round-trip with cssToUserValue', () => {
    it('round-trips main axis row values correctly', () => {
      const cases: [string, boolean][] = [
        ['flex-start', false],
        ['flex-end', false],
        ['center', false],
        ['space-between', false],
        ['space-around', false],
        ['flex-start', true],
        ['flex-end', true],
        ['center', true]
      ];
      for (const [cssValue, isColumn] of cases) {
        const userValue = cssToUserValue(cssValue, 'main', isColumn);
        expect(userValueToCss(userValue, 'main')).toBe(cssValue);
      }
    });

    it('round-trips cross axis values correctly', () => {
      const cases: [string, boolean][] = [
        ['flex-start', false],
        ['flex-end', false],
        ['center', false],
        ['stretch', false],
        ['flex-start', true],
        ['flex-end', true],
        ['center', true],
        ['stretch', true]
      ];
      for (const [cssValue, isColumn] of cases) {
        const userValue = cssToUserValue(cssValue, 'cross', isColumn);
        expect(userValueToCss(userValue, 'cross')).toBe(cssValue);
      }
    });
  });
});

describe('getXOptions', () => {
  it('always includes left, center, right', () => {
    for (const isColumn of [true, false]) {
      const values = getXOptions(isColumn).map((o) => o.value);
      expect(values).toContain('left');
      expect(values).toContain('center');
      expect(values).toContain('right');
    }
  });

  it('includes stretch for column layout (cross-axis alignment)', () => {
    const values = getXOptions(true).map((o) => o.value);
    expect(values).toContain('stretch');
    expect(values).not.toContain('space-between');
  });

  it('includes space-between and space-around for row layout (main-axis alignment)', () => {
    const values = getXOptions(false).map((o) => o.value);
    expect(values).toContain('space-between');
    expect(values).toContain('space-around');
    expect(values).not.toContain('stretch');
  });

  it('returns objects with value and label properties', () => {
    const options = getXOptions(false);
    for (const opt of options) {
      expect(opt).toHaveProperty('value');
      expect(opt).toHaveProperty('label');
    }
  });
});

describe('getYOptions', () => {
  it('always includes top, center, bottom', () => {
    for (const isColumn of [true, false]) {
      const values = getYOptions(isColumn).map((o) => o.value);
      expect(values).toContain('top');
      expect(values).toContain('center');
      expect(values).toContain('bottom');
    }
  });

  it('includes space-between and space-around for column layout (main-axis alignment)', () => {
    const values = getYOptions(true).map((o) => o.value);
    expect(values).toContain('space-between');
    expect(values).toContain('space-around');
    expect(values).not.toContain('stretch');
  });

  it('includes stretch for row layout (cross-axis alignment)', () => {
    const values = getYOptions(false).map((o) => o.value);
    expect(values).toContain('stretch');
    expect(values).not.toContain('space-between');
  });

  it('returns objects with value and label properties', () => {
    const options = getYOptions(true);
    for (const opt of options) {
      expect(opt).toHaveProperty('value');
      expect(opt).toHaveProperty('label');
    }
  });
});

describe('getAlignmentGridCells', () => {
  it('always returns exactly 9 cells', () => {
    expect(getAlignmentGridCells(true)).toHaveLength(9);
    expect(getAlignmentGridCells(false)).toHaveLength(9);
  });

  it('covers every combination of left/center/right and top/center/bottom', () => {
    for (const isColumn of [true, false]) {
      const cells = getAlignmentGridCells(isColumn);
      for (const x of ['left', 'center', 'right']) {
        for (const y of ['top', 'center', 'bottom']) {
          expect(cells).toContainEqual({ x, y });
        }
      }
    }
  });

  it('returns objects with x and y properties', () => {
    const cells = getAlignmentGridCells(false);
    for (const cell of cells) {
      expect(cell).toHaveProperty('x');
      expect(cell).toHaveProperty('y');
    }
  });
});
