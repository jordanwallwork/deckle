import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    adminApi: { getSamples: vi.fn() },
    dataSourcesApi: { getAll: vi.fn() }
  };
});

import { adminApi, ApiError, dataSourcesApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const adminUser = { id: 'u1', role: 'Administrator' };

const makeEvent = (
  user: object | undefined,
  searchParams: Record<string, string> = {}
) => {
  const url = new URL('http://localhost/admin/samples');
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  return {
    fetch: mockFetch,
    url,
    parent: vi.fn().mockResolvedValue({ user })
  } as any;
};

describe('admin samples page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns samples and data sources for administrator users', async () => {
    const samplesResponse = { components: [], totalCount: 0, page: 1, pageSize: 20 };
    const sampleDataSources = [{ id: 'ds1', name: 'Sheet' }];
    vi.mocked(adminApi.getSamples).mockResolvedValue(samplesResponse as any);
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue(sampleDataSources as any);

    const result = await load(makeEvent(adminUser));

    expect(result).toMatchObject({ samplesResponse, sampleDataSources });
  });

  it('includes pagination defaults', async () => {
    vi.mocked(adminApi.getSamples).mockResolvedValue({ components: [] } as any);
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([]);

    const result = await load(makeEvent(adminUser));

    expect(result!.currentPage).toBe(1);
    expect(result!.currentPageSize).toBe(20);
    expect(result!.currentSearch).toBe('');
    expect(result!.currentType).toBe('');
  });

  it('parses page, pageSize, search, and type from query params', async () => {
    vi.mocked(adminApi.getSamples).mockResolvedValue({ components: [] } as any);
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([]);

    const result = await load(
      makeEvent(adminUser, { page: '2', pageSize: '50', search: 'test', type: 'Card' })
    );

    expect(result!.currentPage).toBe(2);
    expect(result!.currentPageSize).toBe(50);
    expect(result!.currentSearch).toBe('test');
    expect(result!.currentType).toBe('Card');
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
    vi.mocked(adminApi.getSamples).mockRejectedValue(new ApiError(500, 'Server error'));
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([]);

    await expect(load(makeEvent(adminUser))).rejects.toMatchObject({ status: 500 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(adminApi.getSamples).mockRejectedValue(new Error('Unknown'));
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([]);

    await expect(load(makeEvent(adminUser))).rejects.toMatchObject({ status: 500 });
  });
});
