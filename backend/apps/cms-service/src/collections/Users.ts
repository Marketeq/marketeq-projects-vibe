import { CollectionConfig } from 'payload/types';
import { isAdmin } from '../access/roles';

export const Users: CollectionConfig = {
  slug: 'users',
  // Enables Payload's native per-user API Key strategy. Adds the "Enable API
  // Key" toggle + "Generate New API Key" button under each user in the admin,
  // and three columns to the users table (enable_a_p_i_key, api_key,
  // api_key_index). Additive — email/password login and /admin UI behaviour
  // are unchanged. Header format for consumers is `Authorization: users
  // API-Key <key>` (collection-slug prefix is required by Payload).
  auth: { useAPIKey: true },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'status'],
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      const role = (user as any)?.role;
      if (role === 'admin' || role === 'developer') return true;
      return { id: { equals: user.id } };
    },
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
