import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  CreateUploadUrlInput,
  CreateUploadUrlResult,
  GetObjectInput,
  GetObjectResult,
  ObjectStorageProvider,
} from './object-storage-provider.interface';
import {
  ObjectNotFoundError,
  ObjectReadInterruptedError,
  ObjectStorageUnavailableError,
  ObjectTooLargeError,
} from './object-storage.errors';

const UPLOAD_URL_TTL_SECONDS = 300;

@Injectable()
export class R2ObjectStorageProvider implements ObjectStorageProvider {
  private readonly client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
  });

  // Fail-fast on a missing required env var, matching this service's
  // existing convention for a config value with no safe default (see
  // document-fingerprint.ts's DOCUMENT_NUMBER_HASH_PEPPER check and
  // internal-service.guard.ts's SERVICE_AUTH_TOKEN check) — a plain Error
  // thrown at the point of use, not a new validation framework.
  private getBucketName(): string {
    const bucket = process.env.R2_BUCKET;
    if (!bucket) {
      throw new Error('R2_BUCKET is required to read or write identity verification documents.');
    }
    return bucket;
  }

  async createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult> {
    const objectKey = `identity-documents/${input.profileId}/${randomUUID()}.${input.fileExtension}`;
    const command = new PutObjectCommand({
      Bucket: this.getBucketName(),
      Key: objectKey,
    });
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });
    return {
      uploadUrl,
      objectKey,
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000),
    };
  }

  // Bounded read: the size limit is enforced twice, both before any bytes
  // are buffered beyond it — once cheaply from the response's declared
  // Content-Length (rejects an oversized object before reading a single
  // byte of the body), and again while streaming as a defense-in-depth
  // fallback for a missing or understated Content-Length. Never buffers
  // the object fully before checking; the running total is checked before
  // each chunk is appended, so an oversized chunk is never retained.
  async getObject({ objectKey, maxBytes }: GetObjectInput): Promise<GetObjectResult> {
    // Resolved before the try block on purpose: a missing R2_BUCKET is a
    // config error, not a storage-backend failure, and must surface as
    // such rather than being caught below and remapped to
    // ObjectStorageUnavailableError.
    const bucket = this.getBucketName();
    let response;
    try {
      response = await this.client.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey }));
    } catch (err) {
      if (this.isNoSuchKey(err)) {
        throw new ObjectNotFoundError(objectKey);
      }
      throw new ObjectStorageUnavailableError(err);
    }

    if (typeof response.ContentLength === 'number' && response.ContentLength > maxBytes) {
      throw new ObjectTooLargeError(objectKey, maxBytes);
    }

    const body = response.Body as unknown as AsyncIterable<Uint8Array> | undefined;
    if (!body) {
      throw new ObjectStorageUnavailableError(new Error('empty_response_body'));
    }

    const contentType = response.ContentType || 'application/octet-stream';
    const chunks: Buffer[] = [];
    let total = 0;

    try {
      for await (const chunk of body) {
        total += chunk.length;
        if (total > maxBytes) {
          const destroyable = body as { destroy?: () => void };
          destroyable.destroy?.();
          throw new ObjectTooLargeError(objectKey, maxBytes);
        }
        chunks.push(Buffer.from(chunk));
      }
    } catch (err) {
      if (err instanceof ObjectTooLargeError) throw err;
      throw new ObjectReadInterruptedError(objectKey, err);
    }

    return { bytes: Buffer.concat(chunks), contentType };
  }

  private isNoSuchKey(err: unknown): boolean {
    const e = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
    return e?.name === 'NoSuchKey' || e?.Code === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
  }
}
