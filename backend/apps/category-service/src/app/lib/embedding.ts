/**
 * Text embedding for semantic category matching.
 *
 * Mirrors apps/user-service/src/similar-profiles/lib/embedding.ts — the only
 * embedding path that actually runs in this repo. (backend/libs/similar-profiles
 * imports @xenova/transformers, which is not installed; do not build on it.)
 *
 * Uses the HuggingFace Inference API (feature-extraction) when
 * HUGGINGFACE_API_KEY is set. Without a key it falls back to a deterministic
 * local bag-of-tokens vector: that is lexical, not semantic, so "React
 * Engineer" will NOT match "Frontend Development" on name alone — which is
 * precisely why CategoryMatchingService embeds each category together with its
 * tag names, giving the fallback real tokens to hit.
 *
 * Every vector is L2-normalised on the way out so cosine similarity is a plain
 * dot product and the threshold means the same thing on both paths.
 */

const HF_MODEL =
  process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const LOCAL_DIM = 256;
const MAX_CACHE_ENTRIES = 5000;

/**
 * Insertion-ordered cache doubling as a crude LRU: Map preserves insertion
 * order, so evicting the first key drops the oldest entry. Job titles repeat
 * heavily across profiles, so this is what keeps both the sync path and the
 * search-service fallback affordable.
 */
const cache = new Map<string, number[]>();

function remember(key: string, vector: number[]): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, vector);
}

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function l2Normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  if (!norm) return vec;
  return vec.map((v) => v / norm);
}

function localEmbed(text: string): number[] {
  const vec = new Array(LOCAL_DIM).fill(0);
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter(Boolean);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    vec[hash % LOCAL_DIM] += 1;
  }
  return l2Normalize(vec);
}

function meanPool(tokenVectors: number[][]): number[] {
  const dim = tokenVectors[0]?.length ?? 0;
  const out = new Array(dim).fill(0);
  for (const v of tokenVectors) {
    for (let i = 0; i < dim; i++) out[i] += v[i];
  }
  const count = tokenVectors.length || 1;
  for (let i = 0; i < dim; i++) out[i] /= count;
  return out;
}

async function hfEmbed(texts: string[]): Promise<number[][]> {
  const res = await fetch(
    `https://api-inference.huggingface.co/models/${HF_MODEL}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: texts,
        options: { wait_for_model: true },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`HF embedding failed: ${res.status}`);
  }
  const data = (await res.json()) as unknown[];
  // Sentence-transformer feature-extraction returns one vector per input
  // (number[][]); some models return per-token vectors (number[][][]) that
  // need mean pooling. Normalize either shape to a single vector per input.
  return texts.map((_, i) => {
    const row = data[i] as number[] | number[][];
    const vec = Array.isArray(row[0])
      ? meanPool(row as number[][])
      : (row as number[]);
    return l2Normalize(vec);
  });
}

/**
 * True when embeddings come from a real sentence-transformer rather than the
 * lexical fallback. Callers use this to decide whether a semantic threshold is
 * meaningful — see CategoryMatchingService.threshold().
 */
export function isSemanticEmbeddingEnabled(): boolean {
  return Boolean(HF_API_KEY);
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const keys = texts.map(normalizeText);
  const result: (number[] | undefined)[] = keys.map((k) => cache.get(k));
  const missingIdx = result.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);

  if (missingIdx.length > 0) {
    const missingTexts = missingIdx.map((i) => keys[i]);
    let vectors: number[][];
    if (HF_API_KEY) {
      try {
        vectors = await hfEmbed(missingTexts);
      } catch {
        vectors = missingTexts.map(localEmbed);
      }
    } else {
      vectors = missingTexts.map(localEmbed);
    }
    missingIdx.forEach((origIdx, k) => {
      remember(keys[origIdx], vectors[k]);
      result[origIdx] = vectors[k];
    });
  }

  return result as number[][];
}

/**
 * Cosine similarity of two vectors. Both sides come out of getEmbeddings
 * already L2-normalised, so this is effectively a dot product; the norm
 * divisor is kept for callers that pass raw vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
