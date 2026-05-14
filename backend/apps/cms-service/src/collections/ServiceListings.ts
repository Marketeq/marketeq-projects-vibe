import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper, isContentEditorOrAbove } from '../access/roles';
import { crossServiceSourceIdField } from '../fields/crossServiceSourceIdField';
import { syncServiceListing } from '../hooks/afterChange/syncServiceListing';

export const ServiceListings: CollectionConfig = {
  slug: 'service-listings',
  labels: { singular: 'Service Listing', plural: 'Service Listings' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'featured', 'editorialLabel', 'updatedAt'],
    description: 'Editorial overlay for service listings. One record per service in listings-service.',
  },
  access: {
    read: () => true,
    create: isAdminOrDeveloper,
    update: isContentEditorOrAbove,
    delete: isAdmin,
  },
  hooks: { afterChange: [syncServiceListing] },
  fields: [
    crossServiceSourceIdField({
      required: true,
      unique: true,
      description: 'UUID of the service in listings-service. Auto-populated — do not edit.',
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
    { name: 'featured', type: 'checkbox', defaultValue: false },
    {
      name: 'featuredOrder',
      type: 'number',
      admin: { condition: (data) => Boolean(data?.featured) },
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
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Editorial cover image for promotional placements.' },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      maxLength: 300,
      admin: { description: 'Short summary synced to shortDescription in listings-service.' },
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
    {
      name: 'priceMin',
      type: 'number',
      admin: { hidden: true },
    },
    {
      name: 'priceMax',
      type: 'number',
      admin: { hidden: true },
    },
    {
      name: 'deliveryTime',
      type: 'text',
      admin: { hidden: true },
    },
  ],
};
