import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    filesApi: { getQuota: vi.fn() },
    directoriesApi: { getByPath: vi.fn(), list: vi.fn() }
  };
});

import { ApiError, directoriesApi, filesApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const project = { id: 'p1', name: 'My Project', code: 'PROJ' };

const makeEvent = (path = '') =>
  ({
    params: { path },
    fetch: mockFetch,
    parent: vi.fn().mockResolvedValue({ project })
  }) as any;

describe('image library page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('continues with null quota when getQuota fails', async () => {
    vi.mocked(directoriesApi.getByPath).mockResolvedValue({ files: [], directories: [] } as any);
    vi.mocked(directoriesApi.list).mockResolvedValue([] as any);
    vi.mocked(filesApi.getQuota).mockRejectedValue(new Error('Quota unavailable'));

    const result = await load(makeEvent());

    expect(result!.quota).toBeNull();
  });

  it('throws a 404 error when the directory is not found', async () => {
    vi.mocked(directoriesApi.getByPath).mockRejectedValue(new ApiError(404, 'Not found'));
    vi.mocked(directoriesApi.list).mockResolvedValue([] as any);
    vi.mocked(filesApi.getQuota).mockResolvedValue(null as any);

    await expect(load(makeEvent('missing/path'))).rejects.toMatchObject({ status: 404 });
  });

  it('throws the ApiError status for other API errors', async () => {
    vi.mocked(directoriesApi.getByPath).mockRejectedValue(new ApiError(403, 'Forbidden'));
    vi.mocked(directoriesApi.list).mockResolvedValue([] as any);
    vi.mocked(filesApi.getQuota).mockResolvedValue(null as any);

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 403 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(directoriesApi.getByPath).mockRejectedValue(new Error('Unknown'));
    vi.mocked(directoriesApi.list).mockResolvedValue([] as any);
    vi.mocked(filesApi.getQuota).mockResolvedValue(null as any);

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 500 });
  });
});

