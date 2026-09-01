import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { taxonomyChildren } from './related-taxonomy';

type VocabKind = 'category' | 'skill' | 'category-parent';

@Injectable()
export class RelatedTermsService {
  private readonly logger = new Logger(RelatedTermsService.name);
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly threshold: number;
  private readonly timeoutMs: number;
  private readonly vocabLimit: number;
  private readonly vocabTtlMs: number;

  private readonly embeddingCache = new Map<
    string,
    Promise<number[] | null>
  >();
  private readonly vocabCache = new Map<
    VocabKind,
    { terms: string[]; loadedAt: number }
  >();

  constructor(
    config: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.model =
      config.get<string>('HF_SKILLS_MODEL') ||
      config.get<string>('HF_EMBEDDING_MODEL') ||
      'sentence-transformers/all-MiniLM-L6-v2';
    this.apiKey = config.get<string>('HUGGINGFACE_API_KEY');
    this.threshold = Number(
      config.get<string>('RELATED_SIMILARITY_THRESHOLD') ?? 0.3,
    );
    this.timeoutMs = Number(config.get<string>('RELATED_HF_TIMEOUT_MS') ?? 5000);
    this.vocabLimit = Number(config.get<string>('RELATED_VOCAB_LIMIT') ?? 500);
    this.vocabTtlMs = Number(
      config.get<string>('RELATED_VOCAB_TTL_MS') ?? 3600000,
    );
  }

  relatedCategories(own: string[], limit = 36): Promise<string[]> {
    return this.related('category', own, limit);
  }

  relatedSkills(own: string[], limit = 36): Promise<string[]> {
    return this.related('skill', own, limit);
  }

  relatedCategoryGroups(
    ownParents: string[],
    groups = 4,
    perGroup = 9,
  ): Promise<Array<{ name: string; items: string[] }>> {
    return this.buildGroups(
      'category',
      'category-parent',
      ownParents,
      groups,
      perGroup,
    );
  }

  relatedSkillGroups(
    ownParents: string[],
    groups = 4,
    perGroup = 9,
  ): Promise<Array<{ name: string; items: string[] }>> {
    return this.buildGroups('skill', 'skill', ownParents, groups, perGroup);
  }

  private isNearDuplicate(a: string, b: string): boolean {
    const x = a.toLowerCase().trim();
    const y = b.toLowerCase().trim();
    if (!x || !y) return false;
    return x === y || x.includes(y) || y.includes(x);
  }

  // Item is just a format-variant of its header (e.g. "React.Js" vs "React"),
  // but NOT a meaningful qualifier ("React Native", "UX Design").
  private isRedundantVariant(a: string, b: string): boolean {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const x = norm(a);
    const y = norm(b);
    if (!x || !y) return false;
    if (x === y) return true;
    if (x.startsWith(y) && x.length - y.length <= 2) return true;
    if (y.startsWith(x) && y.length - x.length <= 2) return true;
    return false;
  }

