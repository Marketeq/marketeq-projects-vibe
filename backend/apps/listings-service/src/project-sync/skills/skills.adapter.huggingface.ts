import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SkillsAdapter } from './skills.adapter';
import { SkillsAdapterHeuristic } from './skills.adapter.heuristic';
import { SkillExtractionInput } from './skills.types';

/**
 * HuggingFace-backed SkillsAdapter — wires spec §14.11
 * `SuggestedSkills = AI.extract_keywords(description + category + tags)`
 * AND spec §03's "AI Skill Mapping Utility" (task → skill map) through
 * one inference path.
 *
 * Strategy (mirrors the deliverables adapter's cosine-similarity
 * approach, same model/pipeline as `favorites-service/ai/ai.service.ts`):
 *
 *   1. Build a skills vocabulary from existing `public.projects.skills`
 *      — the shared marketplace taxonomy. Cached for the process
 *      lifetime; refreshed once per `VOCAB_TTL_MS` so newly-added
 *      skills get picked up without restarts.
 *   2. Embed every vocab item (cached by (model, text)).
 *   3. Embed the combined input (description + category + tags +
 *      task titles).
 *   4. Return the top-K vocab items ranked by cosine similarity to
 *      the input embedding, above threshold.
 *
 * This is "extract_keywords against a known taxonomy" — the standard
 * interpretation of spec §14.11 when no external NER pipeline is
 * available. Degrades to the heuristic adapter on any failure (no
 * API key, HTTP error, timeout, empty vocab, null embedding).
 *
 * Env config:
 *   HUGGINGFACE_API_KEY          required for HF path; absent = heuristic
 *   HF_SKILLS_MODEL              default: sentence-transformers/all-MiniLM-L6-v2
 *                                (falls through to HF_EMBEDDING_MODEL — same key
 *                                 the favorites-service and deliverables adapter use)
 *   SKILLS_SIMILARITY_THRESHOLD  default: 0.35  (loose — keyword-style match, not
 *                                 sentence-level; each vocab item is 1-3 words)
 *   SKILLS_TOP_K                 default: 10
 *   SKILLS_HF_TIMEOUT_MS         default: 5000 per embedding call
 *   SKILLS_VOCAB_LIMIT           default: 500  (cap per vocab refresh)
 *   SKILLS_VOCAB_TTL_MS          default: 3600000 (1 hour)
 */
@Injectable()
export class SkillsAdapterHuggingFace extends SkillsAdapter {
  private readonly logger = new Logger(SkillsAdapterHuggingFace.name);
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly threshold: number;
  private readonly topK: number;
  private readonly timeoutMs: number;
  private readonly vocabLimit: number;
  private readonly vocabTtlMs: number;

  private readonly embeddingCache = new Map<string, number[]>();
  private vocab: string[] | null = null;
  private vocabLoadedAt = 0;

  constructor(
    configService: ConfigService,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly heuristic: SkillsAdapterHeuristic,
  ) {
    super();
    this.model =
      configService.get<string>('HF_SKILLS_MODEL') ||
      configService.get<string>('HF_EMBEDDING_MODEL') ||
      'sentence-transformers/all-MiniLM-L6-v2';
    this.apiKey = configService.get<string>('HUGGINGFACE_API_KEY');
    this.threshold = Number(
      configService.get<string>('SKILLS_SIMILARITY_THRESHOLD') ?? 0.35,
    );
    this.topK = Number(configService.get<string>('SKILLS_TOP_K') ?? 10);
    this.timeoutMs = Number(
      configService.get<string>('SKILLS_HF_TIMEOUT_MS') ?? 5000,
    );
    this.vocabLimit = Number(
      configService.get<string>('SKILLS_VOCAB_LIMIT') ?? 500,
    );
    this.vocabTtlMs = Number(
      configService.get<string>('SKILLS_VOCAB_TTL_MS') ?? 3600000,
    );
  }

  async extractSkills(input: SkillExtractionInput): Promise<string[]> {
    if (!this.apiKey) return this.heuristic.extractSkills(input);

    try {
      const vocab = await this.getVocabulary();
      if (vocab.length === 0) return this.heuristic.extractSkills(input);

      const query = this.buildQueryText(input);
      if (!query) return this.heuristic.extractSkills(input);

      const [queryVec, vocabVecs] = await Promise.all([
        this.embed(query),
        Promise.all(vocab.map((v) => this.embed(v))),
      ]);
      if (!queryVec) return this.heuristic.extractSkills(input);

      const ranked = vocab
        .map((term, i) => ({ term, vec: vocabVecs[i] }))
        .filter((x): x is { term: string; vec: number[] } => !!x.vec)
        .map(({ term, vec }) => ({ term, score: cosine(queryVec, vec) }))
        .filter((x) => x.score >= this.threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, this.topK)
        .map((x) => x.term);

      if (ranked.length === 0) return this.heuristic.extractSkills(input);

      // Merge authored signals on top so explicit `tags` and `category`
      // always survive — they represent the editor's intent even when
      // they don't rank highly against the whole vocabulary.
      const seen = new Set<string>();
      const out: string[] = [];
      const push = (raw: string | null | undefined) => {
        const s = raw?.trim();
        if (!s) return;
        const key = s.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(s);
      };
      for (const t of input.tags ?? []) push(t);
      if (input.category) push(input.category);
      for (const term of ranked) push(term);
      return out.slice(0, this.topK);
    } catch (err) {
      this.logger.warn(
        `HF skills extraction failed, falling back to heuristic: ${
          err instanceof Error ? err.message : err
        }`,
      );
      return this.heuristic.extractSkills(input);
    }
  }

  private buildQueryText(input: SkillExtractionInput): string {
    const parts: string[] = [];
    if (input.description) parts.push(input.description);
    if (input.category) parts.push(input.category);
    if (input.tags && input.tags.length > 0) parts.push(input.tags.join(', '));
    if (input.scopeTaskTitles && input.scopeTaskTitles.length > 0) {
      parts.push(input.scopeTaskTitles.join('. '));
    }
    return parts.join('\n').trim();
  }

  private async getVocabulary(): Promise<string[]> {
    const fresh =
      this.vocab !== null && Date.now() - this.vocabLoadedAt < this.vocabTtlMs;
    if (fresh) return this.vocab!;

    try {
      // Flatten the `skills` text[] column across published projects
      // and take the most common ~N terms. ORDER BY frequency keeps
      // the vocab focused on marketplace-relevant skills.
      const rows = await this.dataSource.query(
        `SELECT s AS term, COUNT(*)::int AS freq
           FROM public.projects, unnest(skills) AS s
          WHERE status != 'draft'
          GROUP BY s
          ORDER BY freq DESC
          LIMIT $1`,
        [this.vocabLimit],
      );
      const terms: string[] = rows
        .map((r: { term: string }) => r.term)
        .filter((t: unknown): t is string => typeof t === 'string' && t.length > 0);
      this.vocab = terms;
      this.vocabLoadedAt = Date.now();
      return terms;
    } catch (err) {
      this.logger.warn(
        `Failed to load skills vocabulary: ${err instanceof Error ? err.message : err}`,
      );
      this.vocab = [];
      this.vocabLoadedAt = Date.now();
      return [];
    }
  }

  private async embed(text: string): Promise<number[] | null> {
    const key = `${this.model}::${text}`;
    const cached = this.embeddingCache.get(key);
    if (cached) return cached;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      // HF routed Inference API (2025+). Legacy
      // `api-inference.huggingface.co/models/:model` returns 404; the
      // serverless API moved to the routed form with pipeline suffix.
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
      const vector = Array.isArray(body) && Array.isArray(body[0])
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
