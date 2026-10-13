import { describe, it, expect, vi } from 'vitest';
import { ApiError } from '$lib/api';
import { retryWhenRateLimited } from './uploadFile';

const rateLimited = (retryAfterSeconds?: number) =>
  new ApiError(429, 'Too Many Requests', undefined, retryAfterSeconds);

describe('retryWhenRateLimited', () => {
  it('returns the result without sleeping when the call succeeds', async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const fn = vi.fn(async () => 'ok');

    await expect(retryWhenRateLimited(fn, sleep)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries after a 429, honouring Retry-After', async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const fn = vi.fn().mockRejectedValueOnce(rateLimited(3)).mockResolvedValueOnce('ok');

    await expect(retryWhenRateLimited(fn, sleep)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it('backs off exponentially when there is no Retry-After', async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const fn = vi
      .fn()
      .mockRejectedValueOnce(rateLimited())
      .mockRejectedValueOnce(rateLimited())
      .mockRejectedValueOnce(rateLimited())
      .mockResolvedValueOnce('ok');

    await expect(retryWhenRateLimited(fn, sleep)).resolves.toBe('ok');
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([1000, 2000, 4000]);
  });

  it('rethrows non-429 errors immediately', async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const error = new ApiError(500, 'Server error');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(retryWhenRateLimited(fn, sleep)).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('gives up after repeated 429s', async () => {
    const sleep = vi.fn(async (_ms: number) => {});
    const fn = vi.fn().mockRejectedValue(rateLimited());

    await expect(retryWhenRateLimited(fn, sleep)).rejects.toMatchObject({ status: 429 });
    expect(fn).toHaveBeenCalledTimes(6);
  });
});
