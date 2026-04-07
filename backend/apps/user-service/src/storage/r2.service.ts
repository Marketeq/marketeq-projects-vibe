import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
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

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ key: string; url?: string }> {
    const bucket = this.configService.get<string>('CLOUDFLARE_R2_BUCKET');
    const publicBaseUrl = this.configService.get<string>(
      'CLOUDFLARE_R2_PUBLIC_URL',
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

    const bucket = this.configService.get<string>('CLOUDFLARE_R2_BUCKET');
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

    const accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>(
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
    );
    const secretAccessKey = this.configService.get<string>(
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    );
    const endpoint =
      this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT') ??
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
