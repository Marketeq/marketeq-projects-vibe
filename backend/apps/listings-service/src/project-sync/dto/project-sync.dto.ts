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

// Project scope shape — mirrors docs/md/.../08 - DTO and Schema Validation
// PhaseDto / TaskDto with Payload's naming (roleName, experienceLevel,
// estimatedHours). One Phase contains N Tasks; pricing, duration,
// deliverables and skill derivation all read from this tree.
class CmsScopeTask {
  @IsString()
  title: string;

  @IsString()
  roleName: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsIn(['Student', 'Junior', 'Medior', 'Senior', 'Guru'])
  experienceLevel: string;

  @IsNumber()
  estimatedHours: number;
}

class CmsScopePhase {
  @IsString()
  phaseName: string;

  @IsNumber()
  order: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsScopeTask)
  tasks: CmsScopeTask[];
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

  // Computed fields populated by the CMS beforeChange hook (see
  // cms-service/src/hooks/beforeChange/computeProjectFields.ts).
  //
  // Per docs §13 Frontend Integration L58 / L62 the frontend reads the
  // UI "Date Published" label from `createdAt` and "Project Duration"
  // from `duration`. We forward the CMS-derived values into those same
  // columns so there's a single frontend read path — no schema change
  // required.
  @IsOptional()
  @IsString()
  datePublished?: string;

  @IsOptional()
  @IsNumber()
  projectDurationTotal?: number;

  @IsOptional()
  @IsString()
  projectDurationLabel?: string;

  // Scope tree authored in CMS. Drives pricing, duration, deliverables
  // AI, and skills derivation per spec §01 / §08.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsScopePhase)
  scope?: CmsScopePhase[];

  // Industries — distinct from categories, rendered as "industry badges"
  // on the details page per doc §13 L52. Array of {value} from CMS.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CmsValueItem)
  industries?: CmsValueItem[];

  // Editor-curated related projects (M2M self-ref). Payload sends as
  // an array of project IDs (numbers) or populated docs depending on
  // depth.
  @IsOptional()
  relatedProjects?: unknown;

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
