import { CollectionConfig } from 'payload/types';
import { isAdmin, isContentEditorOrAbove } from '../access/roles';

export const Announcements: CollectionConfig = {
  slug: 'announcements',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'audience', 'priority', 'status'],
  },
  access: {
    read: isContentEditorOrAbove,
    create: isContentEditorOrAbove,
    update: isContentEditorOrAbove,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'message',
      type: 'richText',
    },
    {
      name: 'audience',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Clients', value: 'clients' },
        { label: 'Talent', value: 'talent' },
        { label: 'Admins', value: 'admins' },
      ],
    },
    {
      name: 'startDate',
      type: 'date',
    },
    {
      name: 'endDate',
      type: 'date',
    },
    {
      name: 'ctaLabel',
      type: 'text',
    },
    {
      name: 'ctaUrl',
      type: 'text',
    },
    {
      name: 'priority',
      type: 'number',
      defaultValue: 0,
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
