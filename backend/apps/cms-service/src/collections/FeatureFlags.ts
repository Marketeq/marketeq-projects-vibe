import { CollectionConfig } from 'payload/types';
import { isAdminOrDeveloper } from '../access/roles';

export const FeatureFlags: CollectionConfig = {
  slug: 'feature-flags',
  admin: {
    useAsTitle: 'key',
    defaultColumns: ['key', 'enabled', 'rolloutPercentage'],
  },
  access: {
    read: isAdminOrDeveloper,
    create: isAdminOrDeveloper,
    update: isAdminOrDeveloper,
    delete: isAdminOrDeveloper,
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'rolloutPercentage',
      type: 'number',
      min: 0,
      max: 100,
      defaultValue: 100,
    },
  ],
};
