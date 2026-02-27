import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    projectsApi: { getByUsernameAndCode: vi.fn() }
  };
});

import { ApiError, projectsApi } from '$lib/api';
import { load } from './+layout.server';

const mockFetch = vi.fn();
const makeEvent = (username = 'alice', projectCode = 'PROJ') =>
  ({
    params: { username, projectCode },
    fetch: mockFetch
  }) as any;

describe('project layout load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the project on success', async () => {
    const project = { id: 'p1', name: 'My Project', code: 'PROJ' };
    vi.mocked(projectsApi.getByUsernameAndCode).mockResolvedValue(project as any);

    const result = await load(makeEvent());

    expect(result).toEqual({ project });
  });

  it('throws a 404 error when project is not found', async () => {
    vi.mocked(projectsApi.getByUsernameAndCode).mockRejectedValue(
      new ApiError(404, 'Not found')
    );

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
  });

  it('throws the original status error for other ApiErrors', async () => {
    vi.mocked(projectsApi.getByUsernameAndCode).mockRejectedValue(
      new ApiError(403, 'Forbidden')
    );

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 403 });
  });

  it('re-throws objects with a status property (SvelteKit errors)', async () => {
    const sveltekitError = { status: 401, body: 'Unauthorized' };
    vi.mocked(projectsApi.getByUsernameAndCode).mockRejectedValue(sveltekitError);

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 401 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(projectsApi.getByUsernameAndCode).mockRejectedValue(new Error('Unknown'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 500 });
  });
});
