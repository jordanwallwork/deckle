import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiError, filesApi } from '$lib/api';
import { retryWhenRateLimited, StorageQuotaExceededError, uploadFile } from './uploadFile';

const rateLimited = (retryAfterSeconds?: number) =>
  new ApiError(429, 'Too Many Requests', undefined, retryAfterSeconds);

describe('retryWhenRateLimited', () => {
  it('returns the result without sleeping when the call succeeds', async () => {
    const sleep = vi.fn((_ms: number) => Promise.resolve());
    const fn = vi.fn(() => Promise.resolve('ok'));

    await expect(retryWhenRateLimited(fn, sleep)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries after a 429, honouring Retry-After', async () => {
    const sleep = vi.fn((_ms: number) => Promise.resolve());
    const fn = vi.fn().mockRejectedValueOnce(rateLimited(3)).mockResolvedValueOnce('ok');

    await expect(retryWhenRateLimited(fn, sleep)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it('backs off exponentially when there is no Retry-After', async () => {
    const sleep = vi.fn((_ms: number) => Promise.resolve());
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
    const sleep = vi.fn((_ms: number) => Promise.resolve());
    const error = new ApiError(500, 'Server error');
    const fn = vi.fn().mockRejectedValue(error);

    await expect(retryWhenRateLimited(fn, sleep)).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('gives up after repeated 429s', async () => {
    const sleep = vi.fn((_ms: number) => Promise.resolve());
    const fn = vi.fn().mockRejectedValue(rateLimited());

    await expect(retryWhenRateLimited(fn, sleep)).rejects.toMatchObject({ status: 429 });
    expect(fn).toHaveBeenCalledTimes(6);
  });
});

describe('uploadFile', () => {
  afterEach(() => vi.restoreAllMocks());

  const file = new File(['x'], 'a.png', { type: 'image/png' });
  const options = { tags: [], directoryId: null };

  it('reports a 413 from the API as a StorageQuotaExceededError', async () => {
    vi.spyOn(filesApi, 'requestUploadUrl').mockRejectedValue(
      new ApiError(413, 'HTTP 413: Payload Too Large', { availableBytes: 2048 })
    );

    const result = uploadFile('p1', file, options);

    await expect(result).rejects.toBeInstanceOf(StorageQuotaExceededError);
    await expect(result).rejects.toMatchObject({
      availableBytes: 2048,
      message: 'Storage quota exceeded (2 KB remaining)'
    });
  });

  it('passes other API errors through unchanged', async () => {
    const error = new ApiError(400, 'Bad request');
    vi.spyOn(filesApi, 'requestUploadUrl').mockRejectedValue(error);

    await expect(uploadFile('p1', file, options)).rejects.toBe(error);
  });
});
