// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import Pagination from './Pagination.svelte';

describe('Pagination', () => {
  it('renders nothing when there is only one page', () => {
    const { queryByRole } = render(Pagination, {
      props: { page: 1, totalPages: 1, onPageChange: vi.fn() }
    });

    expect(queryByRole('navigation')).toBeNull();
  });

  it('shows the current position', () => {
    const { getByText } = render(Pagination, {
      props: { page: 2, totalPages: 5, onPageChange: vi.fn() }
    });

    expect(getByText('Page 2 of 5')).toBeTruthy();
  });

  it('disables Previous on the first page and Next on the last', () => {
    const first = render(Pagination, { props: { page: 1, totalPages: 3, onPageChange: vi.fn() } });
    expect(first.getByText('Previous').hasAttribute('disabled')).toBe(true);
    expect(first.getByText('Next').hasAttribute('disabled')).toBe(false);
    first.unmount();

    const last = render(Pagination, { props: { page: 3, totalPages: 3, onPageChange: vi.fn() } });
    expect(last.getByText('Previous').hasAttribute('disabled')).toBe(false);
    expect(last.getByText('Next').hasAttribute('disabled')).toBe(true);
  });

  it('requests the adjacent page', async () => {
    const onPageChange = vi.fn();
    const { getByText } = render(Pagination, { props: { page: 2, totalPages: 3, onPageChange } });

    await fireEvent.click(getByText('Previous'));
    await fireEvent.click(getByText('Next'));

    expect(onPageChange.mock.calls).toEqual([[1], [3]]);
  });
});
