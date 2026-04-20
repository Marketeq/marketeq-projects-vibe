import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // cms-service is internal — no public assets, no image domains needed.
  // The frontend never imports from here. Payload's admin panel is the only UI.
  reactStrictMode: true,
  experimental: {
    reactCompiler: false,
  },
}

export default withPayload(nextConfig)
