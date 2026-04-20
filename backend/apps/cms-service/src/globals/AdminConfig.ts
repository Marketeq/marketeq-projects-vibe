import { GlobalConfig } from 'payload/types';
import { isAdmin } from '../access/roles';

export const AdminConfig: GlobalConfig = {
  slug: 'admin-config',
  admin: {
    hidden: ({ user }) => {
      return (user as any)?.role !== 'admin';
    },
  },
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  fields: [
    {
      name: 'maintenanceMode',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'maintenanceMessage',
      type: 'textarea',
    },
    {
      name: 'featuredListingsLimit',
      type: 'number',
      defaultValue: 6,
    },
    {
      name: 'orderReviewThresholdCents',
      type: 'number',
      defaultValue: 50000,
      admin: { description: 'Orders above this amount (cents) require admin review' },
    },
    {
      name: 'flagThreshold',
      type: 'number',
      defaultValue: 3,
      admin: { description: 'Number of flags before auto-escalation' },
    },
  ],
};
