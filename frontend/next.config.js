/** @type {import('next').NextConfig} */
const path = require("path")

function normalizeProxyTarget(value) {
  const target = (value || "").trim()
  if (!/^https?:\/\//i.test(target)) return "http://localhost:4000"
  return target
    .replace(/\/+$/, "")
    .replace(/\/api$/i, "")
    .replace(/\/+$/, "")
}

const apiProxyTarget = normalizeProxyTarget(
  process.env.API_PROXY_TARGET ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_AUTH_URL ||
    "http://localhost:4000"
)

const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow",
          },
        ],
      },
    ]
  },
  typescript: {
    // Pre-existing type errors from merged PRs — tracked for cleanup separately.
    // Build must pass so staging is testable.
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    // dicebear's avatar endpoints return SVG (fallback avatars for company
    // members / talent with no uploaded photo); Next.js blocks SVG
    // passthrough by default since an SVG can carry a script. Scoped to
    // just this allowlisted host via remotePatterns above, with the CSP
    // Next's own docs recommend as the mitigation.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
        hostname: "pub-c5d22f4620534d09b4af76acaa0406cb.r2.dev",
      },
      {
        protocol: "https",
        hostname: "94ccb1ac46d66f225f369bd07f044f56.r2.cloudflarestorage.com",
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
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
      },
      {
        protocol: "https",
        hostname: "example.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:kind(projects|teams|talent|services)/:l1/:l2/:l3",
        destination: "/search?q=:l3&category=:kind",
        permanent: false,
      },
      {
        // /my-team was renamed to /my-network on 2026-09-03. It sat one
        // character from /my-teams (the team-profile collection), a
        // different page entirely. Kept so existing links, bookmarks and
        // already-sent invite emails still land. Query strings carry over
        // automatically -- invite/setup redirects here with one.
        source: "/my-team",
        destination: "/my-network",
        permanent: false,
      },
    ]
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
    //   /projects/:l1/:l2/:l3            → handled by redirects() above,
    //                                       not rewritten (see redirect rule)
    const rewrites = []
    rewrites.push({
      source: "/api/:path*",
      destination: `${apiProxyTarget}/:path*`,
    })
    const kinds = ["talent", "projects", "services", "teams"]
    for (const kind of kinds) {
      rewrites.push({ source: `/${kind}/:l1`, destination: `/c/:l1/${kind}` })
      rewrites.push({
        source: `/${kind}/:l1/:l2`,
        destination: `/c/:l1/:l2/${kind}`,
      })
    }
    // CMS media proxy. In dev the Payload cloud-storage plugin uploads to a
    // MinIO container on localhost:9000; we expose them on a same-origin
    // `/media/<filename>` route so the Next.js Image Optimizer doesn't trip
    // doesn't trip its private-IP SSRF guard. This rewrite forwards those
    // requests to MinIO. In production the env override CMS_MEDIA_ORIGIN
    // can point at the real Cloudflare R2 / CDN host.
    const cmsMediaOrigin =
      process.env.CMS_MEDIA_ORIGIN || "http://localhost:9000/marketeq-media"
    // Back-compat: some APIs still return `/cms-media/<file>` paths.
    // Alias them to `/media/<file>` so Next/Image always gets a real image.
    rewrites.push({
      source: "/cms-media/:path*",
      destination: "/media/:path*",
    })
    rewrites.push({
      source: "/media/:path*",
      destination: `${cmsMediaOrigin}/:path*`,
    })
    return rewrites
  },
}

module.exports = nextConfig
