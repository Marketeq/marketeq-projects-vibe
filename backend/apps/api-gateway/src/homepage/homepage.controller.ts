import { Controller, Get, Query, Headers } from '@nestjs/common';
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
   * Query params (CMS integration — currently ignored, ready for wiring):
   *   ?preview=1          Bypass cache, return draft content (requires x-preview-token header)
   *   Cookie: mktq_hp_variant=<variant>  Serve A/B test variant
   *
   * When CMS homepage collection is implemented, pass these to
   * HomepageService.getHomepage({ preview, variant }) for variant resolution.
   */
  @Get()
  async getHomepage(
    @Query('preview') _preview?: string,
    @Headers('x-preview-token') _previewToken?: string,
  ): Promise<HomepagePayload> {
    // TODO: When CMS homepage collection is ready:
    // 1. Parse mktq_hp_variant cookie for A/B variant
    // 2. If preview=1 && valid previewToken, fetch draft homepage from CMS
    // 3. Pass variant/preview to service for CMS document resolution
    // 4. Implement Redis caching with key hp:{slug}:{variant} and 300s TTL
    return this.homepageService.getHomepage();
  }
}
