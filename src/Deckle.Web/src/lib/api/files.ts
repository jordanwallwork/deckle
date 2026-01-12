import { api } from './client';
import type {
  File,
  RequestUploadUrlRequest,
  RequestUploadUrlResponse,
  GenerateDownloadUrlResponse,
  UserStorageQuota,
  UpdateFileTagsRequest,
  FileTagsResponse
} from '$lib/types';

/**
 * Files API
 */
export const filesApi = {
  /**
   * Request a presigned URL for uploading a file to a project
   */
  requestUploadUrl: (projectId: string, data: RequestUploadUrlRequest, fetchFn?: typeof fetch) =>
    api.post<RequestUploadUrlResponse>(
      `/projects/${projectId}/files/upload-url`,
      data,
      undefined,
      fetchFn
    ),

  /**
   * Confirm that a file upload has completed successfully
   */
  confirmUpload: (fileId: string, fetchFn?: typeof fetch) =>
    api.post<File>(`/files/${fileId}/confirm`, undefined, undefined, fetchFn),

  /**
   * Get all files for a project, optionally filtered by tags
   */
  list: (projectId: string, tags?: string[], matchAll?: boolean, fetchFn?: typeof fetch) => {
    const params = new URLSearchParams();
    if (tags && tags.length > 0) {
      params.set('tags', tags.join(','));
    }
    if (matchAll !== undefined) {
      params.set('matchAll', matchAll.toString());
    }
    const queryString = params.toString();
    const url = `/projects/${projectId}/files${queryString ? `?${queryString}` : ''}`;
    return api.get<File[]>(url, undefined, fetchFn);
  },

  /**
   * Get all distinct tags used in project files (for autocomplete)
   */
  getTags: (projectId: string, fetchFn?: typeof fetch) =>
    api.get<FileTagsResponse>(`/projects/${projectId}/files/tags`, undefined, fetchFn),

  /**
   * Update tags for a file
   */
  updateTags: (fileId: string, data: UpdateFileTagsRequest, fetchFn?: typeof fetch) =>
    api.patch<File>(`/files/${fileId}/tags`, data, undefined, fetchFn),

  /**
   * Generate a presigned URL for downloading a file
   */
  generateDownloadUrl: (fileId: string, fetchFn?: typeof fetch) =>
    api.get<GenerateDownloadUrlResponse>(`/files/${fileId}/download-url`, undefined, fetchFn),

  /**
   * Delete a file from the project
   */
  delete: (fileId: string, fetchFn?: typeof fetch) =>
    api.delete(`/files/${fileId}`, undefined, fetchFn),

  /**
   * Get the current user's storage quota information
   */
  getQuota: (fetchFn?: typeof fetch) =>
    api.get<UserStorageQuota>('/user/storage-quota', undefined, fetchFn)
};
