export interface File {
  id: string;
  projectId: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedBy: FileUploader;
  tags: string[];
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
}

export interface RequestUploadUrlResponse {
  fileId: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface GenerateDownloadUrlResponse {
  downloadUrl: string;
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
