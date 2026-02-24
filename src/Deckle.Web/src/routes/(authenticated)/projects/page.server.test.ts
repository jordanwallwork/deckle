import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    projectsApi: { list: vi.fn() }
  };
});

import { projectsApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const makeEvent = () => ({ fetch: mockFetch }) as any;

describe('projects page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the list of projects on success', async () => {
    const projects = [{ id: '1', name: 'My Project', code: 'PROJ' }];
    vi.mocked(projectsApi.list).mockResolvedValue(projects as any);

    const result = await load(makeEvent());

    expect(result).toEqual({ projects });
  });

  it('returns an empty list when the API call fails', async () => {
    vi.mocked(projectsApi.list).mockRejectedValue(new Error('Network error'));

    const result = await load(makeEvent());

    expect(result).toEqual({ projects: [] });
  });
});
