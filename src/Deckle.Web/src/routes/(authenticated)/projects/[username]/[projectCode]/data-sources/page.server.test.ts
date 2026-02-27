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
const project = { id: 'p1', name: 'My Project', code: 'PROJ' };

const makeEvent = () =>
  ({
    params: {},
    fetch: mockFetch,
    parent: vi.fn().mockResolvedValue({ project })
  }) as any;

describe('data-sources page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns project and data sources on success', async () => {
    const dataSources = [{ id: 'ds1', name: 'My Sheet' }];
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue(dataSources as any);

    const result = await load(makeEvent());

    expect(result).toEqual({ project, dataSources });
  });

  it('throws the ApiError status for API failures', async () => {
    vi.mocked(dataSourcesApi.getAll).mockRejectedValue(new ApiError(403, 'Forbidden'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 403 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(dataSourcesApi.getAll).mockRejectedValue(new Error('Unknown'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 500 });
  });
});
