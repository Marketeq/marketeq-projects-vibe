import { Access, CollectionConfig } from 'payload/types';
import { isAdmin, isContentEditorOrAbove } from '../access/roles';
import {
  syncAnnouncementToBroadcast,
  deleteAnnouncementFromBroadcast,
} from '../hooks/afterChange/syncAnnouncements';

// Per CS-07 §lines 220-228 announcements are user-facing — audience
// values `all`, `clients`, `talent`, `admins` describe who should see
// the banner. Editors (and above) see everything for management; everyone
// else sees only published, in-window, audience-matching rows.
const readPublishedToAudience: any = ({ req: { user } }: any) => {
  const role = (user as { role?: string } | null | undefined)?.role;
  if (role && ['admin', 'developer', 'content_editor'].includes(role)) return true;
  const userType = (user as { userType?: string } | null | undefined)?.userType;
  const audiences: Array<string> = ['all'];
  if (userType === 'client') audiences.push('clients');
  if (userType === 'talent') audiences.push('talent');
  if (userType === 'admin') audiences.push('admins');
  const now = new Date().toISOString();
  return {
    and: [
      { status: { equals: 'published' } },
      { or: [{ startDate: { exists: false } }, { startDate: { less_than_equal: now } }] },
      { or: [{ endDate: { exists: false } }, { endDate: { greater_than_equal: now } }] },
      { audience: { in: audiences } },
    ],
  };
};

export const Announcements: CollectionConfig = {
  slug: 'announcements',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'audience', 'priority', 'status'],
  },
  access: {
    read: readPublishedToAudience,
    create: isContentEditorOrAbove,
    update: isContentEditorOrAbove,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [syncAnnouncementToBroadcast],
    afterDelete: [deleteAnnouncementFromBroadcast],
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