  private async buildGroups(
    kind: VocabKind,
    headerKind: VocabKind,
    ownParents: string[],
    groupCount: number,
    perGroup: number,
  ): Promise<Array<{ name: string; items: string[] }>> {
    const cleanParents = Array.from(
      new Map(
        ownParents
          .map((p) => p?.trim())
          .filter((p): p is string => !!p)
          .map((p) => [p.toLowerCase(), p]),
      ).values(),
    );

    const headers: string[] = [];
    const pushDistinct = (candidate: string) => {
      if (headers.length >= groupCount) return;
      if (headers.some((h) => this.isNearDuplicate(h, candidate))) return;
      headers.push(candidate);
    };

    for (const p of cleanParents) pushDistinct(p);

    if (headers.length < groupCount && cleanParents.length > 0) {
      const relatedParents = await this.related(
        headerKind,
        cleanParents,
        groupCount * 4,
      );
      for (const p of relatedParents) {
        if (headers.length >= groupCount) break;
        pushDistinct(p);
      }
    }

    const finalHeaders = headers.slice(0, groupCount);
    if (finalHeaders.length === 0) return [];

    const candidateLists = await Promise.all(
      finalHeaders.map(async (header) => {
        const curated = taxonomyChildren(header) ?? [];
        const semantic = await this.related(kind, [header], perGroup * 3);
        return [...curated, ...semantic];
      }),
    );

    const headerSet = new Set(finalHeaders.map((h) => h.toLowerCase()));
    const usedAcrossColumns = new Set(headerSet);

    return finalHeaders.map((header, idx) => {
      const items: string[] = [];
      const localSeen = new Set<string>();
      const add = (term: string): boolean => {
        const key = term.toLowerCase();
        if (localSeen.has(key) || headerSet.has(key)) return false;
        if (this.isRedundantVariant(term, header)) return false;
        localSeen.add(key);
        items.push(term);
        return true;
      };

      // Pass 1: prefer terms not yet used by other columns (keep columns distinct)
      for (const term of candidateLists[idx]) {
        if (items.length >= perGroup) break;
        if (usedAcrossColumns.has(term.toLowerCase())) continue;
        if (add(term)) usedAcrossColumns.add(term.toLowerCase());
      }

      // Pass 2: top up to perGroup, allowing terms already shown in other columns
      if (items.length < perGroup) {
        for (const term of candidateLists[idx]) {
          if (items.length >= perGroup) break;
          add(term);
        }
      }

      return { name: header, items };
    });
  }

  private async related(
    kind: VocabKind,
    own: string[],
    limit: number,
  ): Promise<string[]> {
    const ownSet = new Set(
      own.map((t) => t.toLowerCase().trim()).filter(Boolean),
    );
    const vocab = (await this.getVocabulary(kind)).filter(
      (t) => !ownSet.has(t.toLowerCase()),
    );
    if (vocab.length === 0) return [];

    const query = own.join(', ').trim();
    const results: string[] = [];
    if (query && this.apiKey) {
      try {
        results.push(...(await this.semantic(query, vocab, limit)));
      } catch (err) {
        this.logger.warn(
          `HF related ${kind} failed, using heuristic: ${
            err instanceof Error ? err.message : err
          }`,
        );
      }
    }

    if (results.length < limit) {
      const seen = new Set(results.map((t) => t.toLowerCase()));
      for (const term of this.heuristic(own, vocab, limit)) {
        if (results.length >= limit) break;
        const key = term.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(term);
      }
    }
    return results;
  }

  private async semantic(
    query: string,
    vocab: string[],
    limit: number,
  ): Promise<string[]> {
    // Prime the cache with one batched request per ~100 terms instead of a
    // separate HTTP call per term — a cold load embeds ~1000 terms, and doing
    // that one-at-a-time took ~13s and starved sibling listings requests.
    await this.primeEmbeddings([query, ...vocab]);

    const [queryVec, vocabVecs] = await Promise.all([
      this.embed(query),
      Promise.all(vocab.map((v) => this.embed(v))),
    ]);
    if (!queryVec) return [];

    return vocab
      .map((term, i) => ({ term, vec: vocabVecs[i] }))
      .filter((x): x is { term: string; vec: number[] } => !!x.vec)
      .map(({ term, vec }) => ({ term, score: cosine(queryVec, vec) }))
      .filter((x) => x.score >= this.threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.term);
  }

