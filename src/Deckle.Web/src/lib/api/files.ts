import { api } from './client';
import type {
  File,
  FileDirectory,
  FileDirectoryWithContents,
  RequestUploadUrlRequest,
  RequestUploadUrlResponse,
  UserStorageQuota,
  UpdateFileTagsRequest,
  RenameFileRequest,
  MoveFileRequest,
  FileTagsResponse,
  CreateFileDirectoryRequest,
  RenameFileDirectoryRequest,
  MoveFileDirectoryRequest,
  DirectoryMoveConflict
} from '$lib/types';

export type { DirectoryMoveConflict };

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
   * Get all files for a project, optionally filtered by tags and/or directory
   */
  list: (
    projectId: string,
    options?: {
      tags?: string[];
      matchAll?: boolean;
      directoryId?: string;
      inRoot?: boolean;
    },
    fetchFn?: typeof fetch
  ) => {
    const params = new URLSearchParams();
    if (options?.tags && options.tags.length > 0) {
      params.set('tags', options.tags.join(','));
    }
    if (options?.matchAll !== undefined) {
      params.set('matchAll', options.matchAll.toString());
    }
    if (options?.directoryId) {
      params.set('directoryId', options.directoryId);
    }
    if (options?.inRoot) {
      params.set('inRoot', 'true');
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
   * Rename a file while preserving its extension
   */
  rename: (fileId: string, data: RenameFileRequest, fetchFn?: typeof fetch) =>
    api.patch<File>(`/files/${fileId}/rename`, data, undefined, fetchFn),

  /**
   * Move a file to a different directory
   */
  move: (fileId: string, data: MoveFileRequest, fetchFn?: typeof fetch) =>
    api.patch<File>(`/files/${fileId}/move`, data, undefined, fetchFn),

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

/**
 * File Directories API
 */
export const directoriesApi = {
  /**
   * Create a new directory in a project
   */
  create: (projectId: string, data: CreateFileDirectoryRequest, fetchFn?: typeof fetch) =>
    api.post<FileDirectory>(`/projects/${projectId}/directories`, data, undefined, fetchFn),

  /**
   * Get all directories for a project
   */
  list: (projectId: string, fetchFn?: typeof fetch) =>
    api.get<FileDirectory[]>(`/projects/${projectId}/directories`, undefined, fetchFn),

  /**
   * Get root directory contents (files and directories at root level)
   */
  getRoot: (projectId: string, fetchFn?: typeof fetch) =>
    api.get<FileDirectoryWithContents>(`/projects/${projectId}/directories/root`, undefined, fetchFn),

  /**
   * Get a directory by its path (e.g., "folder1/folder2")
   * Returns root contents if path is empty
   */
  getByPath: (projectId: string, path: string, fetchFn?: typeof fetch) => {
    const encodedPath = path ? encodeURIComponent(path) : '';
    const url = `/projects/${projectId}/directories/by-path${encodedPath ? `?path=${encodedPath}` : ''}`;
    return api.get<FileDirectoryWithContents>(url, undefined, fetchFn);
  },

  /**
   * Get a directory with its contents
   */
  get: (projectId: string, directoryId: string, fetchFn?: typeof fetch) =>
    api.get<FileDirectoryWithContents>(
      `/projects/${projectId}/directories/${directoryId}`,
      undefined,
      fetchFn
    ),

  /**
   * Rename a directory
   */
  rename: (directoryId: string, data: RenameFileDirectoryRequest, fetchFn?: typeof fetch) =>
    api.patch<FileDirectory>(`/directories/${directoryId}/rename`, data, undefined, fetchFn),

  /**
   * Move a directory to a new parent
   */
  move: (directoryId: string, data: MoveFileDirectoryRequest, fetchFn?: typeof fetch) =>
    api.patch<FileDirectory>(`/directories/${directoryId}/move`, data, undefined, fetchFn),

  /**
   * Delete a directory
   */
  delete: (directoryId: string, fetchFn?: typeof fetch) =>
    api.delete(`/directories/${directoryId}`, undefined, fetchFn)
};
