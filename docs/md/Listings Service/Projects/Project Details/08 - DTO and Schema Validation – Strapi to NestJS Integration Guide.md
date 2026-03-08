**DTO and Schema Validation -- Strapi to NestJS Integration Guide**

This document provides step-by-step instructions for validating incoming
data from Strapi in your NestJS Listings Microservice. It uses DTOs and
class-validator to ensure schema compatibility and prevent invalid data
from being saved to your production database.

## **Step 1: Define Your DTO for Project Updates**

Create the file:

apps/listings-service/src/project/dto/update-project-from-strapi.dto.ts



import {

IsString,

IsOptional,

IsArray,

IsEnum,

IsBoolean,

IsUUID,

IsNumber,

ValidateNested,

IsUrl,

MaxLength,

} from \'class-validator\';

import { Type } from \'class-transformer\';

class TaskDto {

\@IsString()

title: string;

\@IsString()

role_name: string;

\@IsString()

location: string;

\@IsEnum(\[\'Student\', \'Junior\', \'Medior\', \'Senior\', \'Guru\'\])

experience_level: string;

\@IsNumber()

estimated_hours: number;

}

class PhaseDto {

\@IsString()

phase_name: string;

\@IsNumber()

order: number;

\@IsArray()

\@ValidateNested({ each: true })

\@Type(() =\> TaskDto)

tasks: TaskDto\[\];

}

export class UpdateProjectFromStrapiDto {

\@IsUUID()

project_id: string;

\@IsString()

\@MaxLength(120)

title: string;

\@IsString()

\@MaxLength(300)

short_description: string;

\@IsString()

\@MaxLength(2000)

description: string;

\@IsArray()

\@IsString({ each: true })

categories: string\[\];

\@IsArray()

\@IsString({ each: true })

subcategories: string\[\];

\@IsArray()

\@IsString({ each: true })

industries: string\[\];

\@IsArray()

\@IsString({ each: true })

tags: string\[\];

\@IsArray()

\@IsString({ each: true })

skills: string\[\];

\@IsString()

\@IsUrl()

\@IsOptional()

video_url?: string;

\@IsEnum(\[\'draft\', \'in_review\', \'needs_update\', \'published\',
\'archived\'\])

status: string;

\@IsArray()

\@ValidateNested({ each: true })

\@Type(() =\> PhaseDto)

scope: PhaseDto\[\];

\@IsOptional()

\@IsString()

deliverables?: string;

\@IsOptional()

\@IsString()

seo_title?: string;

\@IsOptional()

\@IsString()

seo_description?: string;

}



## **Step 2: Use DTO in Your Strapi Sync Controller**

In your controller that receives webhook payloads from Strapi, use the
DTO like this:

@Post(\'strapi-sync\')

async handleStrapiWebhook(

\@Body() body: UpdateProjectFromStrapiDto

): Promise\<{ success: boolean }\> {

// Passes validation before reaching here

await this.projectService.updateFromStrapi(body);

return { success: true };

}

> ✅ This ensures strict type validation and prevents corrupted data
> from reaching your database.

## **Step 3: Extend DTO as Needed**

You can update this DTO as you add new fields in the future. Always
match the Strapi field types and frontend data requirements.
