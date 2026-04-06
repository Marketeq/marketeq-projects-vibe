import { Injectable, Logger } from '@nestjs/common';
import { cmsClient, getAllPages } from './strapi-client';
import { CONTENT_TYPES, ContentTypeConfig } from './content.types';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  private isNotFound(err: any) {
    return err?.response?.status === 404;
  }

  /** Get Payload CMS category doc by slug */
  async getCategoryBySlug(slug: string) {
    const res = await cmsClient.get('categories', {
      params: {
        'where[slug][equals]': slug,
        limit: 1,
      },
    });
    const doc = res.data?.docs?.[0];
    if (!doc) return null;
    return { id: doc.id, ...doc };
  }

  /** Get Payload CMS category doc by ID */
  async getCategoryById(id: string | number) {
    try {
      const res = await cmsClient.get(`categories/${id}`);
      return res.data;
    } catch (e) {
      if (this.isNotFound(e)) return null;
      throw e;
    }
  }

  // ---------- discovery ----------

  /** Count items per content-type referencing the category ID */
  async countByCategory(categoryId: string) {
    const counts: Record<string, number> = {};
    for (const cfg of CONTENT_TYPES) {
      try {
        const res = await cmsClient.get(cfg.api, {
          params: {
            [`where[${cfg.categoryField}][equals]`]: categoryId,
            limit: 0,
          },
        });
        counts[cfg.name] = res.data?.totalDocs ?? 0;
      } catch (e) {
        if (this.isNotFound(e)) {
          this.logger.warn(`Skipping ${cfg.name} (${cfg.api}): 404 Not Found`);
        } else {
          this.logger.warn(`Skipping ${cfg.name} (${cfg.api}): ${((e as any)?.message) || e}`);
        }
        counts[cfg.name] = 0;
      }
    }
    return counts;
  }

  /** Preview sample items that would be reassigned */
  async preview(categoryId: string, limit = 20) {
    const preview: Record<string, Array<{ id: number | string; title: string }>> = {};
    for (const cfg of CONTENT_TYPES) {
      try {
        const res = await cmsClient.get(cfg.api, {
          params: {
            [`where[${cfg.categoryField}][equals]`]: categoryId,
            limit,
          },
        });
        const docs = res.data?.docs ?? [];
        preview[cfg.name] = docs.map((doc: any) => ({
          id: doc.id,
          title: doc.title ?? doc.name ?? `#${doc.id}`,
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

  /** Reassign all content that references fromId -> toId (via Payload REST) */
  async reassignCategory(fromId: string, toId: string) {
    this.logger.log(`Reassigning content: ${fromId} -> ${toId}`);

    for (const cfg of CONTENT_TYPES) {
      await this.reassignForType(cfg, fromId, toId);
    }

    this.logger.log('Reassignment completed.');
  }

  private async reassignForType(cfg: ContentTypeConfig, fromCatId: string, toCatId: string) {
    let docs: any[] = [];
    try {
      docs = await getAllPages<any>(cfg.api, {
        [`where[${cfg.categoryField}][equals]`]: fromCatId,
        depth: 0,
      });
    } catch (e) {
      if (this.isNotFound(e)) {
        this.logger.warn(`Skipping ${cfg.name} (${cfg.api}): 404 Not Found`);
        return;
      }
      throw e;
    }

    if (!docs.length) {
      this.logger.log(`[${cfg.name}] No items to reassign.`);
      return;
    }

    const BATCH = 20;
    for (let i = 0; i < docs.length; i += BATCH) {
      const chunk = docs.slice(i, i + BATCH);

      await Promise.all(
        chunk.map(async (doc: any) => {
          if (cfg.relation === 'single') {
            await cmsClient.patch(`${cfg.api}/${doc.id}`, {
              [cfg.categoryField]: toCatId,
            });
          } else {
            // many relation: replace old id with new id
            const current: string[] = Array.isArray(doc[cfg.categoryField])
              ? doc[cfg.categoryField].map((r: any) => typeof r === 'object' ? r.id : r)
              : [];
            const keep = current.filter((x) => String(x) !== String(fromCatId));
            const newIds = Array.from(new Set([...keep, toCatId]));
            await cmsClient.patch(`${cfg.api}/${doc.id}`, {
              [cfg.categoryField]: newIds,
            });
          }
        }),
      );

      this.logger.log(
        `[${cfg.name}] Reassigned ${Math.min(i + BATCH, docs.length)}/${docs.length}`,
      );
    }
  }
}
