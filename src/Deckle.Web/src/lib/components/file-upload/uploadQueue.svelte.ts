import type { File } from '$lib/types';
import { uploadFile, type UploadFn } from './uploadFile';
import { validateImageFile } from './validation';

export type QueueItemStatus = 'pending' | 'uploading' | 'done' | 'error' | 'invalid';

export interface QueueItem {
  id: number;
  file: globalThis.File;
  status: QueueItemStatus;
  progress: number;
  error?: string;
}

export interface UploadSummary {
  uploaded: number;
  failed: number;
}

export interface StartOptions {
  tags: string[];
  directoryId: string | null;
  onFileUploaded?: (file: File) => void;
}

/**
 * A batch of files to upload to a project. Files are validated as they are
 * added and uploaded strictly one at a time when the queue is started.
 */
export class UploadQueue {
  items = $state<QueueItem[]>([]);
  isUploading = $state(false);

  pendingCount = $derived(this.items.filter((i) => i.status === 'pending').length);
  doneCount = $derived(this.items.filter((i) => i.status === 'done').length);
  failedCount = $derived(this.items.filter((i) => i.status === 'error').length);
  hasUploadable = $derived(this.pendingCount > 0);

  #projectId: string;
  #upload: UploadFn;
  #nextId = 0;
  #cancelled = false;

  constructor(projectId: string, upload: UploadFn = uploadFile) {
    this.#projectId = projectId;
    this.#upload = upload;
  }

  add(files: Iterable<globalThis.File>) {
    for (const file of files) {
      const error = validateImageFile(file);
      this.items.push({
        id: this.#nextId++,
        file,
        status: error ? 'invalid' : 'pending',
        progress: 0,
        error: error ?? undefined
      });
    }
  }

  remove(id: number) {
    this.items = this.items.filter((i) => i.id !== id || i.status === 'uploading');
  }

  clear() {
    if (this.isUploading) return;
    this.items = [];
  }

  retryFailed() {
    for (const item of this.items) {
      if (item.status === 'error') {
        item.status = 'pending';
        item.progress = 0;
        item.error = undefined;
      }
    }
  }

  /** Stop processing after the file currently uploading (if any) finishes. */
  cancel() {
    this.#cancelled = true;
  }

  async start({ tags, directoryId, onFileUploaded }: StartOptions): Promise<UploadSummary> {
    const summary: UploadSummary = { uploaded: 0, failed: 0 };
    if (this.isUploading) return summary;

    this.isUploading = true;
    this.#cancelled = false;

    try {
      // Always read items through the $state proxy so mutations are reactive
      let item: QueueItem | undefined;
      while (!this.#cancelled && (item = this.items.find((i) => i.status === 'pending'))) {
        const current = item;
        current.status = 'uploading';
        current.progress = 0;

        try {
          const uploaded = await this.#upload(this.#projectId, current.file, {
            tags,
            directoryId,
            onProgress: (percent) => (current.progress = percent)
          });
          current.status = 'done';
          current.progress = 100;
          summary.uploaded++;
          onFileUploaded?.(uploaded);
        } catch (err) {
          current.status = 'error';
          current.error = err instanceof Error ? err.message : 'Upload failed. Please try again.';
          summary.failed++;
        }
      }
    } finally {
      this.isUploading = false;
    }

    return summary;
  }
}