  private heuristic(own: string[], vocab: string[], limit: number): string[] {
    const ownTokens = new Set(
      own.flatMap((t) => t.toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean),
    );
    return vocab
      .map((term) => {
        const tokens = term
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(Boolean);
        const overlap = tokens.filter((t) => ownTokens.has(t)).length;
        return { term, overlap };
      })
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, limit)
      .map((x) => x.term);
  }

  private async getVocabulary(kind: VocabKind): Promise<string[]> {
    const cached = this.vocabCache.get(kind);
    if (cached && Date.now() - cached.loadedAt < this.vocabTtlMs) {
      return cached.terms;
    }

    const source =
      kind === 'category'
        ? `coalesce(categories, '{}'::text[]) || coalesce(subcategories, '{}'::text[])`
        : kind === 'category-parent'
          ? `coalesce(categories, '{}'::text[])`
          : `coalesce(skills, '{}'::text[]) || coalesce("programmingLanguages", '{}'::text[]) || coalesce("developmentTech", '{}'::text[])`;

    try {
      const rows = await this.dataSource.query(
        `SELECT term, COUNT(*)::int AS freq
           FROM listings.project, LATERAL unnest(${source}) AS term
          WHERE status = 'published'
          GROUP BY term
          ORDER BY freq DESC
          LIMIT $1`,
        [this.vocabLimit],
      );
      const minLen = kind === 'skill' ? 1 : 2;
      const terms: string[] = rows
        .map((r: { term: string }) => r.term)
        .filter(
          (t: unknown): t is string =>
            typeof t === 'string' && t.trim().length >= minLen,
        );
      this.vocabCache.set(kind, { terms, loadedAt: Date.now() });
      return terms;
    } catch (err) {
      this.logger.warn(
        `Failed to load ${kind} vocabulary: ${
          err instanceof Error ? err.message : err
        }`,
      );
      this.vocabCache.set(kind, { terms: [], loadedAt: Date.now() });
      return [];
    }
  }

  // Populate the per-term embedding cache using batched HF requests. Each term
  // still ends up cached under its own key, so subsequent embed() calls (and
  // later requests) are cache hits; only uncached terms trigger a network call.
  private async primeEmbeddings(texts: string[]): Promise<void> {
    if (!this.apiKey) return;
    const unique = Array.from(
      new Set(texts.map((t) => t?.trim()).filter((t): t is string => !!t)),
    );
    const uncached = unique.filter(
      (t) => !this.embeddingCache.has(`${this.model}::${t}`),
    );
    if (uncached.length === 0) return;

    const CHUNK = 100;
    const batches: Promise<unknown>[] = [];
    for (let i = 0; i < uncached.length; i += CHUNK) {
      const chunk = uncached.slice(i, i + CHUNK);
      const batchPromise = this.fetchEmbeddings(chunk);
      chunk.forEach((term, idx) => {
        const key = `${this.model}::${term}`;
        const termPromise = batchPromise.then((vectors) => {
          const vector = vectors[idx] ?? null;
          if (vector === null) this.embeddingCache.delete(key);
          return vector;
        });
        this.embeddingCache.set(key, termPromise);
      });
      batches.push(batchPromise);
    }
    await Promise.all(batches);
  }

  private async fetchEmbeddings(
    texts: string[],
  ): Promise<(number[] | null)[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs * 2);
    try {
      const res = await fetch(
        `https://router.huggingface.co/hf-inference/models/${this.model}/pipeline/feature-extraction`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ inputs: texts }),
          signal: controller.signal,
        },
      );
      clearTimeout(timer);
      if (!res.ok) return texts.map(() => null);
      const body = (await res.json()) as unknown;
      if (!Array.isArray(body)) return texts.map(() => null);
      return texts.map((_, i) => {
        const vector = (body as unknown[])[i];
        return Array.isArray(vector) &&
          vector.length > 0 &&
          typeof vector[0] === 'number'
          ? (vector as number[])
          : null;
      });
    } catch {
      clearTimeout(timer);
      return texts.map(() => null);
    }
  }

  private embed(text: string): Promise<number[] | null> {
    const key = `${this.model}::${text}`;
    const cached = this.embeddingCache.get(key);
    if (cached) return cached;
    if (!this.apiKey) return Promise.resolve(null);

    // Cache the in-flight promise so concurrent callers share one request
    // (prevents a thundering herd of duplicate embeds); drop it on failure
    // so it can be retried later rather than caching a permanent null.
    const promise = this.fetchEmbedding(text).then((vector) => {
      if (vector === null) this.embeddingCache.delete(key);
      return vector;
    });
    this.embeddingCache.set(key, promise);
    return promise;
  }

  private async fetchEmbedding(text: string): Promise<number[] | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(
        `https://router.huggingface.co/hf-inference/models/${this.model}/pipeline/feature-extraction`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ inputs: text }),
          signal: controller.signal,
        },
      );
      clearTimeout(timer);
      if (!res.ok) return null;
      const body = (await res.json()) as unknown;
      const vector =
        Array.isArray(body) && Array.isArray(body[0])
          ? (body[0] as number[])
          : (body as number[]);
      if (!Array.isArray(vector) || vector.length === 0) return null;
      return vector;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
