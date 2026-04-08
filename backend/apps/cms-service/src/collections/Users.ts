import type { CollectionConfig } from 'payload'

/**
 * Users — powers the Payload admin panel login.
 *
 * Per CS-06 (Permissions & Access Control), we expose four roles:
 *   - admin           Full control over every collection and global
 *   - developer       Same as admin in non-production environments
 *   - content_editor  Can create/update content collections, cannot publish
 *   - author          Can draft their own content, cannot publish
 *
 * Access functions in src/access/ read this `role` field to gate operations.
 * This collection is internal to cms-service and is NEVER synced to the
 * NestJS user-service — those are platform users (talents/clients), these
 * are CMS staff.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'updatedAt'],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'author',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Developer', value: 'developer' },
        { label: 'Content Editor', value: 'content_editor' },
        { label: 'Author', value: 'author' },
      ],
    },
  ],
}
