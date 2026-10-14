// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import SortableHeader from './SortableHeader.svelte';

const renderHeader = (props: { active: boolean; direction: 'asc' | 'desc' }) => {
  // A <th> needs a table row around it to be parsed into the DOM
  const target = document.createElement('tr');
  document.body.appendChild(target);
  return render(SortableHeader, {
    target,
    props: { label: 'Storage', onSort: vi.fn(), ...props }
  });
};

describe('SortableHeader', () => {
  it('renders the label as a button inside the header cell', () => {
    const { getByRole } = renderHeader({ active: false, direction: 'asc' });

    const button = getByRole('button', { name: 'Storage' });
    expect(button.closest('th')).toBeTruthy();
    expect(button.getAttribute('type')).toBe('button');
  });

  it('marks an inactive column aria-sort="none" with no arrow', () => {
    const { container, queryByTestId } = renderHeader({ active: false, direction: 'desc' });

    expect(container.querySelector('th')!.getAttribute('aria-sort')).toBe('none');
    expect(queryByTestId('sort-arrow')).toBeNull();
  });

  it('marks an ascending column and shows an up arrow after the label', () => {
    const { container, getByTestId } = renderHeader({ active: true, direction: 'asc' });

    expect(container.querySelector('th')!.getAttribute('aria-sort')).toBe('ascending');
    const arrow = getByTestId('sort-arrow');
    expect(arrow.classList.contains('desc')).toBe(false);
    // The arrow sits to the right of the label text
    const button = arrow.closest('button')!;
    expect(button.lastElementChild).toBe(arrow);
    expect(button.textContent!.trim()).toBe('Storage');
  });

  it('marks a descending column and shows a down arrow', () => {
    const { container, getByTestId } = renderHeader({ active: true, direction: 'desc' });

    expect(container.querySelector('th')!.getAttribute('aria-sort')).toBe('descending');
    expect(getByTestId('sort-arrow').classList.contains('desc')).toBe(true);
  });

  it('calls onSort when clicked', async () => {
    const onSort = vi.fn();
    const target = document.createElement('tr');
    document.body.appendChild(target);
    const { getByRole } = render(SortableHeader, {
      target,
      props: { label: 'Role', active: false, direction: 'asc', onSort }
    });

    await fireEvent.click(getByRole('button', { name: 'Role' }));

    expect(onSort).toHaveBeenCalledOnce();
  });
});
