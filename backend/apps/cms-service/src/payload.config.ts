import { buildConfig } from 'payload/config';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { webpackBundler } from '@payloadcms/bundler-webpack';
import seoPlugin from '@payloadcms/plugin-seo';

// Collections
import { Listings } from './collections/Listings';
import { Users } from './collections/Users';
import { Orders } from './collections/Orders';
import { Categories } from './collections/Categories';
import { TalentProfiles } from './collections/TalentProfiles';
import { BlogPosts } from './collections/BlogPosts';
import { HelpArticles } from './collections/HelpArticles';
import { Announcements } from './collections/Announcements';
import { FeatureFlags } from './collections/FeatureFlags';
import { Media } from './collections/Media';
import { Testimonials } from './collections/Testimonials';
import { LandingPages } from './collections/LandingPages';

// Globals
import { SiteSettings } from './globals/SiteSettings';
import { HomepageBanner } from './globals/HomepageBanner';
import { AdminConfig } from './globals/AdminConfig';

// Plugins
import { categorySyncPlugin } from './plugins/categorySync.plugin';
import { talentProfileSyncPlugin } from './plugins/talentProfileSync.plugin';

export default buildConfig({
  serverURL: process.env.CMS_SERVER_URL || 'http://localhost:3020',

  admin: {
    user: Users.slug,
    disable: process.env.PAYLOAD_ADMIN_DISABLE === 'true',
    bundler: webpackBundler(),
    webpack: (config) => {
      // Prevent server-only modules from being bundled into admin UI
      return {
        ...config,
        resolve: {
          ...config.resolve,
          fallback: {
            ...(config.resolve?.fallback || {}),
            fs: false,
            net: false,
            tls: false,
            dns: false,
            util: false,
            stream: false,
            crypto: false,
            os: false,
            path: false,
            url: false,
            buffer: false,
            events: false,
          },
          alias: {
            ...(config.resolve?.alias || {}),
            // Stub out server-only RabbitMQ modules for admin panel
            'amqplib': false,
            'amqp-connection-manager': false,
          },
        },
      };
    },
  },

  editor: lexicalEditor({}),

  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL,
    },
    schemaName: 'cms',
  }),

  collections: [
    Listings,
    Users,
    Orders,
    Categories,
    TalentProfiles,
    BlogPosts,
    HelpArticles,
    Announcements,
    FeatureFlags,
    Media,
    Testimonials,
    LandingPages,
  ],

  globals: [
    SiteSettings,
    HomepageBanner,
    AdminConfig,
  ],

  plugins: [
    categorySyncPlugin,
    talentProfileSyncPlugin,
    seoPlugin({
      uploadsCollection: 'media',
      generateTitle: ({ doc }: any) => `${doc?.title || 'Marketeq'} | Marketeq`,
      generateDescription: ({ doc }: any) => doc?.excerpt || doc?.description || '',
    }),
  ],

  typescript: {
    outputFile: './src/payload-types.ts',
  },
});
