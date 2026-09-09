export interface CreateUploadUrlInput {
  profileId: string;
  fileExtension: string;
}

export interface CreateUploadUrlResult {
  uploadUrl: string;
  objectKey: string;
  expiresAt: Date;
}

export interface ObjectStorageProvider {
  createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult>;
}

export const OBJECT_STORAGE_PROVIDER = Symbol('OBJECT_STORAGE_PROVIDER');
