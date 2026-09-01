import { BadRequestException } from '@nestjs/common';
import { CASE_STUDY_BLOCK_TYPES, CaseStudyBlockType } from '../entities/case-study-block.entity';

export const MAX_BLOCKS_PER_CASE_STUDY = 50;
export const MAX_SCHEMA_JSON_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_PARAGRAPH_CHARS = 5000;
export const MAX_RESULTS_METRICS = 6;
export const MAX_GALLERY_IMAGES = 12;
export const MAX_INTERVIEW_ITEMS = 20;
export const MAX_PROCESS_STEPS = 10;
export const MAX_CUSTOMER_JOURNEY_STAGES = 10;
export const MAX_TESTIMONIAL_ITEMS = 10;
export const MAX_CUSTOM_COLUMNS = 4;

interface SchemaBlock {
  type: string;
  data: Record<string, any>;
}

function requireNonEmptyString(value: unknown, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException(`Block missing required field: ${field}`);
  }
}

/**
 * A block a user just added to a draft (via "+ Add Section" or "Use a
 * Template") starts out with no content — no title typed, no image
 * uploaded yet. Draft autosaves must tolerate that; only shape/type needs
 * to be right here. Completeness (non-empty content) belongs at publish
 * time, not on every autosave.
 */
function assertStringIfPresent(value: unknown, field: string): void {
  if (value !== undefined && value !== null && typeof value !== 'string') {
    throw new BadRequestException(`Field "${field}" must be a string`);
  }
}

function assertArrayIfPresent(value: unknown, field: string, max: number): any[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new BadRequestException(`Field "${field}" must be an array`);
  }
  if (value.length > max) {
    throw new BadRequestException(`Field "${field}" exceeds maximum of ${max} items`);
  }
  return value;
}

