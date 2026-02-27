import { beforeEach, describe, expect, it, vi } from 'vitest';
import { load } from './+layout.server';

describe('authenticated layout load', () => {
  const makeEvent = (user: object | undefined, pathname = '/projects') =>
    ({
      parent: vi.fn().mockResolvedValue({ user }),
      url: new URL(`http://localhost${pathname}`)
    }) as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user when authenticated', async () => {
    const user = { id: '1', username: 'alice', role: 'User' };
    const result = await load(makeEvent(user));
    expect(result).toEqual({ user });
  });

  it('redirects to login when no user is present', async () => {
    await expect(load(makeEvent(undefined))).rejects.toMatchObject({ status: 302 });
  });

  it('includes the return URL in the login redirect', async () => {
    const thrown = await load(makeEvent(undefined, '/projects?page=2')).catch((e) => e);
    expect(thrown.location).toContain('returnUrl=');
    expect(thrown.location).toContain(encodeURIComponent('/projects?page=2'));
  });
});
