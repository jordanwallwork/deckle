// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import PropertyField from './PropertyField.svelte';
import { createRawSnippet } from 'svelte';

/** A trivial snippet rendering a marker so we can assert children render. */
const child = createRawSnippet(() => ({ render: () => `<span data-testid="child">x</span>` }));

describe('PropertyField', () => {
  it('renders its label and children', () => {
    const { getByText, getByTestId } = render(PropertyField, {
      props: { label: 'Opacity', children: child }
    });
    expect(getByText('Opacity')).toBeTruthy();
    expect(getByTestId('child')).toBeTruthy();
  });

  it('hides the reset affordance when unset', () => {
    const { queryByLabelText } = render(PropertyField, {
      props: { label: 'Opacity', set: false, children: child }
    });
    expect(queryByLabelText(/Reset Opacity/)).toBeNull();
  });

  it('shows the reset affordance and clears when set', async () => {
    const onclear = vi.fn();
    const { getByLabelText } = render(PropertyField, {
      props: { label: 'Opacity', set: true, onclear, children: child }
    });
    const btn = getByLabelText(/Reset Opacity/) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(onclear).toHaveBeenCalledOnce();
  });

  it('shows a Mixed marker when mixed', () => {
    const { getByText } = render(PropertyField, {
      props: { label: 'Opacity', mixed: true, children: child }
    });
    expect(getByText('Mixed')).toBeTruthy();
  });
});
