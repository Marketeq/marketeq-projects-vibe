export interface CreateUploadUrlInput {
  profileId: string;
  fileExtension: string;
}

export interface CreateUploadUrlResult {
  uploadUrl: string;
  objectKey: string;
  expiresAt: Date;
}

export interface GetObjectInput {
  objectKey: string;
  /**
   * Caller-supplied bound, enforced by the provider before and during the
   * read — never after buffering the whole object. There is no default:
   * the storage layer doesn't know which vendor adapter (document check,
   * face match, liveness — each with its own documented limit) is asking,
   * so it never guesses one.
   */
  maxBytes: number;
}

export interface GetObjectResult {
  bytes: Buffer;
  /** Whatever content-type the object was stored with; `application/octet-stream`
   * if none was recorded. Validating that this is an acceptable type for a
   * given vendor call is the caller's job, not this provider's. */
  contentType: string;
}

export interface ObjectStorageProvider {
  createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult>;
  getObject(input: GetObjectInput): Promise<GetObjectResult>;
}

export const OBJECT_STORAGE_PROVIDER = Symbol('OBJECT_STORAGE_PROVIDER');
