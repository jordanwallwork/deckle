import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    authApi: { me: vi.fn() }
  };
});

import { authApi } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const makeEvent = () => ({ fetch: mockFetch }) as any;

describe('account setup page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user data when user has no username', async () => {
    const user = { id: '1', email: 'alice@example.com', username: undefined };
    vi.mocked(authApi.me).mockResolvedValue(user as any);

    const result = await load(makeEvent());

    expect(result).toEqual({ user });
  });

  it('redirects to /projects when user already has a username', async () => {
    const user = { id: '1', email: 'alice@example.com', username: 'alice' };
    vi.mocked(authApi.me).mockResolvedValue(user as any);

    await expect(load(makeEvent())).rejects.toMatchObject({
      status: 302,
      location: '/projects'
    });
  });

  it('re-throws SvelteKit redirect errors', async () => {
    const redirectError = { status: 302, location: '/projects' };
    vi.mocked(authApi.me).mockRejectedValue(redirectError);

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 302 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Network error'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 500 });
  });
});
