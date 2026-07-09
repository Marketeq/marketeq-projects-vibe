import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class CloudflareStorageService {
  private s3Client?: S3Client;
  private readonly logger = new Logger(CloudflareStorageService.name);

  constructor(private readonly configService: ConfigService) {}

  async uploadProjectMedia(
    projectId: string,
    file: Express.Multer.File,
  ): Promise<{ key: string; url: string }> {
    const bucket =
      this.configService.get<string>('CLOUDFLARE_R2_BUCKET') || 'marketeq-project-media';
    const key = this.buildObjectKey(projectId, file.originalname);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: 'public, max-age=31536000',
    });

    try {
      await this.getClient().send(command);
    } catch (error) {
      const details = this.getErrorDetails(error);
      this.logger.error(
        `R2 upload failed for project ${projectId}. code=${details.code} message=${details.message}`,
      );
      throw new InternalServerErrorException(
        `Cloudflare R2 upload failed (${details.code}). Check R2 endpoint, bucket, and API token permissions.`,
      );
    }

    return {
      key,
      url: this.buildPublicUrl(bucket, key),
    };
  }

  private buildObjectKey(projectId: string, originalName: string): string {
    const lastDotIndex = originalName.lastIndexOf('.');
    const rawName =
      lastDotIndex > 0
        ? originalName.slice(0, lastDotIndex)
        : originalName || 'upload';
    const rawExtension =
      lastDotIndex > 0 ? originalName.slice(lastDotIndex + 1) : '';
    const extension = rawExtension.toLowerCase().match(/^[a-z0-9]+$/)
      ? rawExtension
      : '';
    const name = rawName
      .normalize('NFKD')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    return `projects/${projectId}/media/${name || 'upload'}-${randomUUID()}${
      extension ? `.${extension}` : ''
    }`;
  }

  private buildPublicUrl(bucket: string, key: string): string {
    const publicBaseUrl = this.configService.get<string>('CLOUDFLARE_R2_PUBLIC_URL');
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    const endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT');
    if (endpoint) {
      return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
    }

    return key;
  }

  private getClient(): S3Client {
    if (this.s3Client) {
      return this.s3Client;
    }

    const endpoint = this.configService.get<string>('CLOUDFLARE_R2_ENDPOINT');
    const accessKeyId = this.configService.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY');

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException(
        'Cloudflare R2 credentials are not configured',
      );
    }

    this.s3Client = new S3Client({
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region: 'auto',
      forcePathStyle: true,
    });

    return this.s3Client;
  }

  private getErrorDetails(error: unknown): { code: string; message: string } {
    if (
      typeof error === 'object' &&
      error !== null &&
      ('name' in error ||
        'message' in error ||
        'code' in error ||
        'Code' in error)
    ) {
      const err = error as {
        name?: string;
        code?: string;
        Code?: string;
        message?: string;
      };
      return {
        code: err.Code || err.code || err.name || 'UnknownError',
        message: err.message || 'No error message',
      };
    }

    return { code: 'UnknownError', message: 'No error message' };
  }
}
