import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper } from '../access/roles';
import { crossServiceSourceIdField } from '../fields/crossServiceSourceIdField';
import { syncOrderToService } from '../hooks/afterChange/syncOrders';

export const Orders: CollectionConfig = {
  slug: 'orders',
  hooks: {
    afterChange: [syncOrderToService],
  },
  admin: {
    useAsTitle: 'orderNumber',
    defaultColumns: ['orderNumber', 'orderType', 'status', 'totalAmount'],
  },
  access: {
    read: isAdminOrDeveloper,
    create: isAdminOrDeveloper,
    update: isAdminOrDeveloper,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'orderNumber',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    crossServiceSourceIdField({
      required: false,
      unique: false,
      description: 'Contract / transaction ID from contracts-service.',
    }),
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'users',
      required: true,
    },
    {
      name: 'talent',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'listing',
      type: 'relationship',
      relationTo: 'listings',
    },
    {
      name: 'orderType',
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
      name: 'totalAmount',
      type: 'number',
      admin: { description: 'Amount in USD cents' },
    },
    {
      name: 'currency',
      type: 'text',
      defaultValue: 'USD',
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Active', value: 'active' },
        { label: 'Completed', value: 'completed' },
        { label: 'Disputed', value: 'disputed' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      name: 'notes',
      type: 'textarea',
    },
    {
      name: 'startDate',
      type: 'date',
    },
    {
      name: 'endDate',
      type: 'date',
    },
  ],
};
