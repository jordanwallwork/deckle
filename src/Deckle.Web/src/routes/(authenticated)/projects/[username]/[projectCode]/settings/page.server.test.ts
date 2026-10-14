import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    projectsApi: { getUsers: vi.fn(), getStorage: vi.fn() }
  };
});

import { ApiError, projectsApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const project = { id: 'p1', name: 'My Project', code: 'PROJ' };

const makeEvent = () =>
  ({
    fetch: mockFetch,
    parent: vi.fn().mockResolvedValue({ project })
  }) as any;

describe('project settings page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns project, users and storage on success', async () => {
    const users = [{ userId: 'u1', email: 'alice@example.com', role: 'Owner' }];
    const storage = { totalBytes: 1024 };
    vi.mocked(projectsApi.getUsers).mockResolvedValue(users as any);
    vi.mocked(projectsApi.getStorage).mockResolvedValue(storage as any);

    const result = await load(makeEvent());

    expect(result).toEqual({ project, users, storage });
    expect(projectsApi.getStorage).toHaveBeenCalledWith('p1', mockFetch);
  });

  it('throws the ApiError status on API failure', async () => {
    vi.mocked(projectsApi.getUsers).mockRejectedValue(new ApiError(403, 'Forbidden'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 403 });
  });

  it('throws the ApiError status when loading storage fails', async () => {
    vi.mocked(projectsApi.getUsers).mockResolvedValue([] as any);
    vi.mocked(projectsApi.getStorage).mockRejectedValue(new ApiError(404, 'Not found'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(projectsApi.getUsers).mockRejectedValue(new Error('Unknown'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 500 });
  });
});
