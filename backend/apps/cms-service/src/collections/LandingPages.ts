import { CollectionConfig } from 'payload/types';
import { isAdmin, isContentEditorOrAbove } from '../access/roles';

export const LandingPages: CollectionConfig = {
  slug: 'landing-pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status'],
  },
  access: {
    read: () => true,
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
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'headline', type: 'text' },
        { name: 'subheadline', type: 'text' },
        { name: 'ctaLabel', type: 'text' },
        { name: 'ctaUrl', type: 'text' },
      ],
    },
    {
      name: 'sections',
      type: 'array',
      fields: [
        {
          name: 'blockType',
          type: 'select',
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Image', value: 'image' },
            { label: 'CTA', value: 'cta' },
            { label: 'Features', value: 'features' },
            { label: 'Testimonials', value: 'testimonials' },
          ],
        },
        {
          name: 'content',
          type: 'richText',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
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
