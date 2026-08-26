import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { createR2Client } from '../config/r2.config';
import { PresignBriefUploadDto } from '../dto/presign-brief-upload.dto';

@Injectable()
export class JobListingBriefStorageService {
  private readonly logger = new Logger(JobListingBriefStorageService.name);
  private readonly r2Client: S3Client;

  constructor(private readonly config: ConfigService) {
    this.r2Client = createR2Client(config);
  }

  async createPresignedUpload(
    listingId: string,
    dto: PresignBriefUploadDto,
  ): Promise<{ presignedUrl: string; key: string; expiresAt: string }> {
    const sanitisedFilename = dto.filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 200);

    const key = `briefs/${listingId}/${uuidv4()}/${sanitisedFilename}`;

    const command = new PutObjectCommand({
      Bucket: this.config.get('CLOUDFLARE_R2_BUCKET'),
      Key: key,
      ContentType: dto.contentType,
      ContentLength: dto.sizeBytes,
    });

    const presignedUrl = await getSignedUrl(this.r2Client, command, {
      expiresIn: 300,
    });

    this.logger.log(`jl_brief_presign_issued listingId=${listingId}`);

    return {
      presignedUrl,
      key,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
    };
  }
}
