import { filesApi } from '$lib/api';
import type { File } from '$lib/types';

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
 * Upload a single file to a project: request a presigned URL, PUT the file
 * directly to storage (with progress), then confirm the upload.
 */
export const uploadFile: UploadFn = async (projectId, file, { tags, directoryId, onProgress }) => {
  // Phase 1: Request upload URL
  const { fileId, uploadUrl } = await filesApi.requestUploadUrl(projectId, {
    fileName: file.name,
    contentType: file.type,
    fileSizeBytes: file.size,
    tags,
    directoryId
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

  // Phase 3: Confirm upload
  return filesApi.confirmUpload(fileId);
};
