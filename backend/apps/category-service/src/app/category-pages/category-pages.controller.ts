import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  Logger,
  BadRequestException,
  Headers,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiOkResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { CategoryPagesService } from './category-pages.service';
import { clampLimit } from './utils/cursor.utils';
import { ServiceAuthGuard } from '../../guards/service-auth.guard';

@ApiTags('Category Pages')
@Controller('category-pages')
export class CategoryPagesController {
  private readonly logger = new Logger(CategoryPagesController.name);

  constructor(private readonly categoryPagesService: CategoryPagesService) {}

  @Post('cms-sync')
  @UseGuards(ServiceAuthGuard)
  @ApiOperation({ summary: 'Webhook for CMS (Payload) category/tag sync' })
  async handleCmsSync(@Body() body: any) {
    this.logger.log(`Full webhook payload: ${JSON.stringify(body, null, 2)}`);

    if (!body) {
      this.logger.error('Webhook payload missing');
      throw new BadRequestException('Invalid CMS webhook payload');
    }

    // Support both legacy (model + entry) and Payload-style (collection + doc)
    const model = body.model
      || body.collection
      || (body.uid && body.uid.split('::')[1]?.split('.')[0]);

    if (!model) {
      this.logger.error('Could not detect model type in webhook:', body);
      throw new BadRequestException('Invalid CMS webhook payload');
    }

    this.logger.log(`Webhook received for model: ${model}`);

    // Payload sends `doc` instead of `entry`
    const doc = body.entry ?? body.doc ?? body;

    if (model === 'category' || model === 'categories') {
      await this.categoryPagesService.upsertCategory(doc);
      return { status: 'success', message: `Category ${doc?.name} synced` };
    }

    if (model === 'tag' || model === 'tags') {
      if (this.categoryPagesService.upsertTag) {
        await this.categoryPagesService.upsertTag(doc);
        return { status: 'success', message: `Tag ${doc?.name} synced` };
      }
    }

    return { status: 'ignored', reason: `Model '${model}' not handled` };
  }

  // L1 Route Handler
  @Get(':l1')
  @ApiOperation({
    summary: 'Get L1 Category Page',
    description: 'Returns root level category page with metadata, navigation, dynamic content blocks, and suggestions',
  })
  @ApiParam({
    name: 'l1',
    description: 'L1 category slug (root level)',
    example: 'creative',
    type: String,
  })
  @ApiQuery({
    name: 'kind',
    description: 'Filter blocks by entity type',
    required: false,
    enum: ['show-all', 'projects', 'services', 'teams', 'talent'],
    example: 'show-all',
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Pagination cursor (opaque base64url token)',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items per block (max 10)',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'preview',
    description:
      'Set to 1 to preview unpublished categories (Endpoint Catalog). If PREVIEW_TOKEN is set, also send header x-preview-token.',
    required: false,
    enum: ['1'],
  })
  @ApiOkResponse({
    description: 'Category page data retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
  })
  async getCategoryPageL1(
    @Param('l1') l1: string,
    @Query('kind') kind?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitRaw?: string,
    @Query('preview') previewRaw?: string,
    @Headers('x-preview-token') xPreviewToken?: string,
  ) {
    return this.handleCategoryPageRequest(
      [l1],
      kind,
      cursor,
      limitRaw,
      previewRaw,
      xPreviewToken,
    );
  }

