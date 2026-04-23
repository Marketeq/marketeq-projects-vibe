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

  private getEnv(...candidates: string[]): string | undefined {
    for (const name of candidates) {
      const value = this.configService.get<string>(name);
      if (value) return value;
    }
    return undefined;
  }

  async uploadMessageAttachment(
    threadId: string,
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
        'CLOUDFLARE_R2_BUCKET is required to upload message attachments',
      );
    }

    const client = this.getClient();
    const ext = file.originalname?.split('.').pop();
    const key = `messages/${threadId}/${randomUUID()}${ext ? `.${ext}` : ''}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
      : undefined;

    return { key, url };
  }

  async getReadUrl(key: string, expiresInSeconds = 900): Promise<string> {
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
