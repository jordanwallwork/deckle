// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { render, fireEvent } from '@testing-library/svelte';
import Dialog from './Dialog.svelte';

const children = createRawSnippet(() => ({ render: () => '<p>Body</p>' }));

describe('Dialog', () => {
  it('closes when the X is clicked, even without an onclose handler', async () => {
    const { getByLabelText, queryByRole } = render(Dialog, {
      props: { show: true, title: 'Test', children }
    });

    await fireEvent.click(getByLabelText('Close dialog'));

    expect(queryByRole('dialog')).toBeNull();
  });

  it('closes on Escape and calls onclose', async () => {
    const onclose = vi.fn();
    const { getByRole, queryByRole } = render(Dialog, {
      props: { show: true, title: 'Test', onclose, children }
    });

    await fireEvent.keyDown(getByRole('dialog'), { key: 'Escape' });

    expect(onclose).toHaveBeenCalledOnce();
    expect(queryByRole('dialog')).toBeNull();
  });
});
