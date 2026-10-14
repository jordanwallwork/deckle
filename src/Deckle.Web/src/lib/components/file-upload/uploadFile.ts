import { filesApi, ApiError } from '$lib/api';
import type { File } from '$lib/types';
import { formatFileSize } from './validation';

export interface UploadFileOptions {
  tags: string[];
  directoryId: string | null;
  onProgress?: (percent: number) => void;
}

export type UploadFn = (
  projectId: string,
  file: globalThis.File,
  options: UploadFileOptions
) => Promise<File>;

/**
 * Thrown when an upload is rejected because the project owner's storage quota
 * is full. Later files in a batch would be rejected too, so callers should stop.
 */
export class StorageQuotaExceededError extends Error {
  constructor(public availableBytes?: number) {
    super(
      availableBytes !== undefined
        ? `Storage quota exceeded (${formatFileSize(availableBytes)} remaining)`
        : 'Storage quota exceeded'
    );
    this.name = 'StorageQuotaExceededError';
  }
}

/** The API reports a full storage quota as 413 with problem details */
function toQuotaError(err: unknown): unknown {
  if (err instanceof ApiError && err.status === 413) {
    const available = err.response?.availableBytes;
    return new StorageQuotaExceededError(typeof available === 'number' ? available : undefined);
  }
  return err;
}

/**
 * Upload a single file to a project: request a presigned URL, PUT the file
 * directly to storage (with progress), then confirm the upload.
 */
export const uploadFile: UploadFn = async (projectId, file, { tags, directoryId, onProgress }) => {
  // Phase 1: Request upload URL (the quota is checked here, before any bytes are sent)
  const { fileId, uploadUrl } = await filesApi
    .requestUploadUrl(projectId, {
      fileName: file.name,
      contentType: file.type,
      fileSizeBytes: file.size,
      tags,
      directoryId
    })
    .catch((err) => {
      throw toQuotaError(err);
    });

  // Phase 2: Upload to storage (direct, with progress)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error'));

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('x-amz-meta-filesize', file.size.toString());
    xhr.send(file);
  });

  // Phase 3: Confirm upload. The file is already in storage at this point, so
  // retry if rate limited rather than failing and forcing a full re-upload.
  // Confirm can also hit the quota if another upload used up the space meanwhile.
  return retryWhenRateLimited(() => filesApi.confirmUpload(fileId)).catch((err) => {
    throw toQuotaError(err);
  });
};

const MAX_RATE_LIMIT_RETRIES = 5;
const MAX_BACKOFF_MS = 10_000;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn`, retrying when it fails with a 429. Waits for the server's
 * Retry-After hint if given, otherwise backs off exponentially (1s, 2s, 4s…).
 * Any other error is rethrown immediately.
 */
export async function retryWhenRateLimited<T>(
  fn: () => Promise<T>,
  sleep: (ms: number) => Promise<void> = delay
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
        throw err;
      }
      const waitMs = err.retryAfterSeconds
        ? err.retryAfterSeconds * 1000
        : Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
      await sleep(waitMs);
    }
  }
}
