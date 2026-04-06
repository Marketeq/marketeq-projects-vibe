// apps/category-service/src/content/content.types.ts
export type RelationKind = 'single' | 'many';

export interface ContentTypeConfig {
  /** human name for logs */
  name: string;
  /** Payload CMS collection slug (path after /api/) */
  api: string;
  /** relation field on that type that points to Category */
  categoryField: string;
  /** 'single' for one-to-one/ManyToOne; 'many' for ManyToMany */
  relation: RelationKind;
}

/**
 * Content types in Payload CMS that reference categories.
 * Used for reassignment when deleting/merging categories.
 */
export const CONTENT_TYPES: ContentTypeConfig[] = [
  { name: 'Listings', api: 'listings', categoryField: 'category', relation: 'single' },
  { name: 'BlogPosts', api: 'blog-posts', categoryField: 'category', relation: 'single' },
];
