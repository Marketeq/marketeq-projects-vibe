import { Controller, Get, Query, Headers, Req } from '@nestjs/common';
import { Request } from 'express';
import { HomepageService } from './homepage.service';
import { HomepagePayload } from './homepage.types';

@Controller('homepage')
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  /**
   * GET /homepage
   *
   * Returns the fully assembled homepage payload.
   * Public endpoint — no auth required.
   *
   * Query params:
   *   ?preview=1  Bypass cache, return draft content (requires x-preview-token)
   *
   * Cookies:
   *   mktq_hp_variant=<group>  Serve A/B test variant matching testGroup
   */
  @Get()
  async getHomepage(
    @Req() req: Request,
    @Query('preview') preview?: string,
    @Headers('x-preview-token') previewToken?: string,
  ): Promise<HomepagePayload> {
    const variant = (req as any).cookies?.mktq_hp_variant as string | undefined;

    return this.homepageService.getHomepage({
      variant: variant || undefined,
      preview: preview === '1',
      previewToken: previewToken || undefined,
    });
  }
}
