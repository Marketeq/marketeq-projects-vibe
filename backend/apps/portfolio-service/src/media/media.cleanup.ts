/**
 * Extracts R2 storage keys from a portfolio's schemaJson (Editor.js format).
 * Walks the full JSON tree looking for URLs matching the CDN publicBase.
 */
export function extractKeysFromSchemaJson(schemaJson: unknown, publicBase?: string): string[] {
  if (!schemaJson || !publicBase) return [];

  const keys: string[] = [];
  const base = publicBase.replace(/\/$/, '');

  function walk(obj: unknown): void {
    if (typeof obj === 'string') {
      if (obj.startsWith(base + '/')) {
        keys.push(obj.slice(base.length + 1));
      }
      return;
    }
    if (Array.isArray(obj)) {
      for (const item of obj) walk(item);
      return;
    }
    if (obj && typeof obj === 'object') {
      for (const val of Object.values(obj as Record<string, unknown>)) {
        walk(val);
      }
    }
  }

  try {
    const parsed = typeof schemaJson === 'string' ? JSON.parse(schemaJson) : schemaJson;
    walk(parsed);
  } catch {
    // malformed JSON — return empty
  }

  return keys;
}
