import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    authApi: { me: vi.fn() }
  };
});

import { authApi } from '$lib/api';
import { load } from './+layout.server';

const mockFetch = vi.fn();

const makeEvent = (pathname: string) =>
  ({
    fetch: mockFetch,
    url: new URL(`http://localhost${pathname}`)
  }) as any;

describe('root layout load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user and posthog key when user is logged in with a username', async () => {
    const user = { id: '1', username: 'alice', email: 'alice@example.com', role: 'User' };
    vi.mocked(authApi.me).mockResolvedValue(user);

    const result = await load(makeEvent('/projects'));

    expect(result).toMatchObject({ user });
  });

  it('returns user even when posthog key is absent', async () => {
    const user = { id: '1', username: 'alice', email: 'alice@example.com', role: 'User' };
    vi.mocked(authApi.me).mockResolvedValue(user);

    const result = await load(makeEvent('/projects'));

    expect(result!.user).toEqual(user);
  });

  it('redirects to /account/setup when user has no username and is not on setup or landing page', async () => {
    const user = { id: '1', username: undefined, email: 'alice@example.com', role: 'User' };
    vi.mocked(authApi.me).mockResolvedValue(user);

    await expect(load(makeEvent('/projects'))).rejects.toMatchObject({
      status: 302,
      location: '/account/setup'
    });
  });

  it('does not redirect when user has no username but is on the setup page', async () => {
    const user = { id: '1', username: undefined, email: 'alice@example.com', role: 'User' };
    vi.mocked(authApi.me).mockResolvedValue(user);

    const result = await load(makeEvent('/account/setup'));

    expect(result!.user).toEqual(user);
  });

  it('does not redirect when user has no username but is on the landing page', async () => {
    const user = { id: '1', username: undefined, email: 'alice@example.com', role: 'User' };
    vi.mocked(authApi.me).mockResolvedValue(user);

    const result = await load(makeEvent('/'));

    expect(result!.user).toEqual(user);
  });

  it('returns undefined user when authApi.me throws a non-redirect error', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Network error'));

    const result = await load(makeEvent('/projects'));

    expect(result!.user).toBeUndefined();
  });

  it('re-throws SvelteKit redirect errors', async () => {
    const redirectError = { status: 302, location: '/somewhere' };
    vi.mocked(authApi.me).mockRejectedValue(redirectError);

    await expect(load(makeEvent('/projects'))).rejects.toMatchObject({ status: 302 });
  });
});
