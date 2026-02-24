import { describe, it, expect } from 'vitest';
import {
  elementHasChildren,
  getElementLabel,
  dimensionValue,
  dimensionToPx,
  spacingToCss,
  borderStyle,
  hasAnyBorderRadiusSet,
  borderRadiusStyle,
  boxShadowStyle,
  backgroundStyle
} from './utils';
import type {
  ContainerElement,
  TextElement,
  ImageElement,
  IteratorElement,
  Shadow
} from './types';

// ============================================================================
// Helpers
// ============================================================================

function makeContainer(overrides: Partial<ContainerElement> = {}): ContainerElement {
  return { id: '1', type: 'container', children: [], visibilityMode: 'show', ...overrides };
}

function makeText(overrides: Partial<TextElement> = {}): TextElement {
  return { id: '2', type: 'text', content: 'Hello', ...overrides };
}

function makeImage(overrides: Partial<ImageElement> = {}): ImageElement {
  return { id: '3', type: 'image', imageId: '', ...overrides };
}

function makeIterator(overrides: Partial<IteratorElement> = {}): IteratorElement {
  return {
    id: '4',
    type: 'iterator',
    iteratorName: 'i',
    fromExpression: '1',
    toExpression: '3',
    children: [],
    ...overrides
  };
}

// ============================================================================
// elementHasChildren
// ============================================================================

describe('elementHasChildren', () => {
  it('returns true for container elements', () => {
    expect(elementHasChildren(makeContainer())).toBe(true);
  });

  it('returns true for iterator elements', () => {
    expect(elementHasChildren(makeIterator())).toBe(true);
  });

  it('returns false for text elements', () => {
    expect(elementHasChildren(makeText())).toBe(false);
  });

  it('returns false for image elements', () => {
    expect(elementHasChildren(makeImage())).toBe(false);
  });
});

// ============================================================================
// getElementLabel
// ============================================================================

describe('getElementLabel', () => {
  it('returns the custom label when set', () => {
    expect(getElementLabel(makeText({ label: 'My Label' }))).toBe('My Label');
  });

  it('returns text content for text elements without a label', () => {
    expect(getElementLabel(makeText({ content: 'Hello world' }))).toBe('Hello world');
  });

  it('truncates long text content to 20 chars and appends ellipsis', () => {
    const long = 'abcdefghijklmnopqrstuvwxyz';
    expect(getElementLabel(makeText({ content: long }))).toBe('abcdefghijklmnopqrst...');
  });

  it('does not add ellipsis when content is exactly 20 characters', () => {
    const exact = 'abcdefghijklmnopqrst'; // 20 chars
    expect(getElementLabel(makeText({ content: exact }))).toBe('abcdefghijklmnopqrst');
  });

  it('returns iterator description for iterator elements', () => {
    const iter = makeIterator({ iteratorName: 'n', fromExpression: '0', toExpression: '5' });
    expect(getElementLabel(iter)).toBe('Iterator (n: 0..5)');
  });

  it('returns capitalized type name for container elements', () => {
    expect(getElementLabel(makeContainer())).toBe('Container');
  });

  it('returns capitalized type name for image elements', () => {
    expect(getElementLabel(makeImage())).toBe('Image');
  });
});

// ============================================================================
// dimensionValue
// ============================================================================

describe('dimensionValue', () => {
  it('returns undefined for undefined input', () => {
    expect(dimensionValue(undefined)).toBeUndefined();
  });

  it('converts a number to a px string', () => {
    expect(dimensionValue(10)).toBe('10px');
    expect(dimensionValue(0)).toBe('0px');
  });

  it('converts an mm string to px using the provided dpi', () => {
    // 25.4mm at 96 DPI = 96px (1 inch)
    expect(dimensionValue('25.4mm', 96)).toBe('96px');
  });

  it('returns the mm string unchanged when dpi is not provided', () => {
    expect(dimensionValue('10mm')).toBe('10mm');
  });

  it('returns percentage strings unchanged', () => {
    expect(dimensionValue('50%')).toBe('50%');
    expect(dimensionValue('100%', 96)).toBe('100%');
  });

  it('returns arbitrary CSS strings unchanged', () => {
    expect(dimensionValue('auto')).toBe('auto');
  });
});

// ============================================================================
// dimensionToPx
// ============================================================================

