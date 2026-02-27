import { beforeEach, describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

describe('root page load', () => {
  const makeEvent = (user: object | undefined) =>
    ({
      parent: vi.fn().mockResolvedValue({ user })
    }) as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty object when no user is logged in', async () => {
    const result = await load(makeEvent(undefined));
    expect(result).toEqual({});
  });

  it('redirects to /admin for Administrator users', async () => {
    const user = { id: '1', username: 'admin', role: 'Administrator' };
    await expect(load(makeEvent(user))).rejects.toMatchObject({
      status: 302,
      location: '/admin'
    });
  });

  it('redirects to /projects for regular users', async () => {
    const user = { id: '1', username: 'alice', role: 'User' };
    await expect(load(makeEvent(user))).rejects.toMatchObject({
      status: 302,
      location: '/projects'
    });
  });
});
