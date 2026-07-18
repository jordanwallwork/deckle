import { describe, it, expect } from 'vitest';
import {
  EFFECTIVE_DEFAULTS,
  effectiveOpacity,
  effectiveVisibilityMode,
  effectiveContainerDisplay,
  effectiveContainerFlex,
  effectiveTextFontSize,
  effectiveTextColor,
  effectiveGridCellBackground,
  effectiveGridCellBorder,
  getEffectiveDefault
} from './effectiveDefaults';

describe('EFFECTIVE_DEFAULTS constant', () => {
  it('documents the canonical effective values', () => {
    expect(EFFECTIVE_DEFAULTS.base.opacity).toBe(1);
    expect(EFFECTIVE_DEFAULTS.base.visibilityMode).toBe('show');
    expect(EFFECTIVE_DEFAULTS.container.display).toBe('flex');
    expect(EFFECTIVE_DEFAULTS.container.flex).toEqual({
      direction: 'column',
      wrap: 'nowrap',
      justifyContent: 'flex-start',
      alignItems: 'flex-start'
    });
    expect(EFFECTIVE_DEFAULTS.text.fontSize).toBe(16);
    expect(EFFECTIVE_DEFAULTS.text.color).toBe('#000000');
    expect(EFFECTIVE_DEFAULTS.dimensions).toEqual({ width: 100, height: 100 });
    expect(EFFECTIVE_DEFAULTS.grid.cellBackground).toEqual({ color: '#cccccc' });
    expect(EFFECTIVE_DEFAULTS.grid.cellBorder).toEqual({
      width: 2,
      style: 'solid',
      color: '#000000'
    });
  });
});

describe('effectiveOpacity', () => {
  it('returns 1 when unset', () => {
    expect(effectiveOpacity({})).toBe(1);
  });
  it('returns the explicit value when set (including 0)', () => {
    expect(effectiveOpacity({ opacity: 0.5 })).toBe(0.5);
    expect(effectiveOpacity({ opacity: 0 })).toBe(0);
  });
});

describe('effectiveVisibilityMode', () => {
  it('returns "show" when unset', () => {
    expect(effectiveVisibilityMode({})).toBe('show');
  });
  it('returns the explicit value when set', () => {
    expect(effectiveVisibilityMode({ visibilityMode: 'hide' })).toBe('hide');
    expect(effectiveVisibilityMode({ visibilityMode: 'conditional' })).toBe('conditional');
  });
});

describe('effectiveContainerDisplay', () => {
  it('returns "flex" when unset', () => {
    expect(effectiveContainerDisplay({})).toBe('flex');
  });
  it('returns the explicit value when set', () => {
    expect(effectiveContainerDisplay({ display: 'block' })).toBe('block');
  });
});

describe('effectiveContainerFlex', () => {
  it('returns all effective defaults when flexConfig is unset', () => {
    expect(effectiveContainerFlex({})).toEqual({
      direction: 'column',
      wrap: 'nowrap',
      justifyContent: 'flex-start',
      alignItems: 'flex-start'
    });
  });

  it('preserves explicitly-set values and defaults the rest', () => {
    expect(
      effectiveContainerFlex({ flexConfig: { direction: 'row', justifyContent: 'center' } })
    ).toEqual({
      direction: 'row',
      wrap: 'nowrap',
      justifyContent: 'center',
      alignItems: 'flex-start'
    });
  });
});

describe('effectiveTextFontSize', () => {
  it('returns 16 when unset', () => {
    expect(effectiveTextFontSize({})).toBe(16);
  });
  it('returns the explicit value when set', () => {
    expect(effectiveTextFontSize({ fontSize: 24 })).toBe(24);
  });
});

describe('effectiveTextColor', () => {
  it('returns "#000000" when unset', () => {
    expect(effectiveTextColor({})).toBe('#000000');
  });
  it('returns the explicit value when set', () => {
    expect(effectiveTextColor({ color: '#ff0000' })).toBe('#ff0000');
  });
});

describe('effectiveGridCellBackground', () => {
  it('returns the default grey fill when unset', () => {
    expect(effectiveGridCellBackground({})).toEqual({ color: '#cccccc' });
  });
  it('returns the explicit value when set', () => {
    expect(effectiveGridCellBackground({ cellBackground: { color: '#123456' } })).toEqual({
      color: '#123456'
    });
  });
});

describe('effectiveGridCellBorder', () => {
  it('returns the default 2px solid black border when unset', () => {
    expect(effectiveGridCellBorder({})).toEqual({ width: 2, style: 'solid', color: '#000000' });
  });
  it('returns the explicit value when set', () => {
    const border = { width: 4, style: 'dashed' as const, color: '#00ff00' };
    expect(effectiveGridCellBorder({ cellBorder: border })).toEqual(border);
  });
});

describe('getEffectiveDefault', () => {
  it.each([
    ['container', 'opacity', 1],
    ['container', 'visibilityMode', 'show'],
    ['container', 'display', 'flex'],
    ['container', 'direction', 'column'],
    ['container', 'wrap', 'nowrap'],
    ['container', 'justifyContent', 'flex-start'],
    ['container', 'alignItems', 'flex-start'],
    ['text', 'fontSize', 16],
    ['text', 'color', '#000000'],
    ['shape', 'width', 100],
    ['shape', 'height', 100],
    ['grid', 'width', 100],
    ['image', 'height', 100]
  ] as const)('%s.%s → %o', (type, key, expected) => {
    expect(getEffectiveDefault(type, key)).toEqual(expected);
  });

  it('returns the grid cell defaults', () => {
    expect(getEffectiveDefault('grid', 'cellBackground')).toEqual({ color: '#cccccc' });
    expect(getEffectiveDefault('grid', 'cellBorder')).toEqual({
      width: 2,
      style: 'solid',
      color: '#000000'
    });
  });

  it('returns undefined for a property with no effective default', () => {
    expect(getEffectiveDefault('text', 'width')).toBeUndefined();
    expect(getEffectiveDefault('iterator', 'fontSize')).toBeUndefined();
  });
});
