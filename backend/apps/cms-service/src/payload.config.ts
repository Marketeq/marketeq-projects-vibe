import { buildConfig } from "payload/config";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { webpackBundler } from "@payloadcms/bundler-webpack";
import seoPlugin from "@payloadcms/plugin-seo";
import { cloudStorage } from "@payloadcms/plugin-cloud-storage";
import { s3Adapter } from "@payloadcms/plugin-cloud-storage/s3";

// Collections
import { Listings } from "./collections/Listings";
import { Users } from "./collections/Users";
import { Orders } from "./collections/Orders";
import { Categories } from "./collections/Categories";
import { TalentProfiles } from "./collections/TalentProfiles";
import { BlogPosts } from "./collections/BlogPosts";
import { HelpArticles } from "./collections/HelpArticles";
import { Announcements } from "./collections/Announcements";
import { FeatureFlags } from "./collections/FeatureFlags";
import { Media } from "./collections/Media";
import { Testimonials } from "./collections/Testimonials";
import { LandingPages } from "./collections/LandingPages";
import { Homepages } from "./collections/Homepages";
import { CategoryPages } from "./collections/CategoryPages";
import { Projects } from "./collections/Projects";
import { ProjectStaticContents } from "./collections/ProjectStaticContents";

// Globals
import { SiteSettings } from "./globals/SiteSettings";
import { HomepageBanner } from "./globals/HomepageBanner";
import { AdminConfig } from "./globals/AdminConfig";

// Plugins
import { categorySyncPlugin } from "./plugins/categorySync.plugin";
import { talentProfileSyncPlugin } from "./plugins/talentProfileSync.plugin";

export default buildConfig({
  serverURL: process.env.CMS_SERVER_URL || "http://localhost:3020",

  admin: {
    user: Users.slug,
    disable: process.env.PAYLOAD_ADMIN_DISABLE === "true",
    bundler: webpackBundler(),
    webpack: (config) => {
      // Prevent server-only modules from being bundled into admin UI.
      // NOTE: The `sass` package is a peer dep of sass-loader and must be
      // installed for the default Payload webpack CSS/SCSS rule to compile
      // node_modules/.scss files (e.g. @payloadcms/richtext-lexical). See
      // package.json devDependencies.
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
            amqplib: false,
            "amqp-connection-manager": false,
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
    schemaName: "cms",
  }),

  collections: [
    Listings,
    Users,
    Orders,
    Categories,
    CategoryPages,
    TalentProfiles,
    BlogPosts,
    HelpArticles,
    Announcements,
    FeatureFlags,
    Media,
    Testimonials,
    LandingPages,
    Homepages,
    Projects,
    ProjectStaticContents,
  ],

  globals: [SiteSettings, HomepageBanner, AdminConfig],

  plugins: [
    // Cloudflare R2 (S3-compatible) media storage. In dev this points at a
    // local MinIO container and R2_PUBLIC_URL is a same-origin path so the
    // Next.js Image Optimizer doesn't trip its private-IP SSRF guard. In
    // prod, R2_PUBLIC_URL is the real Cloudflare CDN URL — same code path.
    cloudStorage({
      collections: {
        media: {
          adapter: s3Adapter({
            config: {
              endpoint: process.env.R2_ENDPOINT,
              region: "auto",
              credentials: {
                accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
                secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
              },
              forcePathStyle: true,
            },
            bucket: process.env.R2_BUCKET || "marketeq-media",
          }),
          generateFileURL: ({ filename }) => {
            const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
            return `${base}/${filename}`;
          },
          disableLocalStorage: true,
        },
      },
    }),
    categorySyncPlugin,
    talentProfileSyncPlugin,
    seoPlugin({
      uploadsCollection: "media",
      generateTitle: ({ doc }: any) => `${doc?.title || "Marketeq"} | Marketeq`,
      generateDescription: ({ doc }: any) =>
        doc?.excerpt || doc?.description || "",
    }),
  ],

  typescript: {
    outputFile: "./src/payload-types.ts",
  },
});