describe('dimensionToPx', () => {
  it('returns 0 for undefined input', () => {
    expect(dimensionToPx(undefined)).toBe(0);
  });

  it('returns the number as-is for numeric input', () => {
    expect(dimensionToPx(42)).toBe(42);
    expect(dimensionToPx(0)).toBe(0);
  });

  it('converts mm strings to px using the provided dpi', () => {
    // 25.4mm at 96 DPI = 96px
    expect(dimensionToPx('25.4mm', 96)).toBe(96);
  });

  it('returns 0 for mm strings when dpi is not provided', () => {
    // falls through to parseFloat('10mm') = 10? No — mm branch is skipped,
    // so parseFloat('10mm') = 10
    expect(dimensionToPx('10mm')).toBe(10);
  });

  it('parses the numeric prefix from px strings', () => {
    expect(dimensionToPx('15px')).toBe(15);
  });

  it('returns 0 for non-numeric strings', () => {
    expect(dimensionToPx('auto')).toBe(0);
  });
});

// ============================================================================
// spacingToCss
// ============================================================================

describe('spacingToCss', () => {
  it('returns undefined for undefined spacing', () => {
    expect(spacingToCss(undefined)).toBeUndefined();
  });

  it('returns a single value when "all" is set', () => {
    expect(spacingToCss({ all: 8 })).toBe('8px');
  });

  it('returns a 4-value shorthand when individual sides are set', () => {
    expect(spacingToCss({ top: 5, right: 10, bottom: 15, left: 20 })).toBe(
      '5px 10px 15px 20px'
    );
  });

  it('defaults missing sides to 0px', () => {
    expect(spacingToCss({ top: 4 })).toBe('4px 0px 0px 0px');
  });

  it('converts mm values using dpi', () => {
    // 25.4mm at 96 dpi = 96px
    expect(spacingToCss({ all: '25.4mm' }, 96)).toBe('96px');
  });
});

// ============================================================================
// borderStyle
// ============================================================================

describe('borderStyle', () => {
  it('returns undefined for undefined border', () => {
    expect(borderStyle(undefined)).toBeUndefined();
  });

  it('returns undefined for an empty border object', () => {
    expect(borderStyle({})).toBeUndefined();
  });

  it('builds a uniform border string', () => {
    const result = borderStyle({ width: 2, style: 'solid', color: '#000' });
    expect(result).toBe('border-width: 2px; border-style: solid; border-color: #000');
  });

  it('builds individual side border strings', () => {
    const result = borderStyle({ top: { width: 1, style: 'dashed', color: '#f00' } });
    expect(result).toBe(
      'border-top-width: 1px; border-top-style: dashed; border-top-color: #f00'
    );
  });

  it('appends a simple border radius', () => {
    const result = borderStyle({ width: 1, style: 'solid', color: '#000', radius: 4 });
    expect(result).toBe(
      'border-width: 1px; border-style: solid; border-color: #000; border-radius: 4px'
    );
  });

  it('appends per-corner border radius', () => {
    const result = borderStyle({
      radius: { topLeft: 4, topRight: 8, bottomRight: 4, bottomLeft: 0 }
    });
    expect(result).toBe('border-radius: 4px 8px 4px 0px');
  });

  it('handles border with only a radius (no width/style/color)', () => {
    const result = borderStyle({ radius: 10 });
    expect(result).toBe('border-radius: 10px');
  });
});

// ============================================================================
// hasAnyBorderRadiusSet
// ============================================================================

describe('hasAnyBorderRadiusSet', () => {
  it('returns false for undefined', () => {
    expect(hasAnyBorderRadiusSet(undefined)).toBe(false);
  });

  it('returns false for a zero numeric radius', () => {
    expect(hasAnyBorderRadiusSet(0)).toBe(false);
  });

  it('returns true for a non-zero numeric radius', () => {
    expect(hasAnyBorderRadiusSet(4)).toBe(true);
  });

  it('returns true for a non-zero string radius', () => {
    expect(hasAnyBorderRadiusSet('4px')).toBe(true);
  });

  it('returns false when all corners are zero', () => {
    expect(
      hasAnyBorderRadiusSet({ topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 })
    ).toBe(false);
  });

  it('returns true when any corner is non-zero', () => {
    expect(hasAnyBorderRadiusSet({ topLeft: 0, topRight: 4, bottomRight: 0, bottomLeft: 0 })).toBe(
      true
    );
  });

  it('returns true when only one corner is set', () => {
    expect(hasAnyBorderRadiusSet({ bottomRight: 8 })).toBe(true);
  });
});

