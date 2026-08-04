import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryEntity } from './entities/category.entity';
import {
  cosineSimilarity,
  getEmbeddings,
  isSemanticEmbeddingEnabled,
  normalizeText,
} from './lib/embedding';

/**
 * A taxonomy node prepared for matching: the category itself plus the
 * descriptor text we embed on its behalf.
 */
interface TaxonomyNode {
  uuid: string;
  name: string;
  /**
   * Every ancestor's name, nearest parent first. The taxonomy is more than two
   * levels deep (Development > Web Development > Full Stack Development), so a
   * single parentName is not enough: a profile matched at the leaf has to be
   * findable by someone filtering at any level above it.
   */
  ancestorNames: string[];
  isSubcategory: boolean;
  vector: number[];
}

export interface CategoryMatchResult {
  categories: string[];
  subcategories: string[];
}

/**
 * Derives a talent's categories from the text they already wrote — their job
 * titles and work-history roles — instead of requiring anyone to tag them by
 * hand in the CMS.
 *
 * Lives in category-service because category-service owns the taxonomy: one
 * process means one warm embedding cache, and no other service needs a copy of
 * the category tree to answer "what is this person?".
 */
@Injectable()
export class CategoryMatchingService {
  private readonly logger = new Logger(CategoryMatchingService.name);

