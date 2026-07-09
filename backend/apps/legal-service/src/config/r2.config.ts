import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

/**
 * Creates a Cloudflare R2 S3-compatible client.
 *
 * Important: CLOUDFLARE_R2_ENDPOINT must be the account-level URL only
 * (e.g. https://<account-id>.r2.cloudflarestorage.com) — do NOT append
 * the bucket name. forcePathStyle: true makes the SDK append it automatically.
 */
export function createR2Client(config: ConfigService): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.get<string>('CLOUDFLARE_R2_ENDPOINT'),
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID')!,
      secretAccessKey: config.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY')!,
    },
  });
}
