import { S3Client } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

export function createR2Client(config: ConfigService): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: config.get<string>('CLOUDFLARE_R2_ENDPOINT') || '',
    credentials: {
      accessKeyId: config.get<string>('CLOUDFLARE_R2_ACCESS_KEY_ID') || '',
      secretAccessKey: config.get<string>('CLOUDFLARE_R2_SECRET_ACCESS_KEY') || '',
    },
  });
}
