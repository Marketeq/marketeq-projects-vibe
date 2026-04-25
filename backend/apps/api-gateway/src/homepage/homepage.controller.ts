import { Controller, Get, Query, Headers, Req } from '@nestjs/common';
import { Request } from 'express';
import { HomepageService } from './homepage.service';
import { HomepagePayload } from './homepage.types';

// Alias routes:
// - /homepage is the canonical public homepage endpoint
// - /v1/homepage exists for legacy/frontend callers that assume v1 prefix
@Controller(['homepage', 'v1/homepage'])
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
  /** Max length for variant cookie to prevent cache-key churn */
  private static readonly VARIANT_MAX_LENGTH = 64;
  private static readonly VARIANT_PATTERN = /^[a-zA-Z0-9_-]+$/;

  /**
   * GET /homepage/health — lightweight health probe.
   * Returns 200 with `{ status, redis }` so liveness/readiness can verify
   * the homepage module + Redis dependency without triggering an assembly.
   */
  @Get('health')
  async getHealth() {
    return this.homepageService.healthCheck()
  }

  @Get()
  async getHomepage(
    @Req() req: Request,
    @Query('preview') preview?: string,
    @Headers('x-preview-token') previewToken?: string,
  ): Promise<HomepagePayload> {
    const rawVariant = (req as any).cookies?.mktq_hp_variant as string | undefined;

    // Sanitize variant: must be alphanumeric/dash/underscore and length-limited
    let variant: string | undefined;
    if (
      rawVariant &&
      rawVariant.length <= HomepageController.VARIANT_MAX_LENGTH &&
      HomepageController.VARIANT_PATTERN.test(rawVariant)
    ) {
      variant = rawVariant;
    }

    return this.homepageService.getHomepage({
      variant,
      preview: preview === '1',
      previewToken: previewToken || undefined,
    });
  }
}
