import { CollectionConfig } from 'payload/types';
import { isContentEditorOrAbove } from '../access/roles';

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    // Local disk fields are intentionally omitted — the cloudStoragePlugin
    // (configured in payload.config.ts) ships uploads directly to Cloudflare
    // R2 (or MinIO in local dev) and disables local storage.
    mimeTypes: ['image/*', 'application/pdf'],
  },
  admin: {
    useAsTitle: 'alt',
  },
  access: {
    read: () => true,
    create: isContentEditorOrAbove,
    update: isContentEditorOrAbove,
    delete: isContentEditorOrAbove,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'caption',
      type: 'text',
    },
    {
      name: 'credit',
      type: 'text',
    },
  ],
};
