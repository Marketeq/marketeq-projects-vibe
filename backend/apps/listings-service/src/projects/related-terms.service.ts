import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

type VocabKind = 'category' | 'skill';

@Injectable()
export class RelatedTermsService {
  private readonly logger = new Logger(RelatedTermsService.name);
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly threshold: number;
  private readonly timeoutMs: number;
  private readonly vocabLimit: number;
  private readonly vocabTtlMs: number;

  private readonly embeddingCache = new Map<string, number[]>();
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
    this.vocabLimit = Number(config.get<string>('RELATED_VOCAB_LIMIT') ?? 300);
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
      const terms: string[] = rows
        .map((r: { term: string }) => r.term)
        .filter(
          (t: unknown): t is string =>
            typeof t === 'string' && t.trim().length > 0,
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

  private async embed(text: string): Promise<number[] | null> {
    const key = `${this.model}::${text}`;
    const cached = this.embeddingCache.get(key);
    if (cached) return cached;
    if (!this.apiKey) return null;

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
      this.embeddingCache.set(key, vector);
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
