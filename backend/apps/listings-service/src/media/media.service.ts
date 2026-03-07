import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  constructor(private readonly config: ConfigService) {
    this.endpoint = config.get('CLOUDFLARE_R2_ENDPOINT');
    this.bucket = config.get('CLOUDFLARE_R2_BUCKET');
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: config.get('CLOUDFLARE_R2_ACCESS_KEY'),
        secretAccessKey: config.get('CLOUDFLARE_R2_SECRET_KEY'),
      },
    });
  }

  async upload(file: Express.Multer.File): Promise<{ url: string; key: string }> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Unsupported file type');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File exceeds 10MB limit');
    }

    const key = `media/${uuidv4()}-${file.originalname}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { url: `${this.endpoint}/${this.bucket}/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
