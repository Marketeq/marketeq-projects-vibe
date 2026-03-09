import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class InfraR2Service {
  private readonly client: any;
  private readonly bucket = process.env['R2_BUCKET'] ?? '';
  private readonly endpoint = (process.env['R2_ENDPOINT'] ?? '').replace(/\/$/, '');
  private readonly accessKey = process.env['R2_ACCESS_KEY'] ?? '';
  private readonly secretKey = process.env['R2_SECRET_KEY'] ?? '';
  private readonly presignTtl = Number(process.env['PRESIGN_TTL_SECONDS'] ?? 300);

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: this.accessKey, secretAccessKey: this.secretKey },
    });
  }

  async createPresignedPut(key: string, contentType = 'image/jpeg', contentLength?: number) {
    try {
      const cmd = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
        ...(contentLength ? { ContentLength: contentLength } : {}),
      });
      const putUrl = await getSignedUrl(this.client, cmd, { expiresIn: this.presignTtl });
      const getUrl = `${this.endpoint}/${this.bucket}/${encodeURIComponent(key)}`;
      return { putUrl, getUrl, key, expires: this.presignTtl };
    } catch (err: any) {
      throw new InternalServerErrorException({
        message: 'Failed to presign',
        error: String(err?.message || err),
      });
    }
  }
}
