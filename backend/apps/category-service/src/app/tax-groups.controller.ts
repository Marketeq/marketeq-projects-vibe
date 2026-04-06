import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CategoryService } from './category.service';

/**
 * Endpoint: GET /tax-groups/affected-by-subtree/:oldParentUuid
 * Fetches taxonomy-groups from CMS service (Payload CMS) that reference
 * categories in a given subtree.
 */
@ApiTags('Tax-Groups')
@Controller('tax-groups')
export class TaxGroupsController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly http: HttpService,
  ) {}

  @Get('affected-by-subtree/:oldParentUuid')
  @ApiOperation({ summary: 'Taxonomy groups that reference categories in a subtree' })
  async affectedBySubtree(@Param('oldParentUuid') oldParentUuid: string) {
    const subtree = await this.categoryService.getSubtreeUuids(oldParentUuid);
    const cmsUrl = (
      process.env.CMS_SERVICE_URL ||
      process.env.STRAPI_URL ||
      'http://localhost:3020'
    ).replace(/\/+$/, '');
    const apiKey = process.env.CMS_API_KEY || process.env.STRAPI_TOKEN || '';

    // Payload CMS REST: GET /api/taxonomy-groups?depth=2
    const url = `${cmsUrl}/api/taxonomy-groups?depth=2&limit=1000`;

    try {
      const headers: Record<string, string> = {};
      if (apiKey && process.env.CMS_API_KEY) {
        headers['Authorization'] = `API-Key ${apiKey}`;
      } else if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await firstValueFrom(
        this.http.get(url, {
          headers,
          timeout: 15000,
        }),
      );

      // Payload response: { docs: [...] }
      const groups = res.data?.docs ?? res.data?.data ?? [];

      const affected = groups.filter((g: any) => {
        const cats = g.categories ?? [];
        return cats.some((c: any) => {
          const uuid = typeof c === 'object' ? (c.uuid || String(c.id)) : String(c);
          return subtree.includes(uuid);
        });
      });

      return {
        oldParentUuid,
        subtreeCategoryUuids: subtree,
        affectedCount: affected.length,
        affected,
      };
    } catch (e: any) {
      return {
        oldParentUuid,
        subtreeCategoryUuids: subtree,
        affectedCount: 0,
        affected: [],
        warning: e?.message || 'Could not load taxonomy-groups from CMS (collection or API key missing).',
      };
    }
  }
}
