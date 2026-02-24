import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    projectsApi: { getUsers: vi.fn() }
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

  it('returns project and users on success', async () => {
    const users = [{ userId: 'u1', email: 'alice@example.com', role: 'Owner' }];
    vi.mocked(projectsApi.getUsers).mockResolvedValue(users as any);

    const result = await load(makeEvent());

    expect(result).toEqual({ project, users });
  });

  it('throws the ApiError status on API failure', async () => {
    vi.mocked(projectsApi.getUsers).mockRejectedValue(new ApiError(403, 'Forbidden'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 403 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(projectsApi.getUsers).mockRejectedValue(new Error('Unknown'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 500 });
  });
});
