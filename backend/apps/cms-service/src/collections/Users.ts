import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper } from '../access/roles';

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'status'],
  },
  access: {
    read: isAdminOrDeveloper,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'sourceId',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'UUID from user-service/auth-service' },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'userType',
      type: 'select',
      options: [
        { label: 'Client', value: 'client' },
        { label: 'Talent', value: 'talent' },
        { label: 'Admin', value: 'admin' },
      ],
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Developer', value: 'developer' },
        { label: 'Content Editor', value: 'content_editor' },
        { label: 'Author', value: 'author' },
      ],
      admin: {
        condition: (data) => data?.userType === 'admin',
      },
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Suspended', value: 'suspended' },
        { label: 'Deleted', value: 'deleted' },
      ],
    },
    {
      name: 'verifiedAt',
      type: 'date',
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Internal admin notes — never shown to user' },
    },
  ],
};
