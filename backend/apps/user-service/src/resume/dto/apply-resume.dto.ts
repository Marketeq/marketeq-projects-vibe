import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResumeSkillDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  proficiency?: string;
}

export class ResumeEducationDto {
  @IsString()
  school: string;

  @IsString()
  degree: string;

  @IsOptional()
  @IsString()
  fieldOfStudy?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  startYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  startMonth?: number;

  @IsOptional()
  @IsInt()
  endYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  endMonth?: number;

  @IsOptional()
  @IsBoolean()
  currentlyStudying?: boolean;
}

export class ResumeExperienceDto {
  @IsString()
  title: string;

  @IsString()
  company: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isCurrentRole?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ResumeCertificationDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  issuer?: string;

  @IsOptional()
  @IsString()
  issueDate?: string;

  @IsOptional()
  @IsString()
  expirationDate?: string;
}

export class ConflictResolutionDto {
  @IsString()
  entityType: 'education' | 'work' | 'certification';

  @IsString()
  existingId: string;

  @IsBoolean()
  applyUpdate: boolean;
}

export class ResumeIndustryDto {
  @IsString()
  name: string;
}

export class ApplyResumeDto {
  @IsOptional()
  @IsString()
  parseResultId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeSkillDto)
  skills?: ResumeSkillDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeEducationDto)
  education?: ResumeEducationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeExperienceDto)
  workExperience?: ResumeExperienceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeCertificationDto)
  certifications?: ResumeCertificationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeIndustryDto)
  industries?: ResumeIndustryDto[];

  @IsOptional()
  @IsBoolean()
  replaceConflicts?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConflictResolutionDto)
  conflictResolutions?: ConflictResolutionDto[];
}
