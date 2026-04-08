import type { CollectionConfig } from 'payload'

/**
 * Media — every uploaded file lives here. The S3 storage adapter
 * (configured in payload.config.ts) routes uploads to Cloudflare R2 via
 * R2's S3-compatible endpoint. Files are NEVER stored on the cms-service
 * filesystem.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'caption',
      type: 'text',
    },
  ],
  upload: {
    // Required image sizes the frontend consumes via signed CDN URLs.
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 300, position: 'centre' },
      { name: 'card', width: 768, height: 1024, position: 'centre' },
      { name: 'tablet', width: 1024, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*', 'video/mp4', 'application/pdf'],
  },
}
