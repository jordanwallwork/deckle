import { describe, it, expect } from 'vitest';
import {
  MIXED,
  readShared,
  fieldState,
  hasAnyDefined,
  groupHasSetValues,
  groupSummary,
  selectionGroupHasSetValues
} from './groupModel';
import type { TemplateElement, ContainerElement, TextElement } from './types';

function container(overrides: Partial<ContainerElement> = {}): ContainerElement {
  return { id: 'c1', type: 'container', children: [], ...overrides };
}
function text(overrides: Partial<TextElement> = {}): TextElement {
  return { id: 't1', type: 'text', content: 'hi', ...overrides };
}

describe('readShared', () => {
  it('returns undefined for an empty selection', () => {
    expect(readShared([], (el) => el.opacity)).toBeUndefined();
  });

  it('returns the value when a single element is selected', () => {
    expect(readShared([container({ opacity: 0.5 })], (el) => el.opacity)).toBe(0.5);
  });

  it('returns the shared value when all agree', () => {
    const els = [container({ opacity: 0.5 }), container({ id: 'c2', opacity: 0.5 })];
    expect(readShared(els, (el) => el.opacity)).toBe(0.5);
  });

  it('returns MIXED when values differ', () => {
    const els = [container({ opacity: 0.5 }), container({ id: 'c2', opacity: 1 })];
    expect(readShared(els, (el) => el.opacity)).toBe(MIXED);
  });

  it('compares nested objects structurally', () => {
    const els = [
      container({ background: { color: '#fff' } }),
      container({ id: 'c2', background: { color: '#fff' } })
    ];
    expect(readShared(els, (el) => (el as ContainerElement).background)).toEqual({ color: '#fff' });
    const differ = [
      container({ background: { color: '#fff' } }),
      container({ id: 'c2', background: { color: '#000' } })
    ];
    expect(readShared(differ, (el) => (el as ContainerElement).background)).toBe(MIXED);
  });

  it('treats undefined vs set as MIXED', () => {
    const els = [container({}), container({ id: 'c2', opacity: 1 })];
    expect(readShared(els, (el) => el.opacity)).toBe(MIXED);
  });
});

describe('fieldState', () => {
  it('unset → value undefined, not set, not mixed', () => {
    expect(fieldState([container()], (el) => el.opacity)).toEqual({
      value: undefined,
      mixed: false,
      set: false
    });
  });
  it('set on single element → value + set', () => {
    expect(fieldState([container({ opacity: 0.5 })], (el) => el.opacity)).toEqual({
      value: 0.5,
      mixed: false,
      set: true
    });
  });
  it('differing values → mixed + set, value undefined', () => {
    const els = [container({ opacity: 0.5 }), container({ id: 'c2', opacity: 1 })];
    expect(fieldState(els, (el) => el.opacity)).toEqual({ value: undefined, mixed: true, set: true });
  });
  it('one set one unset → mixed + set', () => {
    const els = [container(), container({ id: 'c2', opacity: 1 })];
    expect(fieldState(els, (el) => el.opacity)).toEqual({ value: undefined, mixed: true, set: true });
  });
});

describe('hasAnyDefined', () => {
  it('false for undefined / empty / all-undefined', () => {
    expect(hasAnyDefined(undefined)).toBe(false);
    expect(hasAnyDefined({})).toBe(false);
    expect(hasAnyDefined({ a: undefined, b: undefined })).toBe(false);
  });
  it('true when at least one value is defined', () => {
    expect(hasAnyDefined({ a: undefined, b: 3 })).toBe(true);
  });
});

