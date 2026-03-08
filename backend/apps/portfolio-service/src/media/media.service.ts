import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { lookup as lookupMime } from 'mime-types';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_PREFIXES = ['image/'];
const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly cdnUrl: string;
  private readonly maxBytes: number;

  constructor() {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
      },
    });
    this.bucket = process.env.CLOUDFLARE_BUCKET!;
    this.cdnUrl = process.env.CLOUDFLARE_PUBLIC_URL!;
    this.maxBytes = Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;
  }

  async generateUpload(fileName: string, fileSize: number): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    if (fileSize > this.maxBytes) {
      throw new BadRequestException(`File exceeds maximum size of ${process.env.MAX_FILE_SIZE_MB || 10}MB`);
    }

    const ext = extname(fileName).toLowerCase();
    const mimeType = lookupMime(ext);

    if (!mimeType || !ALLOWED_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix))) {
      throw new BadRequestException('Only image files are allowed');
    }

    const key = `portfolio/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: SIGNED_URL_EXPIRY_SECONDS });

    return {
      uploadUrl,
      publicUrl: `${this.cdnUrl}/${key}`,
      key,
    };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
