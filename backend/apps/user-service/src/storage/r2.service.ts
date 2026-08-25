import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class R2Service {
  private client?: S3Client;

  constructor(private readonly configService: ConfigService) {}

  // The repo has accumulated multiple Cloudflare naming conventions across
  // .env.example, seed-users.js, and individual services. Rather than force a
  // rename across the codebase, read whichever form is present so any of the
  // existing env files "just works".
  private getEnv(...candidates: string[]): string | undefined {
    for (const name of candidates) {
      const value = this.configService.get<string>(name);
      if (value) return value;
    }
    return undefined;
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ key: string; url?: string }> {
    const bucket = this.getEnv('CLOUDFLARE_R2_BUCKET', 'R2_BUCKET');
    const publicBaseUrl = this.getEnv(
      'CLOUDFLARE_R2_PUBLIC_URL',
      'CLOUDFLARE_PUBLIC_URL',
      'R2_PUBLIC_URL',
    );

    if (!bucket) {
      throw new InternalServerErrorException(
        'CLOUDFLARE_R2_BUCKET is required to upload avatars',
      );
    }

    const client = this.getClient();
    const ext = file.originalname?.split('.').pop();
    const key = `avatars/${userId}/${randomUUID()}${ext ? `.${ext}` : ''}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000',
      }),
    );

    const url = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
      : undefined;

    return { key, url };
  }

  /**
   * Upload a buffer as a PUBLIC, long-lived CDN object and return its public
   * URL. Added in 8f6d8c47 as a second `uploadBuffer` overload-by-accident,
   * which made this file stop compiling (TS2393). Kept here under a distinct
   * name rather than deleted: the capability is real and differs from
   * uploadBuffer below, which is deliberately private/no-cache because it
   * backs resume documents served via short-lived presigned URLs. Merging the
   * two would have silently made private resumes publicly cacheable for a year.
   */
  async uploadPublicBuffer(
    key: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<{ key: string; url?: string }> {
    const bucket = this.getEnv('CLOUDFLARE_R2_BUCKET', 'R2_BUCKET');
    if (!bucket) {
      throw new InternalServerErrorException(
        'CLOUDFLARE_R2_BUCKET is required to upload files',
      );
    }

    const client = this.getClient();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
      }),
    );

    return { key, url: this.getPublicUrl(key) };
  }

  getPublicUrl(key: string): string {
    const publicBaseUrl = this.getEnv(
      'CLOUDFLARE_R2_PUBLIC_URL',
      'CLOUDFLARE_PUBLIC_URL',
      'R2_PUBLIC_URL',
    );
    if (!publicBaseUrl) return key;
    return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  /**
   * Upload an already-buffered object at a caller-chosen key.
   *
   * Unlike uploadAvatar, the caller owns the key and no public CacheControl
   * is set — this backs private documents (resumes), which are served through
   * short-lived presigned URLs via getReadUrl rather than the public CDN.
   */
  async uploadBuffer(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    const bucket = this.getEnv('CLOUDFLARE_R2_BUCKET', 'R2_BUCKET');
    if (!bucket) {
      throw new InternalServerErrorException(
        'CLOUDFLARE_R2_BUCKET is required to upload objects',
      );
    }

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  /** Delete an object by key. Used when a stored document is superseded. */
  async deleteObject(key: string): Promise<void> {
    const bucket = this.getEnv('CLOUDFLARE_R2_BUCKET', 'R2_BUCKET');
    if (!bucket) {
      throw new InternalServerErrorException(
        'CLOUDFLARE_R2_BUCKET is required to delete objects',
      );
    }

    await this.getClient().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }

  /**
   * Blur-aware signed-read helper for R2 objects.
   *
   *   - If `isBlurred` is true, returns the public CDN URL pointing at the
   *     derived blurred copy at `${R2_CDN_BASE}/blurred/${key}`. The
   *     blurred variant is assumed to be generated out-of-band.
   *   - Otherwise, returns a short-lived presigned GET URL for the object.
   *
   * Callers that render private media (portfolio, avatars for blurred
   * profiles, etc.) should go through this helper instead of building URLs
   * by hand.
   */
  async getReadUrl(
    key: string,
    opts: { isBlurred?: boolean; expiresInSeconds?: number } = {},
  ): Promise<string> {
    const { isBlurred = false, expiresInSeconds = 900 } = opts;

    if (isBlurred) {
      const cdnBase = this.configService.get<string>('R2_CDN_BASE');
      if (!cdnBase) {
        throw new InternalServerErrorException(
          'R2_CDN_BASE is required to serve blurred media',
        );
      }
      return `${cdnBase.replace(/\/$/, '')}/blurred/${key}`;
    }

    const bucket = this.getEnv('CLOUDFLARE_R2_BUCKET', 'R2_BUCKET');
    if (!bucket) {
      throw new InternalServerErrorException(
        'CLOUDFLARE_R2_BUCKET is required to presign GET URLs',
      );
    }

    const client = this.getClient();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  private getClient(): S3Client {
    if (this.client) return this.client;

    const accountId = this.getEnv(
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_R2_ACCOUNT_ID',
      'R2_ACCOUNT_ID',
    );
    const accessKeyId = this.getEnv(
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
      'CLOUDFLARE_R2_ACCESS_KEY',
      'R2_ACCESS_KEY_ID',
    );
    const secretAccessKey = this.getEnv(
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      'CLOUDFLARE_R2_SECRET_KEY',
      'R2_SECRET_ACCESS_KEY',
    );
    const endpoint =
      this.getEnv('CLOUDFLARE_R2_ENDPOINT', 'R2_ENDPOINT') ??
      (accountId
        ? `https://${accountId}.r2.cloudflarestorage.com`
        : undefined);

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      throw new InternalServerErrorException(
        'Cloudflare R2 credentials are not configured',
      );
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    return this.client;
  }
}
