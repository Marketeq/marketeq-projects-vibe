// apps/category-sync-service/src/content/content.types.ts
export type RelationKind = 'single' | 'many';

export interface ContentTypeConfig {
  /** human name for logs */
  name: string;
  /** Strapi v4 plural UID (path after /api/) */
  api: string;
  /** relation field on that type that points to Category */
  categoryField: string;
  /** 'single' for one-to-one/ManyToOne; 'many' for ManyToMany */
  relation: RelationKind;
}

/**
 * CURRENT STRAPI SETUP (from your schemas):
 * - Tag has a many-to-many relation to Category via `categories`.
 * Add more types here later (e.g., listings, projects) when they exist.
 */
export const CONTENT_TYPES: ContentTypeConfig[] = [
  { name: 'Tags', api: 'tags', categoryField: 'categories', relation: 'many' },
];
