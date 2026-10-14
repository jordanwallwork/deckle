import { describe, it, expect, vi } from 'vitest';
import { UploadQueue } from './uploadQueue.svelte';
import { StorageQuotaExceededError, type UploadFn } from './uploadFile';
import { MAX_FILE_SIZE } from './validation';
import type { File as DeckleFile } from '$lib/types';

function image(name: string, size = 10): globalThis.File {
  const file = new File(['x'], name, { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const start = { tags: ['art'], directoryId: 'dir-1' };

function uploaded(name: string) {
  return { id: name, fileName: name } as unknown as DeckleFile;
}

describe('UploadQueue', () => {
  it('accepts valid images as pending and marks invalid files as skipped', () => {
    const queue = new UploadQueue('p1', vi.fn());
    queue.add([
      image('ok.png'),
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
      image('huge.png', MAX_FILE_SIZE + 1)
    ]);

    expect(queue.items.map((i) => i.status)).toEqual(['pending', 'invalid', 'invalid']);
    expect(queue.items[1].error).toMatch(/Invalid file type/);
    expect(queue.items[2].error).toMatch(/exceeds maximum/);
    expect(queue.pendingCount).toBe(1);
  });

  it('uploads pending files in order, one at a time', async () => {
    let inFlight = 0;
    const order: string[] = [];
    const upload: UploadFn = vi.fn(async (_projectId, file) => {
      inFlight++;
      expect(inFlight).toBe(1);
      order.push(file.name);
      await new Promise((r) => setTimeout(r, 1));
      inFlight--;
      return uploaded(file.name);
    });
    const onFileUploaded = vi.fn();

    const queue = new UploadQueue('p1', upload);
    queue.add([image('a.png'), image('b.png'), image('c.png')]);
    const summary = await queue.start({ ...start, onFileUploaded });

    expect(order).toEqual(['a.png', 'b.png', 'c.png']);
    expect(summary).toEqual({ uploaded: 3, failed: 0 });
    expect(queue.items.every((i) => i.status === 'done')).toBe(true);
    expect(onFileUploaded).toHaveBeenCalledTimes(3);
    expect(upload).toHaveBeenCalledWith('p1', expect.anything(), expect.objectContaining(start));
  });

  it('skips invalid files', async () => {
    const upload: UploadFn = vi.fn(async (_p, file) => uploaded(file.name));
    const queue = new UploadQueue('p1', upload);
    queue.add([image('a.png'), new File(['x'], 'notes.txt', { type: 'text/plain' })]);

    await queue.start(start);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(queue.items[1].status).toBe('invalid');
  });

  it('continues past a failed upload and reports it', async () => {
    const upload: UploadFn = vi.fn(async (_p, file) => {
      if (file.name === 'b.png') throw new Error('Network error');
      return uploaded(file.name);
    });
    const queue = new UploadQueue('p1', upload);
    queue.add([image('a.png'), image('b.png'), image('c.png')]);

    const summary = await queue.start(start);

    expect(summary).toEqual({ uploaded: 2, failed: 1 });
    expect(queue.items.map((i) => i.status)).toEqual(['done', 'error', 'done']);
    expect(queue.items[1].error).toBe('Network error');
    expect(queue.failedCount).toBe(1);
  });

  it('retries only previously failed files', async () => {
    let failB = true;
    const upload: UploadFn = vi.fn(async (_p, file) => {
      if (file.name === 'b.png' && failB) throw new Error('boom');
      return uploaded(file.name);
    });
    const queue = new UploadQueue('p1', upload);
    queue.add([image('a.png'), image('b.png')]);
    await queue.start(start);

    failB = false;
    vi.mocked(upload).mockClear();
    queue.retryFailed();
    const summary = await queue.start(start);

    expect(upload).toHaveBeenCalledTimes(1);
    expect(vi.mocked(upload).mock.calls[0][1].name).toBe('b.png');
    expect(summary).toEqual({ uploaded: 1, failed: 0 });
    expect(queue.items.every((i) => i.status === 'done')).toBe(true);
  });

  it('stops after the in-flight file when cancelled', async () => {
    const queue = new UploadQueue(
      'p1',
      vi.fn(async (_p, file) => {
        queue.cancel();
        return uploaded(file.name);
      })
    );
    queue.add([image('a.png'), image('b.png')]);

    const summary = await queue.start(start);

    expect(summary).toEqual({ uploaded: 1, failed: 0 });
    expect(queue.items.map((i) => i.status)).toEqual(['done', 'pending']);
  });

  it('does not remove an item that is uploading', async () => {
    let resolve!: () => void;
    const queue = new UploadQueue(
      'p1',
      vi.fn(async (_p, file) => {
        await new Promise<void>((r) => (resolve = r));
        return uploaded(file.name);
      })
    );
    queue.add([image('a.png')]);
    const run = queue.start(start);

    queue.remove(queue.items[0].id);
    expect(queue.items).toHaveLength(1);

    resolve();
    await run;
  });

  it('stops the batch when the storage quota is exceeded and fails the rest', async () => {
    const upload: UploadFn = vi.fn(async (_p, file) => {
      if (file.name === 'b.png') throw new StorageQuotaExceededError(1024);
      return uploaded(file.name);
    });
    const queue = new UploadQueue('p1', upload);
    queue.add([image('a.png'), image('b.png'), image('c.png'), image('d.png')]);

    const summary = await queue.start(start);

    expect(upload).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ uploaded: 1, failed: 3 });
    expect(queue.items.map((i) => i.status)).toEqual(['done', 'error', 'error', 'error']);
    expect(queue.items[1].error).toBe('Storage quota exceeded (1 KB remaining)');
    expect(queue.items[2].error).toBe('Not uploaded: storage quota exceeded');
    expect(queue.stopReason).toEqual({
      kind: 'quota-exceeded',
      message: 'Storage quota exceeded (1 KB remaining)'
    });
  });

  it('leaves invalid files as skipped when the quota is exceeded', async () => {
    const queue = new UploadQueue(
      'p1',
      vi.fn(async () => {
        throw new StorageQuotaExceededError();
      })
    );
    queue.add([image('a.png'), new File(['x'], 'notes.txt', { type: 'text/plain' })]);

    await queue.start(start);

    expect(queue.items.map((i) => i.status)).toEqual(['error', 'invalid']);
  });

  it('clears the stop reason when a new run starts', async () => {
    let quotaFull = true;
    const upload: UploadFn = vi.fn(async (_p, file) => {
      if (quotaFull) throw new StorageQuotaExceededError();
      return uploaded(file.name);
    });
    const queue = new UploadQueue('p1', upload);
    queue.add([image('a.png'), image('b.png')]);
    await queue.start(start);
    expect(queue.stopReason).not.toBeNull();

    quotaFull = false;
    queue.retryFailed();
    const summary = await queue.start(start);

    expect(queue.stopReason).toBeNull();
    expect(summary).toEqual({ uploaded: 2, failed: 0 });
  });
});
