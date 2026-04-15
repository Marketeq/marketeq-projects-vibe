import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  Query,
  Logger,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CategoryDto } from './dto/category.dto';
import { ContentService } from '../content/content.service';
import { ServiceAuthGuard } from '../guards/service-auth.guard';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {

      @Get('/health')
      health() {
        return { status: 'ok', service: 'category-service', time: new Date().toISOString() };
      }
    @Get(':uuid')
    async getByUuid(@Param('uuid') uuid: string) {
      return this.service.findByUuid(uuid);
    }
  private readonly logger = new Logger(CategoryController.name);

  constructor(
    private readonly service: CategoryService,
    private readonly content: ContentService,
  ) {}

  @Post('sync')
  @UseGuards(ServiceAuthGuard)
  async sync(@Body() dto: CategoryDto) {
    await this.service.syncFromCms(dto);
    return { status: 'ok' };
  }

  @Post('push-test')
  @UseGuards(ServiceAuthGuard)
  async pushTest() {
    const res = await this.service.createAndPushDummyCategory();
    return { status: 'ok', data: { uuid: res.uuid, slug: res.slug } };
  }

  @Post('push')
  @UseGuards(ServiceAuthGuard)
  async push(@Body() dto: CategoryDto) {
    await this.service.syncFromCms(dto);
    const saved = await this.service.findBySlug(dto.slug);
    const pushed = await this.service.pushCategoryToCms(saved);
    return { status: 'ok', cmsId: pushed.id };
  }

  @Post('user')
  @UseGuards(ServiceAuthGuard)
  async createUserDocAlias(@Body() body: { name: string; parentUuid: string }) {
    const saved = await this.service.createUserSubcategory(body.name, body.parentUuid);
    return {
      status: 'ok',
      data: { uuid: saved.uuid, slug: saved.slug, parent: saved.parent?.uuid ?? null },
    };
  }

  @Post('user-subcategory')
  @UseGuards(ServiceAuthGuard)
  async createUserSubcategory(@Body() body: { name: string; parentUuid: string }) {
    const saved = await this.service.createUserSubcategory(body.name, body.parentUuid);
    return {
      status: 'ok',
      data: { uuid: saved.uuid, slug: saved.slug, parent: saved.parent?.uuid ?? null },
    };
  }

  @Post('user-subcategory/moderated')
  @UseGuards(ServiceAuthGuard)
  async createUserSubcategoryModerated(@Body() body: { name: string; parentUuid?: string }) {
    const saved = await this.service.createUserSubcategoryModerated(body.name, body.parentUuid);
    return {
      status: 'ok',
      data: { uuid: saved.uuid, slug: saved.slug, parent: saved.parent?.uuid ?? null },
    };
  }

  @Post('cms/delete')
  @UseGuards(ServiceAuthGuard)
  async handleCmsDelete(@Body() payload: any) {
    const { status, reason } = await this.service.handleCmsDeleteWebhook(payload);
    return { status, reason };
  }

  /**
   * Reassign all direct children from old parent to new parent (by UUID).
   * Accepts: { parentUuid, newParentUuid } or { oldParentUuid, newParentUuid }
   */
  @Post('reassigned')
  @UseGuards(ServiceAuthGuard)
  @ApiOperation({ summary: 'Reassign all children of one parent to another parent (by UUID)' })
  async reassignChildren(@Body() body: Record<string, unknown>) {
    const data = (body?.data ?? body) as Record<string, unknown>;
    const parentUuid = (
      (typeof body?.parentUuid === 'string' ? body.parentUuid : null) ||
      (typeof body?.oldParentUuid === 'string' ? body.oldParentUuid : null) ||
      (typeof data?.oldParentUuid === 'string' ? data.oldParentUuid : null)
    )?.trim();
    const newParentUuid = (
      (typeof body?.newParentUuid === 'string' ? body.newParentUuid : null) ||
      (typeof data?.newParentUuid === 'string' ? data.newParentUuid : null)
    )?.trim();

    if (!parentUuid || !newParentUuid) {
      throw new BadRequestException(
        'Provide parentUuid and newParentUuid (or oldParentUuid and newParentUuid)',
      );
    }
    const { updated } = await this.service.reassignChildrenToParent(parentUuid, newParentUuid);
    return { status: 'ok', updated };
  }

  @Get()
  @ApiOperation({ summary: 'List all categories' })
  findAll() {
    return this.service.findAll();
  }

  @Get('tree')
  @ApiOperation({ summary: 'Category tree (optionally rooted at parentUuid)' })
  getTree(@Query('parentUuid') parentUuid?: string) {
    if (parentUuid === undefined || parentUuid === '') {
      return this.service.getCategoryTree(null);
    }
    return this.service.getCategoryTree(parentUuid);
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Get('test-cms')
  async testCms() {
    return this.service.testCmsConnection();
  }

  @Get('test-delete/:uuid')
  async testDelete(
    @Param('uuid') uuid: string,
    @Query('reassignTo') reassignTo?: string,
  ) {
    return {
      uuid,
      reassignTo,
      message: 'This would delete the category',
      willWork: !!reassignTo,
    };
  }

  @Get(':uuid/breadcrumbs')
  @ApiOperation({ summary: 'Breadcrumb chain for a category UUID' })
  getBreadcrumbs(@Param('uuid') uuid: string) {
    return this.service.getBreadcrumbs(uuid);
  }

  @Get(':uuid/delete-dry-run')
  @ApiOperation({ summary: 'Dry-run delete impact (no DB changes)' })
  deleteDryRun(@Param('uuid') uuid: string, @Query('reassignTo') reassignTo?: string) {
    return this.service.deleteDryRun(uuid, reassignTo);
  }

  @Get(':uuid/reassign/preview')
  async preview(@Param('uuid') uuid: string) {
    const counts = await this.content.countByCategory(uuid);
    const sample = await this.content.preview(uuid, 20);
    return { counts, sample };
  }

  @Post(':uuid/reassign')
  @UseGuards(ServiceAuthGuard)
  async reassign(@Param('uuid') from: string, @Query('to') to: string) {
    await this.content.reassignCategory(from, to);
    return { status: 'ok' };
  }

  @Delete(':uuid')
  @UseGuards(ServiceAuthGuard)
  async deleteCategory(
    @Param('uuid') uuid: string,
    @Query('reassignTo') reassignTo?: string,
  ) {
    this.logger.log(`DELETE request: uuid=${uuid}, reassignTo=${reassignTo || 'none'}`);
    return this.service.deleteCategory(uuid, reassignTo);
  }

  @Post(':uuid/delete')
  @UseGuards(ServiceAuthGuard)
  async deleteCategoryPost(
    @Param('uuid') uuid: string,
    @Body('reassignTo') reassignTo?: string,
  ) {
    return this.service.deleteCategory(uuid, reassignTo);
  }
}
