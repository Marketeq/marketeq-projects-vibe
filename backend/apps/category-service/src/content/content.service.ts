import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CategoryPageEntity } from "../app/entities/category-page.entity";
import { cmsClient, findCmsCategoryIdByUuid, getAllPages } from "./cms-client";
import { CONTENT_TYPES, ContentTypeConfig } from "./content.types";

const BOOT_DELAY_MS = 8_000;

function levelStringToInt(level: any): number {
  if (typeof level === 'number') return level;
  const map: Record<string, number> = { l1: 1, l2: 2, l3: 3 };
  return map[String(level).toLowerCase()] ?? 0;
}

@Injectable()
export class ContentService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectRepository(CategoryPageEntity)
    private readonly categoryPageRepo: Repository<CategoryPageEntity>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await new Promise((r) => setTimeout(r, BOOT_DELAY_MS));
    await this.backfillFromCms();
  }

  private async backfillFromCms(): Promise<void> {
    try {
      const docs = await getAllPages<any>('/category-pages', { depth: 1, draft: false });
      this.logger.log(`[CmsBackfill:category-pages] Syncing ${docs.length} docs from CMS`);
      let upserted = 0;
      let failed = 0;

      for (const doc of docs) {
        const categoryUuid = doc.categoryRef?.categoryId;
        if (!categoryUuid || !doc.path) {
          this.logger.warn(`[CmsBackfill:category-pages] Skipping doc id=${doc.id} — missing categoryId or path`);
          continue;
        }
        try {
          const heroBanner = doc.heroBanner
            ? {
                title: doc.heroBanner.title ?? null,
                subtitle: doc.heroBanner.subtitle ?? null,
                imageUrl: doc.heroBanner.image?.url ?? null,
              }
            : null;
          await this.upsertCategoryPage({
            categoryUuid,
            path: doc.path,
            displayTitle: doc.displayTitle,
            level: levelStringToInt(doc.level),
            heroBanner,
            intro: doc.intro ?? null,
            faq: doc.faq ?? [],
            featured: doc.featured ?? false,
          });
          upserted++;
        } catch (err: any) {
          failed++;
          this.logger.error(`[CmsBackfill:category-pages] Failed for path="${doc.path}": ${err.message}`);
        }
      }

      this.logger.log(`[CmsBackfill:category-pages] Done — upserted: ${upserted}, failed: ${failed}`);
    } catch (err: any) {
      this.logger.error(`[CmsBackfill:category-pages] Aborted: ${err.message}`);
    }
  }

  async findCategoryPageByPath(path: string): Promise<CategoryPageEntity | null> {
    return this.categoryPageRepo.findOne({ where: { path } });
  }

  async upsertCategoryPage(data: Partial<CategoryPageEntity> & { path: string }): Promise<void> {
    const existing = await this.categoryPageRepo.findOne({ where: { path: data.path } });
    if (existing) {
      await this.categoryPageRepo.update(existing.id, data);
      this.logger.log(`Updated category page: ${data.path}`);
    } else {
      const created = this.categoryPageRepo.create(data);
      await this.categoryPageRepo.save(created);
      this.logger.log(`Created category page: ${data.path}`);
    }
  }

  async deleteCategoryPageByPath(path: string): Promise<void> {
    await this.categoryPageRepo.delete({ path });
    this.logger.log(`Deleted category page: ${path}`);
  }


  private isNotFound(err: any) {
    return err?.response?.status === 404;
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
    const preview: Record<
      string,
      Array<{ id: number | string; title: string }>
    > = {};
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
      findCmsCategoryIdByUuid(fromUuid),
      findCmsCategoryIdByUuid(toUuid),
    ]);
    // When either category doesn't exist in CMS yet (local-only rows synced
    // via /sync but never pushed, or rows created purely in category-service
    // test fixtures), there is no CMS content to migrate and no target to
    // migrate into — treat as a no-op rather than blowing up the caller.
    // reassignChildrenToParent iterates over each child and a single missing
    // CMS counterpart used to abort the whole batch.
    if (fromId == null) {
      this.logger.log(
        `No CMS counterpart for fromUuid=${fromUuid} — nothing to reassign.`,
      );
      return;
    }
    if (toId == null) {
      this.logger.warn(
        `toUuid=${toUuid} has no CMS counterpart — skipping reassign (content left pointing at fromUuid=${fromUuid}).`,
      );
      return;
    }
    for (const cfg of CONTENT_TYPES) {
      await this.reassignForType(cfg, fromId, toId);
    }
    this.logger.log("Reassignment completed.");
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
          if (cfg.relation === "single") {
            await cmsClient.patch(`${cfg.api}/${doc.id}`, {
              [cfg.categoryField]: toCatId,
            });
          } else {
            const current: Array<number | string> = Array.isArray(
              doc[cfg.categoryField],
            )
              ? doc[cfg.categoryField].map((r: any) =>
                  typeof r === "object" ? r.id : r,
                )
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
