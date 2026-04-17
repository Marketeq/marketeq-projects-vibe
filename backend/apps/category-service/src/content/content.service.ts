import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { cmsClient, findCmsCategoryIdByUuid, getAllPages } from './cms-client';
import { CONTENT_TYPES, ContentTypeConfig } from './content.types';

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  private isNotFound(err: any) {
    return err?.response?.status === 404;
  }

  // category-service endpoints accept the stable UUID; Payload relationship
  // fields are keyed by integer id. Every call into Payload must translate
  // first — see findCmsCategoryIdByUuid.
  private async resolveCmsCategoryId(uuid: string): Promise<number | string> {
    const id = await findCmsCategoryIdByUuid(uuid);
    if (id == null) {
      throw new NotFoundException(`No CMS category found for uuid "${uuid}"`);
    }
    return id;
  }

  // ---------- discovery ----------

  /** Count items per content-type referencing the category (by UUID) */
  async countByCategory(categoryUuid: string) {
    const counts: Record<string, number> = {};
    const cmsId = await findCmsCategoryIdByUuid(categoryUuid);
    if (cmsId == null) {
      for (const cfg of CONTENT_TYPES) counts[cfg.name] = 0;
      return counts;
    }
    for (const cfg of CONTENT_TYPES) {
      try {
        const res = await cmsClient.get(cfg.api, {
          params: {
            [`where[${cfg.categoryField}][equals]`]: cmsId,
            limit: 0,
          },
        });
        counts[cfg.name] = res.data?.totalDocs ?? 0;
      } catch (e) {
        // Only 404s are expected here — a collection that doesn't exist
        // in this Payload deployment. Anything else (500, network, auth)
        // is a real failure and must surface instead of reporting `0`.
        if (!this.isNotFound(e)) throw e;
        this.logger.warn(`Skipping ${cfg.name} (${cfg.api}): 404 Not Found`);
        counts[cfg.name] = 0;
      }
    }
    return counts;
  }

  /** Preview sample items that would be reassigned (category addressed by UUID) */
  async preview(categoryUuid: string, limit = 20) {
    const preview: Record<string, Array<{ id: number | string; title: string }>> = {};
    const cmsId = await findCmsCategoryIdByUuid(categoryUuid);
    if (cmsId == null) {
      for (const cfg of CONTENT_TYPES) preview[cfg.name] = [];
      return preview;
    }
    for (const cfg of CONTENT_TYPES) {
      try {
        const res = await cmsClient.get(cfg.api, {
          params: {
            [`where[${cfg.categoryField}][equals]`]: cmsId,
            limit,
          },
        });
        const docs = res.data?.docs ?? [];
        preview[cfg.name] = docs.map((doc: any) => ({
          id: doc.id,
          title: doc.title ?? doc.name ?? `#${doc.id}`,
        }));
      } catch (e) {
        if (!this.isNotFound(e)) throw e;
        this.logger.warn(`Skipping ${cfg.name} (${cfg.api}): 404 Not Found`);
        preview[cfg.name] = [];
      }
    }
    return preview;
  }

  // ---------- reassignment ----------

  /** Reassign all content referencing `fromUuid` over to `toUuid` */
  async reassignCategory(fromUuid: string, toUuid: string) {
    this.logger.log(`Reassigning content: ${fromUuid} -> ${toUuid}`);
    const [fromId, toId] = await Promise.all([
      this.resolveCmsCategoryId(fromUuid),
      this.resolveCmsCategoryId(toUuid),
    ]);
    for (const cfg of CONTENT_TYPES) {
      await this.reassignForType(cfg, fromId, toId);
    }
    this.logger.log('Reassignment completed.');
  }

  private async reassignForType(
    cfg: ContentTypeConfig,
    fromCatId: number | string,
    toCatId: number | string,
  ) {
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
            const current: Array<number | string> = Array.isArray(doc[cfg.categoryField])
              ? doc[cfg.categoryField].map((r: any) => (typeof r === 'object' ? r.id : r))
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
