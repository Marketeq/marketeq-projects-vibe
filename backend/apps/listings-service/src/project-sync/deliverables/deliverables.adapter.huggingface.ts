import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeliverablesAdapter } from './deliverables.adapter';
import { DeliverablesAdapterHeuristic } from './deliverables.adapter.heuristic';
import { DeliverableGroup, ScopePhaseInput } from './deliverables.types';

/**
 * HuggingFace-backed deliverables adapter — matches spec §01
 * "derived from an AI summary that uses a large language model".
 *
 * Uses the same model + pooling approach as
 * `favorites-service/src/ai/ai.service.ts` (sentence-transformers
 * MiniLM-L6-v2, cosine similarity clustering). We call the HF
 * Inference REST API directly via `fetch` rather than
 * `@huggingface/inference`, matching the service-to-service fetch
 * convention already used elsewhere in listings-service (see
 * `cms-projects.controller.ts` calls to category-service and
 * user-service). Keeps the package.json surface small.
 *
 * Strategy per phase:
 *   1. Embed every task title
 *   2. Greedy-cluster titles with cosine similarity ≥ threshold
 *      (default 0.88) — "Build homepage" and "Homepage build" collapse
 *      into one item; "Design logo" and "Color palette" stay separate
 *   3. Longest title in each cluster wins (richer client-facing text)
 *   4. Preserve phase + within-phase ordering
 *
 * Fallback: on missing API key, HTTP error, timeout, malformed
 * response, or any embedding returning null → delegate to the
 * heuristic adapter. The sync pipeline is never blocked by model
 * issues.
 *
 * Env config:
 *   HUGGINGFACE_API_KEY               required for HF path; absent = heuristic
 *   HF_DELIVERABLES_MODEL             default: sentence-transformers/all-MiniLM-L6-v2
 *   DELIVERABLES_DEDUP_THRESHOLD      default: 0.88
 *   DELIVERABLES_HF_TIMEOUT_MS        default: 5000 (per embedding call)
 */
@Injectable()
export class DeliverablesAdapterHuggingFace extends DeliverablesAdapter {
  private readonly logger = new Logger(DeliverablesAdapterHuggingFace.name);
  private readonly model: string;
  private readonly apiKey: string | undefined;
  private readonly threshold: number;
  private readonly timeoutMs: number;
  // Process-lifetime cache — task titles repeat heavily across
  // re-publishes of the same project, and embedding calls cost both
  // time and tokens. Keyed by (model, text) so threshold/model
  // changes don't return stale vectors.
  private readonly embeddingCache = new Map<string, number[]>();

  constructor(
    configService: ConfigService,
    private readonly heuristic: DeliverablesAdapterHeuristic,
  ) {
    super();
    this.model =
      configService.get<string>('HF_DELIVERABLES_MODEL') ||
      configService.get<string>('HF_EMBEDDING_MODEL') ||
      'sentence-transformers/all-MiniLM-L6-v2';
    this.apiKey = configService.get<string>('HUGGINGFACE_API_KEY');
    this.threshold = Number(
      configService.get<string>('DELIVERABLES_DEDUP_THRESHOLD') ?? 0.88,
    );
    this.timeoutMs = Number(
      configService.get<string>('DELIVERABLES_HF_TIMEOUT_MS') ?? 5000,
    );
  }

  async deriveDeliverables(
    scope: ScopePhaseInput[],
  ): Promise<DeliverableGroup[]> {
    if (!this.apiKey) {
      // No key configured — silent fallback. Logged once at startup
      // would be noisier than useful; the heuristic produces the same
      // shape so downstream rendering is unaffected.
      return this.heuristic.deriveDeliverables(scope);
    }

    try {
      const results: DeliverableGroup[] = [];
      for (let i = 0; i < scope.length; i++) {
        const phase = scope[i];
        const taskTexts = phase.tasks
          .map((t) => {
            const title = typeof t?.title === 'string' ? t.title.trim() : '';
            if (!title) return '';
            const role =
              typeof (t as any)?.roleName === 'string'
                ? String((t as any).roleName).trim()
                : '';
            const desc =
              typeof (t as any)?.description === 'string'
                ? String((t as any).description).trim()
                : '';
            // Embed richer context (title + role + description) so clustering
            // better matches “LLM summary based on scope”.
            return [title, role ? `Role: ${role}` : '', desc ? `Desc: ${desc}` : '']
              .filter(Boolean)
              .join(' — ');
          })
          .filter(Boolean);
        if (taskTexts.length === 0) continue;

        const items = await this.mergeSemanticDuplicates(taskTexts);
        if (items.length === 0) continue;

        results.push({
          phaseLabel: `Phase ${i + 1}`,
          phaseName: phase.phaseName,
          items,
        });
      }
      return results;
    } catch (err) {
      this.logger.warn(
        `HF inference failed, falling back to heuristic: ${err instanceof Error ? err.message : err}`,
      );
      return this.heuristic.deriveDeliverables(scope);
    }
  }

  private async mergeSemanticDuplicates(titles: string[]): Promise<string[]> {
    if (titles.length <= 1) return titles;

    const vectors = await Promise.all(titles.map((t) => this.embed(t)));

    // If any embedding failed, degrade gracefully: fall back to
    // case-insensitive exact-match dedup (same as the heuristic path)
    // for just this phase, instead of aborting the whole sync.
    if (vectors.some((v) => v === null)) {
      const seen = new Set<string>();
      return titles.filter((t) => {
        const key = t.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Greedy clustering — walk in authoring order so layout stays
    // stable. Each title either joins an existing cluster (if cosine
    // similarity ≥ threshold to any kept representative) or starts a
    // new one. The longest title in each cluster survives so we keep
    // the richest phrasing.
    const kept: { text: string; vec: number[] }[] = [];
    for (let i = 0; i < titles.length; i++) {
      const vec = vectors[i]!;
      let matched = false;
      for (const k of kept) {
        if (cosine(vec, k.vec) >= this.threshold) {
          if (titles[i].length > k.text.length) k.text = titles[i];
          matched = true;
          break;
        }
      }
      if (!matched) kept.push({ text: titles[i], vec });
    }
    return kept.map((k) => k.text);
  }

  private async embed(text: string): Promise<number[] | null> {
    const cacheKey = `${this.model}::${text}`;
    const cached = this.embeddingCache.get(cacheKey);
    if (cached) return cached;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      // HF routed Inference API (2025+). Legacy
      // `api-inference.huggingface.co/models/:model` returns 404 since
      // the serverless API moved to the routed form below. The
      // `/pipeline/feature-extraction` suffix is required so the router
      // picks the embedding pipeline for sentence-transformers.
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
      // HF feature-extraction returns either a pooled number[] or a
      // token-level number[][] depending on the model head. MiniLM's
      // public endpoint returns pooled number[]; handle both shapes.
      const vector = Array.isArray(body) && Array.isArray(body[0])
        ? (body[0] as number[])
        : (body as number[]);
      if (!Array.isArray(vector) || vector.length === 0) return null;
      this.embeddingCache.set(cacheKey, vector);
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
