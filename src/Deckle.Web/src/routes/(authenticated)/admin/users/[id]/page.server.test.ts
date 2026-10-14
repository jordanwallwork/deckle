import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    adminApi: { getUser: vi.fn() }
  };
});

import { adminApi, ApiError } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const adminUser = { id: 'u1', role: 'Administrator' };

const makeEvent = (user: object | undefined, id = 'u2') =>
  ({
    params: { id },
    fetch: mockFetch,
    parent: vi.fn().mockResolvedValue({ user })
  }) as any;

describe('admin user detail page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the user detail and current admin id for administrator users', async () => {
    const userDetail = { id: 'u2', email: 'bob@example.com', apiKeys: [], projects: [] };
    vi.mocked(adminApi.getUser).mockResolvedValue(userDetail as any);

    const result = await load(makeEvent(adminUser));

    expect(result).toMatchObject({ userDetail, user: adminUser, currentUserId: 'u1' });
    expect(adminApi.getUser).toHaveBeenCalledWith('u2', mockFetch);
  });

  it('redirects to / when no user is present', async () => {
    await expect(load(makeEvent(undefined))).rejects.toMatchObject({
      status: 302,
      location: '/'
    });
  });

  it('throws 403 for non-administrator users', async () => {
    await expect(load(makeEvent({ id: 'u1', role: 'User' }))).rejects.toMatchObject({
      status: 403
    });
    expect(adminApi.getUser).not.toHaveBeenCalled();
  });

  it('throws the ApiError status when the user is not found', async () => {
    vi.mocked(adminApi.getUser).mockRejectedValue(new ApiError(404, 'User not found'));

    await expect(load(makeEvent(adminUser))).rejects.toMatchObject({ status: 404 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(adminApi.getUser).mockRejectedValue(new Error('Unknown'));

    await expect(load(makeEvent(adminUser))).rejects.toMatchObject({ status: 500 });
  });
});
