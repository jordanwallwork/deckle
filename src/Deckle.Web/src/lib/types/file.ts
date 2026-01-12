export interface File {
  id: string;
  projectId: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  uploadedBy: FileUploader;
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
