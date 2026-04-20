import { GlobalConfig } from 'payload/types';
import { isContentEditorOrAbove } from '../access/roles';
import { syncHomepageBannerToBroadcast } from '../hooks/afterChange/syncHomepageBanner';

export const HomepageBanner: GlobalConfig = {
  slug: 'homepage-banner',
  access: {
    read: () => true,
    update: isContentEditorOrAbove,
  },
  hooks: {
    afterChange: [syncHomepageBannerToBroadcast],
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'message',
      type: 'text',
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
      name: 'expiresAt',
      type: 'date',
    },
    {
      name: 'bannerType',
      type: 'select',
      defaultValue: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Promo', value: 'promo' },
        { label: 'Warning', value: 'warning' },
      ],
    },
  ],
};
