import { GlobalConfig } from 'payload/types';
import { isContentEditorOrAbove } from '../access/roles';

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: () => true,
    update: isContentEditorOrAbove,
  },
  fields: [
    {
      name: 'platformName',
      type: 'text',
      defaultValue: 'Marketeq',
    },
    {
      name: 'supportEmail',
      type: 'email',
    },
    {
      name: 'socialLinks',
      type: 'group',
      fields: [
        { name: 'twitter', type: 'text' },
        { name: 'linkedin', type: 'text' },
        { name: 'instagram', type: 'text' },
        { name: 'facebook', type: 'text' },
      ],
    },
    {
      name: 'defaultSeoTitle',
      type: 'text',
      maxLength: 60,
    },
    {
      name: 'defaultSeoDescription',
      type: 'textarea',
      maxLength: 160,
    },
    {
      name: 'cookieConsentCopy',
      type: 'textarea',
    },
    {
      name: 'termsUrl',
      type: 'text',
    },
    {
      name: 'privacyUrl',
      type: 'text',
    },
  ],
};
