import { pipeline } from '@xenova/transformers';

let embedder: any;

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  const embeddings = [];
  for (const text of texts) {
    const result = await embedder(text, { pooling: 'mean', normalize: true });
    embeddings.push(result.data);
  }

  return embeddings;
}