function validateBlockData(block: SchemaBlock, index: number): void {
  const { type, data } = block;

  if (!data || typeof data !== 'object') {
    throw new BadRequestException(`Block ${index} (${type}) is missing data`);
  }

  switch (type as CaseStudyBlockType) {
    case 'hero':
      requireNonEmptyString(data.title, 'title');
      break;

    case 'results': {
      if (!Array.isArray(data.metrics) || data.metrics.length === 0) {
        throw new BadRequestException(`Block ${index} (results) requires at least one metric`);
      }
      if (data.metrics.length > MAX_RESULTS_METRICS) {
        throw new BadRequestException(`Block ${index} (results) exceeds maximum of ${MAX_RESULTS_METRICS} metrics`);
      }
      for (const metric of data.metrics) {
        requireNonEmptyString(metric?.value, 'metric value');
        requireNonEmptyString(metric?.label, 'metric label');
      }
      break;
    }

    case 'gallery': {
      assertArrayIfPresent(data.images, 'images', MAX_GALLERY_IMAGES);
      break;
    }

    case 'testimonial': {
      const items = assertArrayIfPresent(data.items, 'items', MAX_TESTIMONIAL_ITEMS);
      for (const item of items) {
        assertStringIfPresent(item?.quoteHtml, 'quoteHtml');
        assertStringIfPresent(item?.authorHtml, 'authorHtml');
      }
      break;
    }

    case 'before-after':
      requireNonEmptyString(data.beforeImage, 'beforeImage');
      requireNonEmptyString(data.afterImage, 'afterImage');
      break;

    case 'text-paragraph':
      requireNonEmptyString(data.content, 'content');
      if (data.content.length > MAX_PARAGRAPH_CHARS) {
        throw new BadRequestException(`Block ${index} (text-paragraph) exceeds maximum of ${MAX_PARAGRAPH_CHARS} characters`);
      }
      break;

    case 'introduction':
    case 'challenges':
    case 'image-text':
      assertStringIfPresent(data.titleHtml, 'titleHtml');
      assertStringIfPresent(data.bodyHtml, 'bodyHtml');
      break;

    case 'bold-statement':
      assertStringIfPresent(data.html, 'html');
      break;

    case 'conclusion':
      assertStringIfPresent(data.titleHtml, 'titleHtml');
      assertStringIfPresent(data.bodyHtml, 'bodyHtml');
      break;

    case 'interview': {
      assertStringIfPresent(data.titleHtml, 'titleHtml');
      assertStringIfPresent(data.bodyHtml, 'bodyHtml');
      const items = assertArrayIfPresent(data.items, 'items', MAX_INTERVIEW_ITEMS);
      for (const item of items) {
        assertStringIfPresent(item?.questionHtml, 'questionHtml');
        assertStringIfPresent(item?.answerHtml, 'answerHtml');
      }
      break;
    }

    case 'big-image':
      assertStringIfPresent(data.url, 'url');
      break;

    case 'process': {
      assertStringIfPresent(data.titleHtml, 'titleHtml');
      assertStringIfPresent(data.bodyHtml, 'bodyHtml');
      const steps = assertArrayIfPresent(data.steps, 'steps', MAX_PROCESS_STEPS);
      for (const step of steps) {
        assertStringIfPresent(step?.titleHtml, 'titleHtml');
        assertStringIfPresent(step?.bodyHtml, 'bodyHtml');
      }
      break;
    }

    case 'personas':
      assertStringIfPresent(data.nameHtml, 'nameHtml');
      assertStringIfPresent(data.roleHtml, 'roleHtml');
      assertStringIfPresent(data.aboutHtml, 'aboutHtml');
      assertStringIfPresent(data.goalsHtml, 'goalsHtml');
      assertStringIfPresent(data.frustrationsHtml, 'frustrationsHtml');
      break;

    case 'video':
      assertStringIfPresent(data.videoUrl, 'videoUrl');
      break;

    case 'customer-journey': {
      assertStringIfPresent(data.titleHtml, 'titleHtml');
      assertStringIfPresent(data.bodyHtml, 'bodyHtml');
      const stages = assertArrayIfPresent(data.stages, 'stages', MAX_CUSTOMER_JOURNEY_STAGES);
      for (const stage of stages) {
        assertStringIfPresent(stage?.titleHtml, 'titleHtml');
        assertStringIfPresent(stage?.bodyHtml, 'bodyHtml');
      }
      break;
    }

    case 'results-metrics': {
      const metrics = assertArrayIfPresent(data.metrics, 'metrics', MAX_RESULTS_METRICS);
      for (const metric of metrics) {
        assertStringIfPresent(metric?.value, 'metric value');
        assertStringIfPresent(metric?.label, 'metric label');
      }
      break;
    }

    case 'prototype':
      assertStringIfPresent(data.url, 'url');
      break;

    case 'custom-columns': {
      assertStringIfPresent(data.titleHtml, 'titleHtml');
      const columns = assertArrayIfPresent(data.columns, 'columns', MAX_CUSTOM_COLUMNS);
      for (const column of columns) {
        assertStringIfPresent(column?.titleHtml, 'titleHtml');
        assertStringIfPresent(column?.bodyHtml, 'bodyHtml');
      }
      break;
    }

    default:
      throw new BadRequestException(`Unknown block type at index ${index}: ${type}`);
  }
}

/**
 * Validates a case study schemaJson payload (Editor.js-style { blocks: [...] } shape).
 * Throws BadRequestException on the first violation found.
 */
export function validateSchemaJson(schema: unknown): SchemaBlock[] {
  if (!schema || typeof schema !== 'object' || !Array.isArray((schema as any).blocks)) {
    throw new BadRequestException('Invalid schemaJson: expected an object with a "blocks" array');
  }

  const sizeBytes = Buffer.byteLength(JSON.stringify(schema), 'utf8');
  if (sizeBytes > MAX_SCHEMA_JSON_BYTES) {
    throw new BadRequestException('Case study content exceeds the 2MB size limit');
  }

  const blocks: SchemaBlock[] = (schema as any).blocks;

  if (blocks.length > MAX_BLOCKS_PER_CASE_STUDY) {
    throw new BadRequestException(`Maximum ${MAX_BLOCKS_PER_CASE_STUDY} blocks per case study`);
  }

  blocks.forEach((block, index) => {
    if (!block || typeof block.type !== 'string') {
      throw new BadRequestException(`Block ${index} is missing a type`);
    }
    if (!CASE_STUDY_BLOCK_TYPES.includes(block.type as CaseStudyBlockType)) {
      throw new BadRequestException(`Invalid block type at index ${index}: ${block.type}`);
    }
    validateBlockData(block, index);
  });

  return blocks;
}
