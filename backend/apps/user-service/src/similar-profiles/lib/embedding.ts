/**
 * Skill embedding for similar-profiles scoring.
 *
 * Uses the HuggingFace Inference API (feature-extraction) when
 * HUGGINGFACE_API_KEY is set; otherwise falls back to a deterministic
 * local bag-of-tokens vector so skill similarity still contributes
 * instead of collapsing to zero. Results are cached per input text.
 */

const HF_MODEL =
  process.env.HF_EMBEDDING_MODEL ||
  'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const LOCAL_DIM = 256;

const cache = new Map<string, number[]>();

function localEmbed(text: string): number[] {
  const vec = new Array(LOCAL_DIM).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);
  for (const token of tokens) {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash * 31 + token.charCodeAt(i)) >>> 0;
    }
    vec[hash % LOCAL_DIM] += 1;
  }
  return vec;
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
    return Array.isArray(row[0])
      ? meanPool(row as number[][])
      : (row as number[]);
  });
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const result: (number[] | undefined)[] = texts.map((t) => cache.get(t));
  const missingIdx = result
    .map((v, i) => (v ? -1 : i))
    .filter((i) => i >= 0);

  if (missingIdx.length > 0) {
    const missingTexts = missingIdx.map((i) => texts[i]);
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
      cache.set(texts[origIdx], vectors[k]);
      result[origIdx] = vectors[k];
    });
  }

  return result as number[][];
}