describe('groupHasSetValues', () => {
  it('is false for a nearly-empty element across every group', () => {
    const el = container();
    for (const g of ['position', 'size', 'layout', 'background', 'border', 'effects'] as const) {
      expect(groupHasSetValues(el, g)).toBe(false);
    }
  });

  it('detects effects (opacity / shadow)', () => {
    expect(groupHasSetValues(container({ opacity: 0.4 }), 'effects')).toBe(true);
    expect(
      groupHasSetValues(container({ shadow: { offsetX: 1, offsetY: 1, blur: 2, color: '#000' } }), 'effects')
    ).toBe(true);
    expect(groupHasSetValues(container({ shadow: [] }), 'effects')).toBe(false);
  });

  it('detects position (x/y/z/rotation) but not position mode alone', () => {
    expect(groupHasSetValues(container({ x: 10 }), 'position')).toBe(true);
    expect(groupHasSetValues(container({ zIndex: 3 }), 'position')).toBe(true);
    expect(groupHasSetValues(container({ rotation: 45 }), 'position')).toBe(true);
    expect(groupHasSetValues(container({ position: 'absolute' }), 'position')).toBe(false);
  });

  it('detects size via dimensions', () => {
    expect(groupHasSetValues(container({ dimensions: { width: 100 } }), 'size')).toBe(true);
    expect(groupHasSetValues(container({ dimensions: { minWidth: 20 } }), 'size')).toBe(true);
    expect(groupHasSetValues(container({ dimensions: {} }), 'size')).toBe(false);
  });

  it('detects layout via padding/margin/overflow/display/flex', () => {
    expect(groupHasSetValues(container({ padding: { all: 4 } }), 'layout')).toBe(true);
    expect(groupHasSetValues(container({ margin: { top: 2 } }), 'layout')).toBe(true);
    expect(groupHasSetValues(container({ overflow: 'hidden' }), 'layout')).toBe(true);
    expect(groupHasSetValues(container({ display: 'block' }), 'layout')).toBe(true);
    expect(groupHasSetValues(container({ flexConfig: { gap: 5 } }), 'layout')).toBe(true);
    expect(groupHasSetValues(container({ padding: {} }), 'layout')).toBe(false);
  });

  it('detects background (color or image)', () => {
    expect(groupHasSetValues(container({ background: { color: '#fff' } }), 'background')).toBe(true);
    expect(
      groupHasSetValues(container({ background: { image: { imageId: 'x' } } }), 'background')
    ).toBe(true);
    expect(groupHasSetValues(container({ background: {} }), 'background')).toBe(false);
  });

  it('detects border (uniform, per-side, radius, inner radius)', () => {
    expect(groupHasSetValues(container({ border: { width: 2 } }), 'border')).toBe(true);
    expect(groupHasSetValues(container({ border: { top: { width: 1 } } }), 'border')).toBe(true);
    expect(groupHasSetValues(container({ border: { radius: 4 } }), 'border')).toBe(true);
    expect(groupHasSetValues(container({ innerBorderRadius: 3 }), 'border')).toBe(true);
    expect(groupHasSetValues(container({ border: {} }), 'border')).toBe(false);
  });

  it('detects typography on text', () => {
    expect(groupHasSetValues(text({ fontSize: 20 }), 'typography')).toBe(true);
    expect(groupHasSetValues(text({ color: '#f00' }), 'typography')).toBe(true);
    expect(groupHasSetValues(text(), 'typography')).toBe(false);
  });

  it('detects identity (label/lock/visibility) but ignores visibilityMode=show', () => {
    expect(groupHasSetValues(container({ label: 'X' }), 'identity')).toBe(true);
    expect(groupHasSetValues(container({ locked: true }), 'identity')).toBe(true);
    expect(groupHasSetValues(container({ visibilityMode: 'hide' }), 'identity')).toBe(true);
    expect(groupHasSetValues(container({ visibilityMode: 'show' }), 'identity')).toBe(false);
  });
});

describe('groupSummary', () => {
  it('returns undefined when nothing set', () => {
    expect(groupSummary(container(), 'border')).toBeUndefined();
  });
  it('summarises a uniform border', () => {
    expect(groupSummary(container({ border: { width: 2, style: 'solid' } }), 'border')).toBe(
      '2px solid'
    );
  });
  it('summarises size', () => {
    expect(groupSummary(container({ dimensions: { width: 100, height: 50 } }), 'size')).toBe(
      '100px × 50px'
    );
  });
  it('summarises opacity as a percentage', () => {
    expect(groupSummary(container({ opacity: 0.5 }), 'effects')).toBe('50%');
  });
  it('summarises background colour', () => {
    expect(groupSummary(container({ background: { color: '#abcdef' } }), 'background')).toBe(
      '#abcdef'
    );
  });
});

describe('selectionGroupHasSetValues', () => {
  it('is true when any element in the selection has the group set', () => {
    const els: TemplateElement[] = [container(), container({ id: 'c2', opacity: 0.5 })];
    expect(selectionGroupHasSetValues(els, 'effects')).toBe(true);
  });
  it('is false when no element has the group set', () => {
    const els: TemplateElement[] = [container(), container({ id: 'c2' })];
    expect(selectionGroupHasSetValues(els, 'effects')).toBe(false);
  });
});
