import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper, isContentEditorOrAbove } from '../access/roles';

export const Listings: CollectionConfig = {
  slug: 'listings',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'listingType', 'status', 'featured'],
  },
  access: {
    read: () => true,
    create: isAdminOrDeveloper,
    update: isContentEditorOrAbove,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'sourceId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { description: 'UUID from listings-service' },
    },
    {
      name: 'listingType',
      type: 'select',
      options: [
        { label: 'Project', value: 'project' },
        { label: 'Service', value: 'service' },
        { label: 'Team', value: 'team' },
        { label: 'Talent', value: 'talent' },
        { label: 'Job', value: 'job' },
      ],
    },
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
      name: 'excerpt',
      type: 'textarea',
      maxLength: 300,
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'featuredOrder',
      type: 'number',
      admin: {
        condition: (data) => Boolean(data?.featured),
      },
    },
    {
      name: 'editorialLabel',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'Top Pick', value: 'top_pick' },
        { label: 'New', value: 'new' },
        { label: 'Trending', value: 'trending' },
        { label: 'Staff Pick', value: 'staff_pick' },
        { label: 'None', value: 'none' },
      ],
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'rating',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 0,
      admin: { description: 'Average rating (0-5), synced from reviews' },
    },
    {
      name: 'reviewCount',
      type: 'number',
      defaultValue: 0,
    },
    {
      name: 'price',
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
    {
      name: 'publishedAt',
      type: 'date',
    },
  ],
};
