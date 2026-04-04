/**
 * Extracts keys from a schema JSON object
 */
export function extractKeysFromSchemaJson(schemaJson: any, publicBase?: string): string[] {
  if (!schemaJson) return [];
  try {
    const obj = typeof schemaJson === 'string' ? JSON.parse(schemaJson) : schemaJson;
    return Object.keys(obj);
  } catch {
    return [];
  }
}
