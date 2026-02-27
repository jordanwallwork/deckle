import { beforeEach, describe, expect, it, vi } from 'vitest';
import { load } from './+page.server';

describe('admin page load', () => {
  const makeEvent = (role: string) =>
    ({
      parent: vi.fn().mockResolvedValue({ user: { id: '1', role } })
    }) as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user for Administrator role', async () => {
    const result = await load(makeEvent('Administrator'));
    expect(result!.user).toMatchObject({ role: 'Administrator' });
  });

  it('throws a 403 error for non-administrator users', async () => {
    await expect(load(makeEvent('User'))).rejects.toMatchObject({ status: 403 });
  });
});
