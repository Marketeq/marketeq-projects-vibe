import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  IsIn,
  IsDefined,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CmsValueItem {
  @IsString()
  value: string;
}

class CmsFaqItem {
  @IsString()
  question: string;

  // Payload delivers `answer` as a Lexical rich-text tree (object) once
  // the field flipped from textarea → richText. Accept either shape —
  // the service converts trees to HTML via lexicalToHtml() before storage.
  @IsOptional()
  answer: unknown;
}

class CmsMediaRef {
  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  filename?: string;
}

class CmsGalleryItem {
  @IsOptional()
  image?: CmsMediaRef | string | number | null;

  @IsOptional()
  @IsString()
  caption?: string;
}

class CmsVideoWalkthrough {
  @IsOptional()
  upload?: CmsMediaRef | string | number | null;

  @IsOptional()
  @IsString()
  externalUrl?: string;
}

class CmsRecentQuestion {
  @IsString()
  question: string;
}

class CmsSkillTool {
  @IsString()
  title: string;

  @IsOptional()
  icon?: CmsMediaRef | string | number | null;
}

/**
 * Payload CMS → listings-service project sync payload.
 *
 * Mirrors the shape of a Payload `projects` collection document plus the
 * resolved media URL fields that the cms-service hook attaches before
 * forwarding. Field names match the Payload collection at
 * backend/apps/cms-service/src/collections/Projects.ts so the editor's
 * mental model is preserved across services.
 */
export class ProjectSyncDto {
  // Payload numeric document id (stored as text in payloadId column).
  @IsDefined()
  id: number | string;

  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  shortDescription: string;

  // Payload richText is JSON; we accept any and stringify in the service.
  @IsOptional()
  fullDescription?: unknown;

  @IsOptional()
  deliverables?: unknown;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsFaqItem)
  faqQuestions?: CmsFaqItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsValueItem)
  categories?: CmsValueItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsValueItem)
  subcategories?: CmsValueItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsValueItem)
  tags?: CmsValueItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsValueItem)
  projectSkills?: CmsValueItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsValueItem)
  programmingLanguages?: CmsValueItem[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsValueItem)
  developmentTechnologies?: CmsValueItem[];

  @IsOptional()
  @IsNumber()
  totalEstimatedHours?: number;

  @IsOptional()
  @IsNumber()
  timelineValue?: number;

  @IsOptional()
  @IsString()
  timelineUnit?: string;

  @IsOptional()
  @IsNumber()
  priceRangeMin?: number;

  @IsOptional()
  @IsNumber()
  priceRangeMax?: number;

  @IsOptional()
  @IsString()
  pricingModel?: string;

  @IsOptional()
  @IsString()
  priceViewMode?: string;

  @IsOptional()
  @IsString()
  projectType?: string;

  @IsOptional()
  @IsBoolean()
  klarnaPaymentEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsRecentQuestion)
  recentQuestions?: CmsRecentQuestion[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsSkillTool)
  skillsAndTools?: CmsSkillTool[];

  @IsOptional()
  @IsBoolean()
  chatEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  reportButtonEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  shareButtonEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  helpButtonEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  // Payload draft state. We map both _status and status so the hook can
  // forward whichever shape is convenient.
  @IsOptional()
  @IsIn(['draft', 'published', 'flagged', 'archived'])
  _status?: 'draft' | 'published' | 'flagged' | 'archived';

  @IsOptional()
  @IsIn(['draft', 'published', 'flagged', 'archived'])
  status?: 'draft' | 'published' | 'flagged' | 'archived';

  // Resolved media URLs — the cms-service hook resolves Payload media
  // refs into absolute URLs before forwarding so the listings-service
  // does not need to talk back to Payload.
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryUrls?: string[];

  @IsOptional()
  @IsString()
  videoUrl?: string;

  // Raw Payload media refs (kept so the service can fall back if
  // thumbnailUrl/galleryUrls are absent).
  @IsOptional()
  thumbnail?: CmsMediaRef | string | number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsGalleryItem)
  gallery?: CmsGalleryItem[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CmsVideoWalkthrough)
  videoWalkthrough?: CmsVideoWalkthrough;

  @IsOptional()
  @IsString()
  createdAt?: string;

  @IsOptional()
  @IsString()
  updatedAt?: string;
}
