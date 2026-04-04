/**
 * Stub: embedding generation for similar-profiles.
 * TODO: Replace with actual embedding service (OpenAI, etc.) when ready.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  // Return zero vectors as placeholder
  return texts.map(() => new Array(128).fill(0));
}
