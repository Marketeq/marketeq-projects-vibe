import { IsString, IsEnum, IsOptional, IsUrl, IsInt, Min, Max, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ContentType, ModerationAction } from '../entities/moderation-log.entity';

export class ModerateContentDto {
  @IsString()
  contentId: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  language?: string;
}

export class ModerateMediaDto {
  @IsString()
  contentId: string;

  @IsEnum(ContentType)
  contentType: ContentType;

  @IsUrl()
  mediaUrl: string;

  @IsEnum(['image', 'video'])
  mediaType: 'image' | 'video';
}

export class ReviewContentDto {
  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  moderatorId?: string;
}

export class LogsQueryDto {
  @IsEnum(ModerationAction)
  @IsOptional()
  status?: ModerationAction;

  @IsEnum(ContentType)
  @IsOptional()
  contentType?: ContentType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number = 20;
}

export class AddKeywordDto {
  @IsString()
  keyword: string;

  @IsString()
  @IsOptional()
  category?: string;
}
