// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import SizeGroup from './SizeGroup.svelte';
import type { ShapeElement } from '../../types';

function shape(overrides: Partial<ShapeElement> = {}): ShapeElement {
  return { id: 's1', type: 'shape', shapeType: 'circle', children: [], ...overrides };
}

describe('SizeGroup', () => {
  it('shows the effective default as the width placeholder when unset', () => {
    const { container } = render(SizeGroup, {
      props: { elements: [shape()], dpi: 96, update: vi.fn(), seal: vi.fn() }
    });
    // Shape width effective default is 100 (effectiveDefaults) → shown as placeholder.
    const input = container.querySelector('#size-width') as HTMLInputElement;
    expect(input.placeholder).toBe('100');
    expect(input.value).toBe('');
  });

  it('hides the reset affordance when width is unset', () => {
    const { queryByLabelText } = render(SizeGroup, {
      props: { elements: [shape()], dpi: 96, update: vi.fn(), seal: vi.fn() }
    });
    expect(queryByLabelText(/Reset Width to default/)).toBeNull();
  });

  it('clears width to undefined via the reset affordance', () => {
    const update = vi.fn();
    const { getByLabelText } = render(SizeGroup, {
      props: { elements: [shape({ dimensions: { width: 50 } })], dpi: 96, update, seal: vi.fn() }
    });
    const reset = getByLabelText(/Reset Width to default/) as HTMLButtonElement;
    reset.click();
    // First argument clears width to undefined; clearing does not open an edit
    // session (no session key), so it is a discrete undo step.
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toEqual({ dimensions: { width: undefined } });
    expect(update.mock.calls[0][1]).toBeUndefined();
  });

  it('shows a Mixed indicator when two elements differ on width', () => {
    const { getAllByText, getByLabelText } = render(SizeGroup, {
      props: {
        elements: [shape({ dimensions: { width: 50 } }), shape({ id: 's2', dimensions: { width: 80 } })],
        dpi: 96,
        update: vi.fn(),
        seal: vi.fn()
      }
    });
    expect(getAllByText('Mixed').length).toBeGreaterThan(0);
    // Mixed still exposes the reset affordance (a value IS set, just not shared).
    expect(getByLabelText(/Reset Width to default/)).toBeTruthy();
  });
});