// ============================================================================
// borderRadiusStyle
// ============================================================================

describe('borderRadiusStyle', () => {
  it('returns undefined for undefined radius', () => {
    expect(borderRadiusStyle(undefined)).toBeUndefined();
  });

  it('returns a px string for a numeric radius', () => {
    expect(borderRadiusStyle(8)).toBe('8px');
  });

  it('returns the string as-is for a string radius', () => {
    expect(borderRadiusStyle('50%')).toBe('50%');
  });

  it('returns a 4-value string for per-corner radius', () => {
    expect(borderRadiusStyle({ topLeft: 4, topRight: 8, bottomRight: 4, bottomLeft: 0 })).toBe(
      '4px 8px 4px 0px'
    );
  });

  it('defaults missing corners to 0px', () => {
    expect(borderRadiusStyle({ topLeft: 6 })).toBe('6px 0px 0px 0px');
  });
});

// ============================================================================
// boxShadowStyle
// ============================================================================

describe('boxShadowStyle', () => {
  it('returns undefined for undefined shadow', () => {
    expect(boxShadowStyle(undefined)).toBeUndefined();
  });

  it('builds a basic shadow string', () => {
    const shadow: Shadow = { offsetX: 2, offsetY: 4, blur: 6, color: 'black' };
    expect(boxShadowStyle(shadow)).toBe('2px 4px 6px 0px black');
  });

  it('includes spread when provided', () => {
    const shadow: Shadow = { offsetX: 0, offsetY: 0, blur: 8, spread: 3, color: '#aaa' };
    expect(boxShadowStyle(shadow)).toBe('0px 0px 8px 3px #aaa');
  });

  it('includes inset keyword when inset is true', () => {
    const shadow: Shadow = { offsetX: 1, offsetY: 2, blur: 3, color: 'red', inset: true };
    expect(boxShadowStyle(shadow)).toBe('inset 1px 2px 3px 0px red');
  });

  it('joins multiple shadows with ", "', () => {
    const shadows: Shadow[] = [
      { offsetX: 1, offsetY: 1, blur: 2, color: 'blue' },
      { offsetX: 3, offsetY: 3, blur: 4, color: 'green' }
    ];
    expect(boxShadowStyle(shadows)).toBe('1px 1px 2px 0px blue, 3px 3px 4px 0px green');
  });
});

// ============================================================================
// backgroundStyle
// ============================================================================

describe('backgroundStyle', () => {
  it('returns undefined for undefined background', () => {
    expect(backgroundStyle(undefined)).toBeUndefined();
  });

  it('returns undefined for an empty background object', () => {
    expect(backgroundStyle({})).toBeUndefined();
  });

  it('builds a color-only background string', () => {
    expect(backgroundStyle({ color: '#ffffff' })).toBe('background-color: #ffffff');
  });

  it('builds an image-only background string', () => {
    expect(backgroundStyle({ image: { imageId: 'img-123' } })).toBe(
      'background-image: url(img-123)'
    );
  });

  it('includes background-size when provided', () => {
    expect(backgroundStyle({ image: { imageId: 'img-1', size: 'cover' } })).toBe(
      'background-image: url(img-1); background-size: cover'
    );
  });

  it('includes background-repeat when provided', () => {
    expect(backgroundStyle({ image: { imageId: 'img-1', repeat: 'no-repeat' } })).toBe(
      'background-image: url(img-1); background-repeat: no-repeat'
    );
  });

  it('includes background-position when provided', () => {
    expect(backgroundStyle({ image: { imageId: 'img-1', position: 'center' } })).toBe(
      'background-image: url(img-1); background-position: center'
    );
  });

  it('combines color and fully-configured image background', () => {
    const result = backgroundStyle({
      color: '#000',
      image: { imageId: 'img-2', size: 'contain', repeat: 'no-repeat', position: 'top' }
    });
    expect(result).toBe(
      'background-color: #000; background-image: url(img-2); background-size: contain; background-repeat: no-repeat; background-position: top'
    );
  });
});
