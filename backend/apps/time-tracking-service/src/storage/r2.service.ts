import { BadRequestException, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type S3ClientInstance = InstanceType<typeof S3Client>;
type PutParams = ConstructorParameters<typeof PutObjectCommand>[0];
type GetParams = ConstructorParameters<typeof GetObjectCommand>[0];

@Injectable()
export class R2Service {
  private s3: S3ClientInstance | null = null;

  private get bucket()    { return process.env.R2_BUCKET    || ''; }
  private get endpoint()  { return process.env.R2_ENDPOINT  || ''; }
  private get accessKey() { return process.env.R2_ACCESS_KEY || ''; }
  private get secretKey() { return process.env.R2_SECRET_KEY || ''; }
  private get expires()   { return Number(process.env.PRESIGN_EXPIRES_SECONDS || 600); }

  missingEnv() {
    return {
      R2_BUCKET:     !!this.bucket,
      R2_ENDPOINT:   !!this.endpoint,
      R2_ACCESS_KEY: !!this.accessKey,
      R2_SECRET_KEY: !!this.secretKey,
    };
  }

  private ensureConfigured() {
    const m = this.missingEnv();
    if (m.R2_BUCKET && m.R2_ENDPOINT && m.R2_ACCESS_KEY && m.R2_SECRET_KEY) return;
    const missing = Object.fromEntries(Object.entries(m).filter(([, ok]) => !ok));
    throw new BadRequestException({ message: 'R2 is not configured', missing });
  }

  private async ensureAws() {
    if (this.s3) return;
    this.ensureConfigured();
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: { accessKeyId: this.accessKey, secretAccessKey: this.secretKey },
      forcePathStyle: true,
    });
  }

  async presignPut(key: string, contentType = 'image/jpeg') {
    await this.ensureAws();
    const params: PutParams = { Bucket: this.bucket, Key: key, ContentType: contentType };
    const cmd = new PutObjectCommand(params);
    const url = await getSignedUrl(this.s3!, cmd, { expiresIn: this.expires });
    const publicUrlBase = process.env.R2_PUBLIC_BASE;
    const publicUrl = publicUrlBase ? `${publicUrlBase}/${key}` : undefined;
    return { url, key, expiresIn: this.expires, publicUrl };
  }

  async presignGet(key: string, expires = this.expires) {
    await this.ensureAws();
    const params: GetParams = { Bucket: this.bucket, Key: key };
    const cmd = new GetObjectCommand(params);
    const url = await getSignedUrl(this.s3!, cmd, { expiresIn: expires });
    return { url, key, expiresIn: expires };
  }
}
