import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CategoryService } from './category.service';

/**
 * Doc-named endpoint: GET /tax-groups/affected-by-subtree/:oldParentUuid
 * Requires Strapi `taxonomy-groups` content-type + STRAPI_TOKEN for full data.
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
    const strapiUrl = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/+$/, '');
    const token = process.env.STRAPI_TOKEN || '';
    const url = `${strapiUrl}/api/taxonomy-groups?populate=*`;

    try {
      const res = await firstValueFrom(
        this.http.get(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          timeout: 15000,
        }),
      );
      const groups = res.data?.data || [];
      const affected = groups.filter((g: any) => {
        const attrs = g.attributes || g;
        const cats = attrs.categories?.data || attrs.categories || [];
        return cats.some((c: any) => {
          const u = c.attributes?.uuid ?? c.uuid;
          return u && subtree.includes(u);
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
        warning: e?.message || 'Could not load taxonomy-groups from Strapi (content-type or token missing).',
      };
    }
  }
}
