import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { lookup as lookupMime } from 'mime-types';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_MIME_PREFIXES = ['image/'];
const SIGNED_URL_EXPIRY_SECONDS = 300; // 5 minutes

// The repo has accumulated several Cloudflare naming conventions: the .env
// templates use R2_*, render.yaml's `marketeq-secrets` group uses
// CLOUDFLARE_R2_*, and a few services use CLOUDFLARE_*. This service
// previously read only the R2_*/CLOUDFLARE_* forms, so on Render — where only
// the CLOUDFLARE_R2_* names exist — the credentials and bucket resolved to
// undefined and the AWS SDK threw a raw signing error, surfacing as a 500 on
// POST /api/media/upload while local dev (which sets R2_*) worked fine.
// Read whichever form is present, same as user-service's R2Service.
const readEnv = (...candidates: string[]): string | undefined => {
  for (const name of candidates) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
};

@Injectable()
export class MediaService {
  private readonly s3: S3Client;
  private readonly bucket?: string;
  private readonly cdnUrl?: string;
  private readonly maxBytes: number;
  private readonly missingEnv: string[] = [];

  constructor() {
    const accountId = readEnv('CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_R2_ACCOUNT_ID', 'R2_ACCOUNT_ID');
    const accessKeyId = readEnv(
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
      'CLOUDFLARE_R2_ACCESS_KEY',
      'CLOUDFLARE_ACCESS_KEY_ID',
      'R2_ACCESS_KEY_ID',
    );
    const secretAccessKey = readEnv(
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      'CLOUDFLARE_R2_SECRET_KEY',
      'CLOUDFLARE_SECRET_ACCESS_KEY',
      'R2_SECRET_ACCESS_KEY',
    );

    // Prefer an explicitly configured endpoint (render.yaml sets
    // CLOUDFLARE_R2_ENDPOINT); fall back to deriving it from the account id.
    const endpoint =
      readEnv('CLOUDFLARE_R2_ENDPOINT', 'R2_ENDPOINT') ||
      (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

    // Portfolio media lives in its own bucket (marketeq-portfolio-media), not
    // the shared avatar bucket the CLOUDFLARE_R2_BUCKET value points at, so
    // the portfolio-specific names take priority where they are set.
    this.bucket = readEnv(
      'PORTFOLIO_R2_BUCKET',
      'CLOUDFLARE_R2_BUCKET',
      'CLOUDFLARE_BUCKET',
      'R2_BUCKET',
    );
    this.cdnUrl = readEnv(
      'PORTFOLIO_R2_PUBLIC_URL',
      'CLOUDFLARE_R2_PUBLIC_URL',
      'CLOUDFLARE_PUBLIC_URL',
      'R2_PUBLIC_URL',
      'R2_CDN_BASE',
    );
    this.maxBytes = Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

    if (!endpoint) this.missingEnv.push('CLOUDFLARE_R2_ENDPOINT (or CLOUDFLARE_ACCOUNT_ID)');
    if (!accessKeyId) this.missingEnv.push('CLOUDFLARE_R2_ACCESS_KEY_ID');
    if (!secretAccessKey) this.missingEnv.push('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    if (!this.bucket) this.missingEnv.push('CLOUDFLARE_R2_BUCKET');
    if (!this.cdnUrl) this.missingEnv.push('CLOUDFLARE_R2_PUBLIC_URL');

    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      // Since v3.729 the SDK defaults to WHEN_SUPPORTED, which folds an
      // x-amz-checksum-crc32 of the *empty* body into the presigned query
      // string. The browser then PUTs the real file bytes and R2 rejects the
      // request on the checksum mismatch. Presigned URLs are handed to a
      // client that cannot know the checksum at signing time, so the checksum
      // must only be sent when the operation actually requires one.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      credentials:
        accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });
  }

  // Misconfiguration is an operator problem, not a client one: fail with the
  // names of the variables that are missing instead of an opaque SDK error.
  private assertConfigured(): void {
    if (this.missingEnv.length > 0) {
      throw new InternalServerErrorException(
        `Media storage is not configured. Missing environment variables: ${this.missingEnv.join(', ')}`,
      );
    }
  }

  async generateUpload(fileName: string, fileSize: number): Promise<{ uploadUrl: string; publicUrl: string; key: string; contentType: string }> {
    this.assertConfigured();

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
      publicUrl: `${this.cdnUrl!.replace(/\/$/, '')}/${key}`,
      key,
      contentType: mimeType,
    };
  }

  async deleteFile(key: string): Promise<void> {
    this.assertConfigured();
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
