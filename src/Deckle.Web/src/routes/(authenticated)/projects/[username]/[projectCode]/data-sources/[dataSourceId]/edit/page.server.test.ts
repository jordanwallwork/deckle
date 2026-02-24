import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    dataSourcesApi: { getSpreadsheetDetail: vi.fn() }
  };
});

import { ApiError, dataSourcesApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const project = { id: 'p1', name: 'My Project', code: 'PROJ' };

const makeEvent = (dataSourceId = 'ds1') =>
  ({
    params: { dataSourceId },
    fetch: mockFetch,
    parent: vi.fn().mockResolvedValue({ project })
  }) as any;

describe('data source edit page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns project and data source detail on success', async () => {
    const dataSource = { id: 'ds1', name: 'My Sheet', spreadsheetId: 'abc123' };
    vi.mocked(dataSourcesApi.getSpreadsheetDetail).mockResolvedValue(dataSource as any);

    const result = await load(makeEvent());

    expect(result).toEqual({ project, dataSource });
  });

  it('throws the ApiError status on API failure', async () => {
    vi.mocked(dataSourcesApi.getSpreadsheetDetail).mockRejectedValue(
      new ApiError(404, 'Not found')
    );

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(dataSourcesApi.getSpreadsheetDetail).mockRejectedValue(new Error('Unknown'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 500 });
  });
});
