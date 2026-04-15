import { randomUUID } from 'crypto';
import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper } from '../access/roles';
import { syncCategoryToService, deleteCategoryFromService } from '../hooks/afterChange/syncCategories';

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'status', 'sortOrder'],
  },


  access: {
    read: () => true,
    create: isAdminOrDeveloper,
    update: isAdminOrDeveloper,
    delete: isAdmin,
    // --- For emergency admin bootstrapping, uncomment below ---
    // read: () => true,
    // create: () => true,
    // update: () => true,
    // delete: () => true,
  },
  hooks: {
    afterChange: [syncCategoryToService],
    afterDelete: [deleteCategoryFromService],
  },
  fields: [
    {
      name: 'uuid',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'Stable UUID for cross-service identity. Auto-generated on create.' },
      hooks: {
        beforeValidate: [
          ({ value, operation }) => {
            if (operation === 'create' && !value) {
              return randomUUID();
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'name',
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
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: false,
    },
    {
      name: 'listingTypes',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Project', value: 'project' },
        { label: 'Service', value: 'service' },
        { label: 'Team', value: 'team' },
        { label: 'Talent', value: 'talent' },
        { label: 'Job', value: 'job' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
      ],
    },
    {
      name: 'sortOrder',
      type: 'number',
    },
    {
      name: 'algoliaFacetOrder',
      type: 'number',
    },
  ],
};
