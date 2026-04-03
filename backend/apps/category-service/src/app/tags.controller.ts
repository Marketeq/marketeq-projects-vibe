import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TagService } from './tag.service';

type TagDto = { uuid?: string | null; name: string; slug: string };

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  private readonly logger = new Logger(TagsController.name);

  constructor(private readonly service: TagService) {}

  /** Strapi -> Nest upsert (or manual test) */
  @Post('sync')
  async sync(@Body() body: any) {
    this.logger.debug('Incoming Tag Sync Payload');

    // Skip intermediate update events (Strapi sends update + publish)
    if (body.event === 'entry.update') {
      this.logger.debug('Skipping update event (already handled on publish).');
      return { status: 'ignored', reason: 'update event skipped' };
    }

    const entry = body.entry || body;

    // Handle both uuid and documentId
    const dto = {
      uuid: entry.uuid || entry.documentId,
      name: entry.name,
      slug: entry.slug,
    };

    if (!dto.uuid || !dto.name || !dto.slug) {
      this.logger.warn(`Missing tag fields for entry`);
      return { status: 'ignored', reason: 'missing required fields' };
    }

    await this.service.upsertFromStrapi(dto);
    return { status: 'ok', tag: dto };
  }

  

  

  /** Upsert locally, then push to Strapi (create/update there) */
  @Post('push')
  async push(@Body() dto: TagDto) {
    await this.service.upsertFromStrapi(dto);
    const saved = await this.service.findBySlug(dto.slug);
    const result = await this.service.pushTagToStrapi(saved);
    return { status: 'ok', strapiId: result.id };
  }

  /** Create a dummy local tag and push it to Strapi */
  @Post('push-test')
  async pushTest() {
    const t = await this.service.createAndPushDummyTag();
    return { status: 'ok', data: { uuid: t.uuid, slug: t.slug } };
  }

  /** Lookup a local tag by slug (debug helper) */
  @Get('slug/:slug')
  async bySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }
}
