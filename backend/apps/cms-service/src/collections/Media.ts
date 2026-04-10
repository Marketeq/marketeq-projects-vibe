import { CollectionConfig } from 'payload/types';
import { isContentEditorOrAbove } from '../access/roles';

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticURL: '/media',
    staticDir: 'media',
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
