import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    dataSourcesApi: { getAll: vi.fn() }
  };
});

import { ApiError, dataSourcesApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const adminUser = { id: 'u1', role: 'Administrator' };

const makeEvent = (
  user: object | undefined,
  searchParams: Record<string, string> = {}
) => {
  const url = new URL('http://localhost/admin/data-sources');
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  return {
    fetch: mockFetch,
    url,
    parent: vi.fn().mockResolvedValue({ user })
  } as any;
};

describe('admin data-sources page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns data sources for administrator users', async () => {
    const dataSourcesResponse = [{ id: 'ds1', name: 'Sheet' }];
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue(dataSourcesResponse as any);

    const result = await load(makeEvent(adminUser));

    expect(result).toMatchObject({ dataSourcesResponse, user: adminUser });
  });

  it('includes pagination defaults', async () => {
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([] as any);

    const result = await load(makeEvent(adminUser));

    expect(result.currentPage).toBe(1);
    expect(result.currentPageSize).toBe(20);
    expect(result.currentSearch).toBe('');
  });

  it('parses page and pageSize from query params', async () => {
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([] as any);

    const result = await load(makeEvent(adminUser, { page: '3', pageSize: '50', search: 'foo' }));

    expect(result.currentPage).toBe(3);
    expect(result.currentPageSize).toBe(50);
    expect(result.currentSearch).toBe('foo');
  });

  it('redirects to / when no user is present', async () => {
    await expect(load(makeEvent(undefined))).rejects.toMatchObject({
      status: 302,
      location: '/'
    });
  });

  it('throws 403 for non-administrator users', async () => {
    await expect(load(makeEvent({ id: 'u1', role: 'User' }))).rejects.toMatchObject({
      status: 403
    });
  });

  it('throws the ApiError status on API failure', async () => {
    vi.mocked(dataSourcesApi.getAll).mockRejectedValue(new ApiError(500, 'Server error'));

    await expect(load(makeEvent(adminUser))).rejects.toMatchObject({ status: 500 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(dataSourcesApi.getAll).mockRejectedValue(new Error('Unknown'));

    await expect(load(makeEvent(adminUser))).rejects.toMatchObject({ status: 500 });
  });
});
