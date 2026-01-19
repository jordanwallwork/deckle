export interface File {
  id: string;
  projectId: string;
  directoryId: string | null;
  fileName: string;
  path: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedBy: FileUploader;
  tags: string[];
}

export interface FileDirectory {
  id: string;
  projectId: string;
  parentDirectoryId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileDirectoryWithContents {
  id: string;
  projectId: string;
  parentDirectoryId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  childDirectories: FileDirectory[];
  files: File[];
}

export interface FileUploader {
  userId: string;
  email: string;
  name?: string;
}

export interface RequestUploadUrlRequest {
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  tags?: string[];
  directoryId?: string | null;
}

export interface RequestUploadUrlResponse {
  fileId: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface UserStorageQuota {
  quotaMb: number;
  usedBytes: number;
  availableBytes: number;
  usedPercentage: number;
}

export interface UpdateFileTagsRequest {
  tags: string[];
}

export interface FileTagsResponse {
  tags: string[];
}

export interface RenameFileRequest {
  newFileName: string;
}

export interface MoveFileRequest {
  directoryId: string | null;
}

export interface CreateFileDirectoryRequest {
  name: string;
  parentDirectoryId?: string | null;
}

export interface RenameFileDirectoryRequest {
  name: string;
}

export interface MoveFileDirectoryRequest {
  parentDirectoryId: string | null;
  merge?: boolean;
}

export interface DirectoryMoveConflict {
  sourceDirectoryId: string;
  sourceDirectoryName: string;
  conflictingDirectoryId: string;
  conflictingDirectoryName: string;
  message: string;
}
