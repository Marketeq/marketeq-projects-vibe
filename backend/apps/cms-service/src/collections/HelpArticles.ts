import { CollectionConfig } from 'payload/types';
import { isAdmin, isAuthorOfDocument, isContentEditorOrAbove, isPublished } from '../access/roles';

export const HelpArticles: CollectionConfig = {
  slug: 'help-articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'topic', 'status', 'helpfulCount'],
  },
  access: {
    read: isPublished,
    create: isContentEditorOrAbove,
    update: isAuthorOfDocument,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'body',
      type: 'richText',
    },
    {
      name: 'topic',
      type: 'select',
      options: [
        { label: 'Getting Started', value: 'getting-started' },
        { label: 'Billing', value: 'billing' },
        { label: 'Contracts', value: 'contracts' },
        { label: 'Account', value: 'account' },
        { label: 'Marketplace', value: 'marketplace' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'helpfulCount',
      type: 'number',
      defaultValue: 0,
      admin: { readOnly: true },
    },
    {
      name: 'relatedArticles',
      type: 'relationship',
      relationTo: 'help-articles',
      hasMany: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Archived', value: 'archived' },
      ],
    },
  ],
};
