import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    componentsApi: { listByProject: vi.fn() },
    dataSourcesApi: { getAll: vi.fn() }
  };
});

import { ApiError, componentsApi, dataSourcesApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const project = { id: 'p1', name: 'My Project', code: 'PROJ' };

const makeEvent = () =>
  ({
    fetch: mockFetch,
    parent: vi.fn().mockResolvedValue({ project })
  }) as any;

describe('components page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns components and data sources on success', async () => {
    const components = [{ id: 'c1', type: 'Card' }];
    const dataSources = [{ id: 'ds1', name: 'Sheet' }];
    vi.mocked(componentsApi.listByProject).mockResolvedValue(components as any);
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue(dataSources as any);

    const result = await load(makeEvent());

    expect(result).toEqual({ components, dataSources });
  });

  it('returns empty data sources when getAll fails', async () => {
    const components = [{ id: 'c1', type: 'Card' }];
    vi.mocked(componentsApi.listByProject).mockResolvedValue(components as any);
    vi.mocked(dataSourcesApi.getAll).mockRejectedValue(new Error('Network error'));

    const result = await load(makeEvent());

    expect(result).toEqual({ components, dataSources: [] });
  });

  it('returns empty arrays on a 404 ApiError from listByProject', async () => {
    vi.mocked(componentsApi.listByProject).mockRejectedValue(new ApiError(404, 'Not found'));
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([]);

    const result = await load(makeEvent());

    expect(result).toEqual({ components: [], dataSources: [] });
  });

  it('throws the error status for non-404 ApiErrors', async () => {
    vi.mocked(componentsApi.listByProject).mockRejectedValue(new ApiError(403, 'Forbidden'));
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([]);

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 403 });
  });

  it('re-throws SvelteKit errors with a status property', async () => {
    const sveltekitError = { status: 401, body: 'Unauthorized' };
    vi.mocked(componentsApi.listByProject).mockRejectedValue(sveltekitError);
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([]);

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 401 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(componentsApi.listByProject).mockRejectedValue(new Error('Unknown'));
    vi.mocked(dataSourcesApi.getAll).mockResolvedValue([]);

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 500 });
  });
});
