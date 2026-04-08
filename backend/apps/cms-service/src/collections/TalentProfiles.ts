import { CollectionConfig } from 'payload/types';
import { isAdmin, isAdminOrDeveloper } from '../access/roles';
import {
  syncTalentProfileToService,
  deleteTalentProfileFromService,
} from '../hooks/afterChange/syncTalentProfiles';

export const TalentProfiles: CollectionConfig = {
  slug: 'talent-profiles',
  admin: {
    useAsTitle: 'username',
    defaultColumns: ['username', 'name', 'availability', 'status'],
    group: 'Talent Management',
  },
  access: {
    read: () => true,
    create: isAdminOrDeveloper,
    update: isAdminOrDeveloper,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [syncTalentProfileToService],
    afterDelete: [deleteTalentProfileFromService],
  },
  fields: [
    // ─── Identity ───────────────────────────────────────
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
              return require('crypto').randomUUID();
            }
            return value;
          },
        ],
      },
    },
    {
      name: 'sourceId',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'User UUID from user-service/auth-service. Links this CMS profile to the platform user.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'username',
          type: 'text',
          unique: true,
          index: true,
          required: true,
          minLength: 3,
          maxLength: 30,
          admin: { description: 'URL-safe slug. Lowercase, 3-30 chars.' },
          hooks: {
            beforeValidate: [
              ({ value }) => {
                if (typeof value === 'string') {
                  return value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
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
          admin: { description: 'Display name (first + last).' },
        },
      ],
    },
    {
      name: 'headline',
      type: 'text',
      admin: { description: 'Short professional title, e.g. "Expert React Developer"' },
    },

    // ─── Availability & Location ────────────────────────
    {
      type: 'row',
      fields: [
        {
          name: 'availability',
          type: 'select',
          options: [
            { label: '10 hrs/week', value: '10' },
            { label: '20 hrs/week', value: '20' },
            { label: '30 hrs/week', value: '30' },
            { label: '40 hrs/week', value: '40' },
          ],
        },
        {
          name: 'isAvailable',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'location', type: 'text', admin: { description: 'City or region' } },
        { name: 'country', type: 'text' },
        { name: 'timezone', type: 'text', admin: { description: 'e.g. America/New_York' } },
      ],
    },

    // ─── Rate ───────────────────────────────────────────
    {
      type: 'row',
      fields: [
        { name: 'rateMin', type: 'number', admin: { description: 'Min hourly rate (USD)' } },
        { name: 'rateMax', type: 'number', admin: { description: 'Max hourly rate (USD)' } },
      ],
    },

    // ─── Bio ────────────────────────────────────────────
    {
      name: 'overview',
      type: 'richText',
      admin: { description: 'Full professional bio' },
    },

    // ─── Skills & Expertise ─────────────────────────────
    {
      name: 'skills',
      type: 'array',
      admin: { description: 'Professional skills (tags)' },
      fields: [
        { name: 'name', type: 'text', required: true },
      ],
    },
    {
      name: 'industryExpertise',
      type: 'array',
      admin: { description: 'Industry domains' },
      fields: [
        { name: 'name', type: 'text', required: true },
      ],
    },
    {
      name: 'languages',
      type: 'array',
      fields: [
        { name: 'language', type: 'text', required: true },
        {
          name: 'fluency',
          type: 'select',
          options: [
            { label: 'Basic', value: 'basic' },
            { label: 'Conversational', value: 'conversational' },
            { label: 'Fluent', value: 'fluent' },
            { label: 'Native', value: 'native' },
          ],
        },
      ],
    },

    // ─── Certifications ─────────────────────────────────
    {
      name: 'certifications',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'organization', type: 'text' },
        { name: 'dateAwarded', type: 'date' },
      ],
    },

    // ─── Education ──────────────────────────────────────
    {
      name: 'education',
      type: 'array',
      fields: [
        { name: 'institution', type: 'text', required: true },
        { name: 'degree', type: 'text' },
        { name: 'graduationYear', type: 'number' },
      ],
    },

    // ─── Work Experience ────────────────────────────────
    {
      name: 'workExperience',
      type: 'array',
      fields: [
        { name: 'role', type: 'text', required: true },
        { name: 'company', type: 'text', required: true },
        { name: 'startDate', type: 'date' },
        { name: 'endDate', type: 'date' },
        { name: 'description', type: 'textarea' },
      ],
    },

    // ─── Portfolio ──────────────────────────────────────
    {
      name: 'portfolio',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'url', type: 'text' },
        { name: 'thumbnail', type: 'upload', relationTo: 'media' },
        { name: 'description', type: 'textarea' },
      ],
    },

    // ─── Status ─────────────────────────────────────────
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' },
        { label: 'Suspended', value: 'suspended' },
      ],
    },
  ],
};
