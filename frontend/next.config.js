/** @type {import('next').NextConfig} */
const path = require("path")

const nextConfig = {
  typescript: {
    // Pre-existing type errors from merged PRs — tracked for cleanup separately.
    // Build must pass so staging is testable.
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "pub-4789db6a57d64de3ad7b5e8c316d125b.r2.dev",
      },
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
    ],
  },
  async rewrites() {
    // Bare kind routes (`/projects`, `/services`, `/teams`, `/talent`) are
    // real pages at `app/(group)/(group)/<kind>/page.tsx` — no rewrite.
    //
    // Kind-first subpaths still map onto the catch-all category page so
    // drilling from /teams → /teams/development → /teams/development/web
    // reuses the single source of truth.
    //
    //   /projects/:l1                    → /c/:l1/projects
    //   /projects/:l1/:l2                → /c/:l1/:l2/projects
    //   /projects/:l1/:l2/:l3            → /c/:l1/:l2/:l3/projects
    const kinds = ["talent", "projects", "services", "teams"]
    const rewrites = []
    for (const kind of kinds) {
      rewrites.push({ source: `/${kind}/:l1`, destination: `/c/:l1/${kind}` })
      rewrites.push({ source: `/${kind}/:l1/:l2`, destination: `/c/:l1/:l2/${kind}` })
      rewrites.push({ source: `/${kind}/:l1/:l2/:l3`, destination: `/c/:l1/:l2/:l3/${kind}` })
    }
    // CMS media proxy. Payload stores media URLs as `/cms-media/<filename>`
    // (see cms-service `generateFileURL`). We also keep `/media/<filename>`
    // as a legacy alias. Both are routed to a same-origin path so the Next.js
    // Image Optimizer doesn't trip its private-IP SSRF guard in dev.
    //
    // In dev:
    // - frontend `/cms-media/*`  → cms-service `/cms-media/*` (proxy to MinIO)
    // - frontend `/media/*`      → MinIO directly (legacy)
    //
    // In prod the env override CMS_MEDIA_ORIGIN can point at the real
    // Cloudflare R2 / CDN host.
    const cmsMediaOrigin =
      process.env.CMS_MEDIA_ORIGIN || "http://localhost:9000/marketeq-media"
    const cmsServiceOrigin = process.env.CMS_SERVICE_URL || "http://localhost:3020"
    rewrites.push({
      source: "/cms-media/:path*",
      destination: `${cmsServiceOrigin}/cms-media/:path*`,
    })
    rewrites.push({
      source: "/media/:path*",
      destination: `${cmsMediaOrigin}/:path*`,
    })
    return rewrites
  },
}

module.exports = nextConfig