  // L2 Route Handler
  @Get(':l1/:l2')
  @ApiOperation({
    summary: 'Get L2 Category Page',
    description: 'Returns child category page with metadata, navigation, dynamic content blocks, and suggestions',
  })
  @ApiParam({
    name: 'l1',
    description: 'L1 category slug (parent)',
    example: 'creative',
    type: String,
  })
  @ApiParam({
    name: 'l2',
    description: 'L2 category slug (child)',
    example: 'ui-design',
    type: String,
  })
  @ApiQuery({
    name: 'kind',
    description: 'Filter blocks by entity type',
    required: false,
    enum: ['show-all', 'projects', 'services', 'teams', 'talent'],
    example: 'show-all',
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Pagination cursor',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per block (max 10)',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'preview',
    description:
      'Set to 1 to preview unpublished categories (Endpoint Catalog). If PREVIEW_TOKEN is set, also send header x-preview-token.',
    required: false,
    enum: ['1'],
  })
  @ApiOkResponse({
    description: 'Category page data retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
  })
  async getCategoryPageL2(
    @Param('l1') l1: string,
    @Param('l2') l2: string,
    @Query('kind') kind?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitRaw?: string,
    @Query('preview') previewRaw?: string,
    @Headers('x-preview-token') xPreviewToken?: string,
  ) {
    return this.handleCategoryPageRequest(
      [l1, l2],
      kind,
      cursor,
      limitRaw,
      previewRaw,
      xPreviewToken,
    );
  }

  // L3 Route Handler
  @Get(':l1/:l2/:l3')
  @ApiOperation({
    summary: 'Get L3 Category Page',
    description: 'Returns grandchild category page with metadata, navigation, dynamic content blocks, and suggestions',
  })
  @ApiParam({
    name: 'l1',
    description: 'L1 category slug',
    example: 'creative',
    type: String,
  })
  @ApiParam({
    name: 'l2',
    description: 'L2 category slug',
    example: 'ui-design',
    type: String,
  })
  @ApiParam({
    name: 'l3',
    description: 'L3 category slug',
    example: 'mobile-ui',
    type: String,
  })
  @ApiQuery({
    name: 'kind',
    description: 'Filter blocks by entity type',
    required: false,
    enum: ['show-all', 'projects', 'services', 'teams', 'talent'],
    example: 'show-all',
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Pagination cursor',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Items per block (max 10)',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'preview',
    description:
      'Set to 1 to preview unpublished categories (Endpoint Catalog). If PREVIEW_TOKEN is set, also send header x-preview-token.',
    required: false,
    enum: ['1'],
  })
  @ApiOkResponse({
    description: 'Category page data retrieved successfully',
  })
  @ApiNotFoundResponse({
    description: 'Category not found',
  })
  async getCategoryPageL3(
    @Param('l1') l1: string,
    @Param('l2') l2: string,
    @Param('l3') l3: string,
    @Query('kind') kind?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitRaw?: string,
    @Query('preview') previewRaw?: string,
    @Headers('x-preview-token') xPreviewToken?: string,
  ) {
    return this.handleCategoryPageRequest(
      [l1, l2, l3],
      kind,
      cursor,
      limitRaw,
      previewRaw,
      xPreviewToken,
    );
  }

  // Private helper - shared logic for all routes
  private handleCategoryPageRequest(
    slugParts: string[],
    kind?: string,
    cursor?: string,
    limitRaw?: string,
    previewRaw?: string,
    xPreviewToken?: string,
  ) {
    const limit = clampLimit(limitRaw ? parseInt(limitRaw) : undefined, 10);

    // Endpoint Catalog: ?preview=1 bypasses published-only gate for admin flows.
    // Optional: set PREVIEW_TOKEN to require matching x-preview-token (extra lock in shared envs).
    let allowPreview = false;
    if (previewRaw === '1') {
      const secret = process.env.PREVIEW_TOKEN?.trim();
      if (secret) {
        if (xPreviewToken !== secret) {
          throw new ForbiddenException('Invalid or missing x-preview-token for preview');
        }
        allowPreview = true;
      } else {
        allowPreview = true;
      }
    }

    this.logger.log(
      `GET request for category page: ${slugParts.join('/')}, kind: ${kind || 'show-all'}, cursor: ${cursor || 'none'}, limit: ${limit}`
    );

    return this.categoryPagesService.getCategoryPageBySlugPath(slugParts, {
      kind: (kind as any) || 'show-all',
      cursor,
      limit,
      allowPreview,
    });
  }
}
