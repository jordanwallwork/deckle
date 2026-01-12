import { api } from './client';
import type {
  File,
  RequestUploadUrlRequest,
  RequestUploadUrlResponse,
  GenerateDownloadUrlResponse,
  UserStorageQuota
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
   * Get all files for a project
   */
  list: (projectId: string, fetchFn?: typeof fetch) =>
    api.get<File[]>(`/projects/${projectId}/files`, undefined, fetchFn),

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
