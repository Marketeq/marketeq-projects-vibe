import { IsIn, IsInt, IsString, Max, MaxLength } from 'class-validator';

export class PresignBriefUploadDto {
  @IsString()
  @MaxLength(255)
  filename: string;

  // Only PDF and DOCX are accepted.
  @IsIn([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ])
  contentType: string;

  // Max 25 MB enforced here and at the R2 presign level.
  @IsInt()
  @Max(26_214_400) // 25 MB in bytes
  sizeBytes: number;
}
