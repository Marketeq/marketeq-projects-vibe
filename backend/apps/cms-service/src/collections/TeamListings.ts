import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper, isContentEditorOrAbove } from '../access/roles';
import { crossServiceSourceIdField } from '../fields/crossServiceSourceIdField';
import { syncTeamListing } from '../hooks/afterChange/syncTeamListing';

export const TeamListings: CollectionConfig = {
  slug: 'team-listings',
  labels: { singular: 'Team Listing', plural: 'Team Listings' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'featured', 'editorialLabel', 'updatedAt'],
    description: 'Editorial overlay for team listings. One record per team in listings-service.',
  },
  access: {
    read: () => true,
    create: isAdminOrDeveloper,
    update: isContentEditorOrAbove,
    delete: isAdmin,
  },
  hooks: { afterChange: [syncTeamListing] },
  fields: [
    crossServiceSourceIdField({
      required: true,
      unique: true,
      description: 'UUID of the team in listings-service. Auto-populated — do not edit.',
    }),
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
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
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Pin to featured sections on homepage or category pages.' },
    },
    {
      name: 'featuredOrder',
      type: 'number',
      admin: {
        condition: (data) => Boolean(data?.featured),
        description: 'Lower number = higher position in featured lists.',
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
      admin: { description: 'Badge shown on the listing card.' },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Editorial cover image. Overrides the team logo for promotional placements.' },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 300,
      admin: { description: 'Short marketing summary for cards and meta descriptions.' },
    },
    { name: 'category', type: 'relationship', relationTo: 'categories' },
    {
      name: 'rating',
      type: 'number',
      min: 0,
      max: 5,
      defaultValue: 0,
      admin: { hidden: true },
    },
    {
      name: 'reviewCount',
      type: 'number',
      defaultValue: 0,
      admin: { hidden: true },
    },
  ],
};
