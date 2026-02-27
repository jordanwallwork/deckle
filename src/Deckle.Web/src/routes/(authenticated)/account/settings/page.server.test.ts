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

describe('account settings page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user data on success', async () => {
    const user = { id: '1', email: 'alice@example.com', username: 'alice' };
    vi.mocked(authApi.me).mockResolvedValue(user as any);

    const result = await load(makeEvent());

    expect(result).toEqual({ user });
  });

  it('throws a 500 error when authApi.me fails', async () => {
    vi.mocked(authApi.me).mockRejectedValue(new Error('Network error'));

    await expect(load(makeEvent())).rejects.toMatchObject({ status: 500 });
  });
});
