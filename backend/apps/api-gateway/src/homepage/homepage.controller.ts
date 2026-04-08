import { Controller, Get } from '@nestjs/common';
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
   * CMS placeholder: currently uses static section config.
   * When Payload CMS is integrated, add optional query params:
   *   ?preview=1  (with x-preview-token header)
   *   Cookie: mktq_hp_variant=<variant>  (A/B test)
   */
  @Get()
  async getHomepage(): Promise<HomepagePayload> {
    return this.homepageService.getHomepage();
  }
}