  /**
   * Built lazily on first match and dropped by invalidate() whenever the
   * taxonomy changes. Held as a promise so concurrent callers during a cold
   * start share one build rather than each embedding the whole tree.
   */
  private taxonomy: Promise<TaxonomyNode[]> | null = null;

  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepo: Repository<CategoryEntity>,
  ) {}

  /**
   * Minimum cosine score for a taxonomy node to be considered a match.
   *
   * The default is deliberately different per embedding backend: real
   * sentence-transformer vectors put unrelated short phrases around 0.2-0.35
   * and genuine matches above 0.5, while the lexical fallback only scores
   * above zero on literal shared tokens, where a much lower bar is correct.
   */
  private threshold(): number {
    return isSemanticEmbeddingEnabled() ? 0.45 : 0.2;
  }

  /** Max taxonomy nodes kept per profile. */
  private maxMatches(): number {
    return 3;
  }

  /**
   * Drop the cached taxonomy embeddings. Called whenever a category is
   * created, updated or deleted so the next match rebuilds against the current
   * tree — a stale cache would keep matching profiles to a renamed or
   * unpublished category.
   */
  invalidate(): void {
    this.taxonomy = null;
    this.logger.log('Category taxonomy embeddings invalidated');
  }

  private async loadTaxonomy(): Promise<TaxonomyNode[]> {
    if (!this.taxonomy) {
      this.taxonomy = this.buildTaxonomy().catch((err) => {
        // Don't cache a failed build — the next call should retry.
        this.taxonomy = null;
        throw err;
      });
    }
    return this.taxonomy;
  }

  private async buildTaxonomy(): Promise<TaxonomyNode[]> {
    // Tags make the descriptors far richer, but they are not required to match
    // and the join table isn't present in every environment. Losing them must
    // degrade to name+parent matching, not take the whole matcher down — and
    // certainly not leave a caller waiting out its timeout.
    let categories: CategoryEntity[];
    try {
      categories = await this.categoryRepo.find({ relations: ['tags'] });
    } catch (err) {
      this.logger.warn(
        `Loading category tags failed (${
          err instanceof Error ? err.message : String(err)
        }) — matching on category and ancestor names only`,
      );
      categories = await this.categoryRepo.find();
    }

    // Every row is loaded, published or not, purely so ancestor chains can be
    // resolved through an unpublished intermediate level. Only published rows
    // become matchable nodes below.
    const byId = new Map(categories.map((c) => [c.id, c]));
    const ancestorsOf = (c: CategoryEntity): string[] => {
      const names: string[] = [];
      const seen = new Set<number>([c.id]);
      let current = c.parentId != null ? byId.get(c.parentId) : undefined;
      while (current && !seen.has(current.id)) {
        seen.add(current.id); // guards against a cycle in the stored tree
        names.push(current.name);
        current = current.parentId != null ? byId.get(current.parentId) : undefined;
      }
      return names;
    };

    const publishedCategories = categories.filter(
      (c) => c.published_in_marketplace,
    );

    if (!publishedCategories.length) {
      this.logger.warn(
        'No published categories found — semantic matching will return nothing',
      );
      return [];
    }

    // The descriptor is what actually gets embedded. Including the ancestor
    // names and the category's tags is what lets "React, Vue, CSS" pull a
    // "Senior React Developer" into Frontend Development — matching bare
    // category names alone is far too thin a signal, and is the only thing the
    // lexical fallback can match on at all.
    const ancestors = publishedCategories.map(ancestorsOf);
    const descriptors = publishedCategories.map((c, i) => {
      const tagNames = (c.tags ?? []).map((t) => t.name).filter(Boolean);
      return [...[...ancestors[i]].reverse(), c.name, ...tagNames]
        .filter(Boolean)
        .join(', ');
    });

    const vectors = await getEmbeddings(descriptors);

    return publishedCategories.map((c, i) => ({
      uuid: c.uuid,
      name: c.name,
      ancestorNames: ancestors[i],
      isSubcategory: c.parentId != null,
      vector: vectors[i],
    }));
  }

  /**
   * Match free-text profile signals (job title headlines, work-history roles)
   * against the taxonomy.
   *
   * Scores each taxonomy node by its best similarity across all input texts —
   * max, not mean, because a profile's three job titles may legitimately span
   * unrelated disciplines and averaging would wash each of them out.
   */
  async matchTexts(texts: string[]): Promise<CategoryMatchResult> {
    const cleaned = this.dedupe(texts);
    if (!cleaned.length) return { categories: [], subcategories: [] };

    const nodes = await this.loadTaxonomy();
    if (!nodes.length) return { categories: [], subcategories: [] };

    const scored = await this.scoreNodes(cleaned, nodes);
    const threshold = this.threshold();

    const kept = scored
      .filter((s) => s.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, this.maxMatches());

    return this.assemble(kept.map((k) => k.node));
  }

  /**
   * Turn matched nodes into the category/subcategory name pair the search
   * filters compare against.
   *
   * Every ancestor of a match is included, not just the immediate parent: the
   * sidebar drills down from the top level, so a profile matched at a leaf
   * must still be found by someone filtering two levels above it.
   */
  private assemble(nodes: TaxonomyNode[]): CategoryMatchResult {
    const categories = new Set<string>();
    const subcategories = new Set<string>();
    for (const node of nodes) {
      if (node.isSubcategory) {
        subcategories.add(node.name);
      } else {
        categories.add(node.name);
      }
      for (const ancestor of node.ancestorNames) categories.add(ancestor);
    }
    return {
      categories: [...categories],
      subcategories: [...subcategories],
    };
  }

  /**
   * Reverse of matchTexts, for the search-service DB fallback: given the
   * category/subcategory names the user picked in the sidebar, return the ids
   * of the candidates whose text matches any of them.
   *
   * Runs as one call over a pre-filtered candidate set so the embedding cache
   * is shared across the whole request instead of per profile.
   */
  async matchCandidates(
    selected: string[],
    candidates: { id: string; texts: string[] }[],
  ): Promise<{ id: string; categories: string[]; subcategories: string[] }[]> {
    const wanted = new Set(
      this.dedupe(selected).map((s) => normalizeText(s)),
    );
    if (!wanted.size || !candidates.length) return [];

    const nodes = await this.loadTaxonomy();
    const selectedNodes = nodes.filter((n) => wanted.has(normalizeText(n.name)));
    if (!selectedNodes.length) return [];

    // A picked category also matches anyone sitting anywhere beneath it, at
    // any depth — mirroring how the drilldown filter treats a pick as its
    // whole subtree. Testing the full ancestor chain (rather than just the
    // immediate parent) is what makes a top-level pick reach a leaf three
    // levels down.
    const selectedNames = new Set(selectedNodes.map((n) => n.name));
    const expanded = nodes.filter(
      (n) =>
        selectedNames.has(n.name) ||
        n.ancestorNames.some((a) => selectedNames.has(a)),
    );

    const threshold = this.threshold();
    const matched: {
      id: string;
      categories: string[];
      subcategories: string[];
    }[] = [];

    for (const candidate of candidates) {
      const cleaned = this.dedupe(candidate.texts);
      if (!cleaned.length) continue;

      const scored = await this.scoreNodes(cleaned, expanded);
      const hits = scored.filter((s) => s.score >= threshold);
      if (!hits.length) continue;

      matched.push({
        id: candidate.id,
        ...this.assemble(hits.map((h) => h.node)),
      });
    }

    return matched;
  }

  /**
   * Every published category name, parents and children alike. The search
   * sidebar's facet-value fallback reads this: with categories derived rather
   * than stored, the taxonomy itself is the authoritative list of values that
   * can appear on a profile.
   */
  async listCategoryNames(): Promise<{
    categories: string[];
    subcategories: string[];
  }> {
    const rows = await this.categoryRepo.find({
      where: { published_in_marketplace: true },
      relations: ['parent'],
    });
    const categories = rows
      .filter((r) => r.parentId == null)
      .map((r) => r.name);
    const subcategories = rows
      .filter((r) => r.parentId != null)
      .map((r) => r.name);
    return { categories, subcategories };
  }

  private async scoreNodes(
    texts: string[],
    nodes: TaxonomyNode[],
  ): Promise<{ node: TaxonomyNode; score: number }[]> {
    const textVectors = await getEmbeddings(texts);
    return nodes.map((node) => {
      let best = 0;
      for (const tv of textVectors) {
        const score = cosineSimilarity(tv, node.vector);
        if (score > best) best = score;
      }
      return { node, score: best };
    });
  }

  private dedupe(values: (string | null | undefined)[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const value of values ?? []) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!trimmed) continue;
      const key = normalizeText(trimmed);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
    return out;
  }
}
