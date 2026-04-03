import { Injectable, Logger } from '@nestjs/common';
import { strapi, getAllPages } from './strapi-client';
import { CONTENT_TYPES, ContentTypeConfig } from './content.types';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  // ---------- helpers ----------

  private isNotFound(err: any) {
    return err?.response?.status === 404;
  }

  /** Get Strapi numeric category id + attributes by UUID */
  async getCategoryByUuid(uuid: string) {
    const res = await strapi.get('categories', {
      params: {
        'filters[uuid][$eq]': uuid,
        'pagination[pageSize]': 1,
        fields: ['uuid', 'name', 'slug'],
      },
    });
    const row = res.data?.data?.[0];
    if (!row) return null;
    return { id: row.id, ...row.attributes };
  }

  // ---------- discovery ----------

  /** Count items per content-type referencing the category UUID */
  async countByCategory(categoryUuid: string) {
    const counts: Record<string, number> = {};
    for (const cfg of CONTENT_TYPES) {
      try {
        const items = await getAllPages<any>(cfg.api, {
          [`filters[${cfg.categoryField}][uuid][$eq]`]: categoryUuid,
        });
        counts[cfg.name] = items.length;
      } catch (e) {
        if (this.isNotFound(e)) {
          this.logger.warn(`Skipping ${cfg.name} (${cfg.api}): 404 Not Found`);
          counts[cfg.name] = 0;
        } else {
          this.logger.warn(`Skipping ${cfg.name} (${cfg.api}): ${((e as any)?.message) || e}`);
          counts[cfg.name] = 0;
        }
      }
    }
    return counts;
  }

  /** Preview sample items that would be reassigned */
  async preview(categoryUuid: string, limit = 20) {
    const preview: Record<string, Array<{ id: number; title: string }>> = {};
    for (const cfg of CONTENT_TYPES) {
      try {
        const items = await getAllPages<any>(cfg.api, {
          [`filters[${cfg.categoryField}][uuid][$eq]`]: categoryUuid,
          fields: ['title', 'name'],
        });
        preview[cfg.name] = items.slice(0, limit).map((it: any) => ({
          id: it.id,
          title: it.attributes?.title ?? it.attributes?.name ?? `#${it.id}`,
        }));
      } catch (e) {
        if (this.isNotFound(e)) {
          this.logger.warn(`Skipping ${cfg.name} (${cfg.api}): 404 Not Found`);
        } else {
          this.logger.warn(`Skipping ${cfg.name} (${cfg.api}): ${((e as any)?.message) || e}`);
        }
        preview[cfg.name] = [];
      }
    }
    return preview;
  }

  // ---------- reassignment ----------

  /** Reassign all content that references fromUuid → toUuid (via Strapi REST) */
  async reassignCategory(fromUuid: string, toUuid: string) {
    const from = await this.getCategoryByUuid(fromUuid);
    const to = await this.getCategoryByUuid(toUuid);
    if (!from) throw new Error(`Source category not found: ${fromUuid}`);
    if (!to) throw new Error(`Target category not found: ${toUuid}`);

    this.logger.log(`Reassigning content: ${fromUuid} (id=${from.id}) → ${toUuid} (id=${to.id})`);

    for (const cfg of CONTENT_TYPES) {
      await this.reassignForType(cfg, from.id, to.id);
    }

    this.logger.log('Reassignment completed.');
  }

  private async reassignForType(cfg: ContentTypeConfig, fromCatId: number, toCatId: number) {
    let items: any[] = [];
    try {
      // filter by relation id via nested filter [id][$eq]
      items = await getAllPages<any>(cfg.api, {
        [`filters[${cfg.categoryField}][id][$eq]`]: fromCatId,
        // ensure relation is present in response
        [`populate[${cfg.categoryField}]`]: 'id',
      });
    } catch (e) {
      if (this.isNotFound(e)) {
        this.logger.warn(`Skipping ${cfg.name} (${cfg.api}): 404 Not Found`);
        return;
      }
      throw e;
    }

    if (!items.length) {
      this.logger.log(`[${cfg.name}] No items to reassign.`);
      return;
    }

    const BATCH = 20;
    for (let i = 0; i < items.length; i += BATCH) {
      const chunk = items.slice(i, i + BATCH);

      await Promise.all(
        chunk.map(async (it: any) => {
          const id = it.id;

          if (cfg.relation === 'single') {
            // overwrite the single category
            await strapi.put(`${cfg.api}/${id}`, { data: { [cfg.categoryField]: toCatId } });
          } else {
            // many-to-many: replace old id with new id in the array
            const current = it.attributes?.[cfg.categoryField]?.data || [];
            const keep = current.map((r: any) => r.id).filter((x: number) => x !== fromCatId);
            const newIds = Array.from(new Set([...keep, toCatId]));
            await strapi.put(`${cfg.api}/${id}`, { data: { [cfg.categoryField]: newIds } });
          }
        }),
      );

      this.logger.log(
        `[${cfg.name}] Reassigned ${Math.min(i + BATCH, items.length)}/${items.length}`,
      );
    }
  }
}
