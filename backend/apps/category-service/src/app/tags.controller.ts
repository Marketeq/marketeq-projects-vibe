import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TagService } from './tag.service';

type TagDto = { uuid?: string | null; name: string; slug: string };

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  private readonly logger = new Logger(TagsController.name);

  constructor(private readonly service: TagService) {}

  /** CMS -> Nest upsert (or manual test) */
  @Post('sync')
  async sync(@Body() body: any) {
    this.logger.debug('Incoming Tag Sync Payload');

    if (body.event === 'entry.update') {
      this.logger.debug('Skipping update event (already handled on publish).');
      return { status: 'ignored', reason: 'update event skipped' };
    }

    const entry = body.entry ?? body.doc ?? body;

    const dto = {
      uuid: entry.uuid || entry.documentId,
      name: entry.name,
      slug: entry.slug,
    };

    if (!dto.uuid || !dto.name || !dto.slug) {
      this.logger.warn(`Missing tag fields for entry`);
      return { status: 'ignored', reason: 'missing required fields' };
    }

    await this.service.upsertFromCms(dto);
    return { status: 'ok', tag: dto };
  }

  /** Upsert locally, then push to CMS */
  @Post('push')
  async push(@Body() dto: TagDto) {
    await this.service.upsertFromCms(dto);
    const saved = await this.service.findBySlug(dto.slug);
    const result = await this.service.pushTagToCms(saved);
    return { status: 'ok', cmsId: result.id };
  }

  /** Create a dummy local tag and push it to CMS */
  @Post('push-test')
  async pushTest() {
    const t = await this.service.createAndPushDummyTag();
    return { status: 'ok', data: { uuid: t.uuid, slug: t.slug } };
  }

  /** Lookup a local tag by slug */
  @Get('slug/:slug')
  async bySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
}
