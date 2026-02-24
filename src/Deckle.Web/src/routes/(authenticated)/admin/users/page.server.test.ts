import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('$lib/api')>();
  return {
    ...mod,
    adminApi: { getUsers: vi.fn() }
  };
});

import { adminApi, ApiError } from '$lib/api';
import { load } from './+page.server';

const mockFetch = vi.fn();
const adminUser = { id: 'u1', role: 'Administrator' };

const makeEvent = (
  user: object | undefined,
  searchParams: Record<string, string> = {}
) => {
  const url = new URL('http://localhost/admin/users');
  Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
  return {
    fetch: mockFetch,
    url,
    parent: vi.fn().mockResolvedValue({ user })
  } as any;
};

describe('admin users page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns users response for administrator users', async () => {
    const usersResponse = {
      users: [{ id: 'u2', email: 'bob@example.com', role: 'User' }],
      totalCount: 1,
      page: 1,
      pageSize: 20
    };
    vi.mocked(adminApi.getUsers).mockResolvedValue(usersResponse as any);

    const result = await load(makeEvent(adminUser));

    expect(result).toMatchObject({ usersResponse, user: adminUser });
  });

  it('includes pagination defaults when no query params are provided', async () => {
    vi.mocked(adminApi.getUsers).mockResolvedValue({ users: [] } as any);

    const result = await load(makeEvent(adminUser));

    expect(result.currentPage).toBe(1);
    expect(result.currentPageSize).toBe(20);
    expect(result.currentSearch).toBe('');
  });

  it('parses page, pageSize, and search from query params', async () => {
    vi.mocked(adminApi.getUsers).mockResolvedValue({ users: [] } as any);

    const result = await load(makeEvent(adminUser, { page: '4', pageSize: '10', search: 'bob' }));

    expect(result.currentPage).toBe(4);
    expect(result.currentPageSize).toBe(10);
    expect(result.currentSearch).toBe('bob');
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
  });

  it('throws the ApiError status on API failure', async () => {
    vi.mocked(adminApi.getUsers).mockRejectedValue(new ApiError(500, 'Server error'));

    await expect(load(makeEvent(adminUser))).rejects.toMatchObject({ status: 500 });
  });

  it('throws a 500 error for unknown failures', async () => {
    vi.mocked(adminApi.getUsers).mockRejectedValue(new Error('Unknown'));

    await expect(load(makeEvent(adminUser))).rejects.toMatchObject({ status: 500 });
  });
});
