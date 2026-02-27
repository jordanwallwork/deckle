import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    dataSourcesApi: { getById: vi.fn() }
  };
});

import { ApiError, dataSourcesApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const adminUser = { id: 'u1', role: 'Administrator' };

const makeEvent = (user: object | undefined, id = 'ds1') =>
  ({
    params: { id },
    fetch: mockFetch,
    parent: vi.fn().mockResolvedValue({ user })
  }) as any;

describe('admin data-source detail page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the data source for administrator users', async () => {
    const dataSource = { id: 'ds1', name: 'My Sheet' };
    vi.mocked(dataSourcesApi.getById).mockResolvedValue(dataSource as any);

    const result = await load(makeEvent(adminUser));

    expect(result).toMatchObject({ dataSource, user: adminUser });
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

  it('throws the ApiError status when the data source is not found', async () => {
    vi.mocked(dataSourcesApi.getById).mockRejectedValue(new ApiError(404, 'Not found'));

    await expect(load(makeEvent(adminUser))).rejects.toMatchObject({ status: 404 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(dataSourcesApi.getById).mockRejectedValue(new Error('Unknown'));

    await expect(load(makeEvent(adminUser))).rejects.toMatchObject({ status: 500 });
  });
});
