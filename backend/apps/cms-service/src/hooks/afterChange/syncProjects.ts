import {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from "payload/types";

/**
 * Payload Projects → listings-service sync.
 *
 * NestJS Postgres is the source of truth (per the project-sync architecture
 * doc); Payload is the editorial overlay. After every save / delete in the
 * Payload admin we POST the document to listings-service which upserts
 * `listings.projects` keyed on `payloadId`.
 *
 * Uses HTTP rather than the existing CmsEventPublisher path because:
 *   1. RabbitMQ is not running locally and the listings-service has no
 *      project consumer wired yet.
 *   2. listings-service already exposes `POST /internal/project-sync` and
 *      `DELETE /internal/project-sync/:payloadId` for exactly this purpose.
 *   3. The same auth (CMS_SYNC_TOKEN bearer) is shared end-to-end.
 *
 * The hook resolves Payload media references to absolute URLs before
 * forwarding so listings-service does not need to call back into Payload.
 */

interface ResolvedMediaRef {
  url?: string;
  filename?: string;
}

type DeliverableGroup = { phaseLabel?: string; phaseName?: string; items?: string[] };

type ProjectSyncProjection = {
  id: number | string;
  title: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: unknown;
  deliverables?: unknown;
  faqQuestions?: unknown;
  categories?: unknown;
  subcategories?: unknown;
  tags?: unknown;
  projectSkills?: unknown;
  programmingLanguages?: unknown;
  developmentTechnologies?: unknown;
  totalEstimatedHours?: number;
  timelineValue?: number;
  timelineUnit?: string;
  priceRangeMin?: number;
  priceRangeMax?: number;
  pricingModel?: string;
  priceViewMode?: string;
  projectType?: string;
  klarnaPaymentEnabled?: boolean;
  recentQuestions?: unknown;
  skillsAndTools?: unknown;
  helpButtonEnabled?: boolean;
  featured?: boolean;
  _status?: "draft" | "published" | "archived" | "flagged";
  status?: "draft" | "published" | "archived" | "flagged";
  thumbnailUrl?: string;
  galleryUrls?: string[];
  videoUrl?: string;
  scope?: unknown;
  industries?: unknown;
  relatedProjects?: unknown;
  datePublished?: string;
  projectDurationLabel?: string;
  ownerId?: string;
};

function isResolvedMedia(value: unknown): value is ResolvedMediaRef {
  if (typeof value !== "object") return false;
  const obj = Object(value);
  return "url" in obj || "filename" in obj;
}

/**
 * Resolve a Payload media reference into a URL the frontend can serve.
 *
 * Payload's cloud-storage plugin computes URLs as `${serverURL}${publicUrl}/${filename}`
 * which produces `http://localhost:3020/cms-media/<file>` in dev. The Next.js
 * frontend would then have to fetch that absolute URL — but its Image Optimizer
 * rejects any host that resolves to a private IP (SSRF guard), and the prod
 * CDN URL we want to use is `https://cdn.marketeqdigital.com/...` anyway.
 *
 * To avoid both problems we strip the cms-service host so what we forward is a
 * same-origin path like `/cms-media/<file>`, which the frontend's Next.js
 * rewrite proxies to MinIO in dev and to the real CDN in prod via
 * `CMS_MEDIA_ORIGIN`.
 */
function mediaUrl(value: unknown, baseUrl: string): string | null {
  if (!value) return null;
  const baseClean = baseUrl.replace(/\/$/, "");
  const stripBase = (url: string): string =>
    baseClean && url.startsWith(baseClean) ? url.slice(baseClean.length) : url;

  if (typeof value === "string") return stripBase(value);
  if (isResolvedMedia(value)) {
    if (value.url) {
      return value.url.startsWith("http") ? stripBase(value.url) : value.url;
    }
    if (value.filename) {
      return `/cms-media/${value.filename}`;
    }
  }
  return null;
}

/**
 * Walk a Lexical rich-text tree and replace any `upload` node's raw ID
 * with the populated media doc (url, alt, width, height, filename) so
 * downstream services can render <img> tags without Payload access.
 *
 * Returns a NEW tree — does not mutate `node` in place.
 */
async function populateLexicalUploads(
  node: unknown,
  resolveMedia: (ref: unknown) => Promise<unknown>,
  baseUrl: string,
): Promise<unknown> {
  if (node == null) return node;
  if (Array.isArray(node)) {
    return Promise.all(
      node.map((child) => populateLexicalUploads(child, resolveMedia, baseUrl)),
    );
  }
  if (typeof node !== "object") return node;

  const n = { ...(node as Record<string, unknown>) };

  // Lexical wraps the editor state in { root: { ... } }
  if (n.root) {
    n.root = await populateLexicalUploads(n.root, resolveMedia, baseUrl);
    return n;
  }

  // Recurse into children first so nested upload nodes are handled.
  if (Array.isArray(n.children)) {
    n.children = await Promise.all(
      (n.children as unknown[]).map((c) =>
        populateLexicalUploads(c, resolveMedia, baseUrl),
      ),
    );
  }

  // Resolve upload nodes — their `value` may be a raw ID, a minimal doc
  // from depth=0, or an already-populated doc. Normalize to a populated
  // doc with `url` rewritten to a same-origin `/cms-media/...` path.
  if (n.type === "upload") {
    const raw = n.value;
    const resolved = await resolveMedia(
      raw && typeof raw === "object"
        ? ((raw as Record<string, unknown>).id ?? raw)
        : raw,
    );
    if (resolved && typeof resolved === "object") {
      const media = { ...(resolved as Record<string, unknown>) } as Record<
        string,
        unknown
      >;
      const rewritten = mediaUrl(media, baseUrl);
      if (rewritten) media.url = rewritten;
      n.value = media;
    }
  }

  return n;
}

function lexicalFromDeliverables(groups: DeliverableGroup[]) {
  const children: any[] = [];
  const safeText = (s: unknown) => (typeof s === "string" ? s : "").trim();

  for (const g of groups) {
    const phaseName = safeText(g.phaseName) || "Deliverables";
    const items = Array.isArray(g.items)
      ? g.items.map((i) => safeText(i)).filter(Boolean)
      : [];
    if (items.length === 0) continue;

    children.push({
      type: "heading",
      tag: "h2",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: [{ type: "text", text: phaseName, version: 1 }],
    });

    children.push({
      type: "list",
      listType: "bullet",
      start: 1,
      tag: "ul",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children: items.map((text) => ({
        type: "listitem",
        value: 1,
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
        children: [
          {
            type: "paragraph",
            format: "",
            indent: 0,
            version: 1,
            direction: "ltr",
            children: [{ type: "text", text, version: 1 }],
          },
        ],
      })),
    });
  }

  return {
    root: {
      type: "root",
      format: "",
      indent: 0,
      version: 1,
      direction: "ltr",
      children,
    },
  };
}

export const syncProjectToListings: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  const listingsUrl = process.env.LISTINGS_SERVICE_URL;
  const token = process.env.CMS_SYNC_TOKEN;
  const cmsBase =
    process.env.CMS_PUBLIC_URL ||
    `http://localhost:${process.env.CMS_PORT || 3020}`;

  if (!listingsUrl || !token) {
    req.payload.logger.warn(
      `[syncProjectToListings] LISTINGS_SERVICE_URL or CMS_SYNC_TOKEN not set — skipping sync for "${doc.slug}"`,
    );
    return doc;
  }

  try {
    const docStatus = (doc as any)._status;
    if (docStatus && docStatus !== "published") {
      // Keep listings-service aligned with Payload's public visibility:
      // any transition away from `published` must immediately hide the
      // row from `/v1/projects` and `/v1/projects/slug/:slug`.
      const url = `${listingsUrl.replace(/\/$/, "")}/internal/project-sync/${encodeURIComponent(String(doc.id))}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        req.payload.logger.error(
          `[syncProjectToListings] ${res.status} archiving non-published "${doc.slug}" (status=${docStatus}): ${text}`,
        );
        return doc;
      }

      req.payload.logger.info(
        `[syncProjectToListings] Archived non-published "${doc.slug}" in listings-service (status=${docStatus})`,
      );
      return doc;
    }

    // IMPORTANT: use `doc` directly (the data being saved) for everything
    // EXCEPT media. We deliberately do NOT call `findByID` on the projects
    // collection — when this hook runs during a publish operation, Payload
    // has not yet finalized the new published version, so a re-fetch would
    // return the *previous* published snapshot and we'd sync stale data
    // (race observed: title would lag one publish behind).
    //
    // Media references (`thumbnail`, `gallery[].image`, `videoWalkthrough.upload`)
    // arrive on `doc` as raw numeric IDs, so we resolve them individually
    // via the media collection — that read is independent of the projects
    // publish race.
    const resolveMedia = async (mediaRef: unknown): Promise<unknown> => {
      if (!mediaRef) return null;
      if (typeof mediaRef === "object") return mediaRef;
      if (typeof mediaRef === "number" || typeof mediaRef === "string") {
        try {
          return await req.payload.findByID({
            collection: "media" as any,
            id: mediaRef as any,
            depth: 0,
          });
        } catch {
          return null;
        }
      }
      return null;
    };

    const populatedThumbnail = await resolveMedia((doc as any).thumbnail);
    const populatedGallery = Array.isArray((doc as any).gallery)
      ? await Promise.all(
          (
            (doc as any).gallery as Array<{ image?: unknown; caption?: string }>
          ).map(async (g) => ({
            ...g,
            image: await resolveMedia(g?.image),
          })),
        )
      : [];
    const populatedVideoUpload = await resolveMedia(
      (doc as any).videoWalkthrough?.upload,
    );

    const thumbnailUrl = mediaUrl(populatedThumbnail, cmsBase);
    const galleryUrls = populatedGallery
      .map((g) => mediaUrl(g.image, cmsBase))
      .filter((u): u is string => !!u);
    const videoUrl =
      (doc as any).videoWalkthrough?.externalUrl ||
      mediaUrl(populatedVideoUpload, cmsBase) ||
      undefined;

    // Populate any `upload` nodes inside the Lexical rich-text field so
    // listings-service can render <img> tags without needing access to
    // Payload's local API. Walks the tree, replaces raw upload IDs with
    // the fetched media doc, and rewrites the `url` to a same-origin path
    // (`/cms-media/...`) matching the thumbnail/gallery pattern.
    const populatedFullDescription = await populateLexicalUploads(
      (doc as any).fullDescription,
      resolveMedia,
      cmsBase,
    );

    // Sync contract boundary: only forward serving/projection fields.
    // This prevents admin/editorial-only keys from drifting into the
    // listings write-model via broad object spreads.
    const payload: ProjectSyncProjection = {
      id: doc.id,
      title: (doc as any).title,
      slug: (doc as any).slug,
      shortDescription: (doc as any).shortDescription,
      fullDescription: populatedFullDescription,
      deliverables: (doc as any).deliverables,
      faqQuestions: (doc as any).faqQuestions,
      categories: (doc as any).categories,
      subcategories: (doc as any).subcategories,
      tags: (doc as any).tags,
      projectSkills: (doc as any).projectSkills,
      programmingLanguages: (doc as any).programmingLanguages,
      developmentTechnologies: (doc as any).developmentTechnologies,
      totalEstimatedHours: (doc as any).totalEstimatedHours,
      timelineValue: (doc as any).timelineValue,
      timelineUnit: (doc as any).timelineUnit,
      priceRangeMin: (doc as any).priceRangeMin,
      priceRangeMax: (doc as any).priceRangeMax,
      pricingModel: (doc as any).pricingModel,
      priceViewMode: (doc as any).priceViewMode,
      projectType: (doc as any).projectType,
      klarnaPaymentEnabled: (doc as any).klarnaPaymentEnabled,
      recentQuestions: (doc as any).recentQuestions,
      skillsAndTools: (doc as any).skillsAndTools,
      // Docs source-of-truth:
      // - chat_enabled is runtime-computed from team presence (not CMS-authored)
      // - report_button_enabled is a frontend-only feature (visible to logged-in users)
      // - share_button_enabled is always true for public projects
      // - help_button_enabled is an optional feature toggle (CMS-authored)
      helpButtonEnabled: (doc as any).helpButtonEnabled,
      featured: (doc as any).featured,
      _status: ((doc as any)._status ?? "published") as
        | "draft"
        | "published"
        | "archived"
        | "flagged",
      // Payload puts draft/published state under `_status`; mirror it onto
      // `status` so the receiver can rely on either name.
      status: ((doc as any)._status ?? "published") as
        | "draft"
        | "published"
        | "archived"
        | "flagged",
      thumbnailUrl: thumbnailUrl ?? undefined,
      galleryUrls,
      videoUrl,
      scope: (doc as any).scope,
      industries: (doc as any).industries,
      relatedProjects: (doc as any).relatedProjects,
      datePublished: (doc as any).datePublished,
      projectDurationLabel: (doc as any).projectDurationLabel,
      ownerId: (doc as any).ownerId,
    };

    const url = `${listingsUrl.replace(/\/$/, "")}/internal/project-sync`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      req.payload.logger.error(
        `[syncProjectToListings] ${res.status} from listings-service for "${doc.slug}" (${operation}): ${text}`,
      );
      return doc;
    }

    req.payload.logger.info(
      `[syncProjectToListings] Synced "${doc.slug}" (${operation}) → listings-service`,
    );



    // Per docs/md/Home Page/08-HP — Cache Strategy & Invalidation:
    // publish a `project.saved` event onto the cms.events topic exchange so
    // any downstream cache (api-gateway Redis, future Cloudflare edge) can
    // invalidate. Same pattern Categories/TalentProfiles already use.
    try {
      const { CmsEventPublisher } =
        await import("../../rabbitmq/cms-event.publisher");
      const publisher = CmsEventPublisher.getInstance();
      if (publisher.isConnected()) {
        await publisher.publishProjectSaved({
          id: String(doc.id),
          payloadId: doc.id as number | string,
          slug: doc.slug,
          title: doc.title,
          status: ((doc as any)._status ?? "published") as
            | "draft"
            | "published"
            | "archived",
        });
        req.payload.logger.info(
          `[syncProjectToListings] Published project.saved for "${doc.slug}"`,
        );
      } else {
        req.payload.logger.warn(
          `[syncProjectToListings] RabbitMQ not connected — skipping project.saved event for "${doc.slug}"`,
        );
      }
    } catch (rmqErr) {
      req.payload.logger.error(
        { err: rmqErr },
        `[syncProjectToListings] Failed to publish project.saved for "${doc.slug}"`,
      );
    }

    // Frontend cache busting (Next.js on-demand ISR). The cache strategy
    // doc covers backend Redis/CDN but not the Next.js Data Cache layer;
    // this hook hits the frontend revalidate webhook so a normal browser
    // refresh sees the new content within ~50ms instead of waiting for the
    // page-level cache to expire.
    const revalidateUrl = process.env.FRONTEND_REVALIDATE_URL;
    const revalidateSecret = process.env.REVALIDATE_SECRET;
    if (revalidateUrl && revalidateSecret) {
      try {
        const res = await fetch(revalidateUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            secret: revalidateSecret,
            paths: [`/project-details/${doc.slug}`, "/projects"],
          }),
        });
        if (!res.ok) {
          const text = await res.text();
          req.payload.logger.warn(
            `[syncProjectToListings] revalidate webhook ${res.status}: ${text}`,
          );
        } else {
          req.payload.logger.info(
            `[syncProjectToListings] Revalidated frontend paths for "${doc.slug}"`,
          );
        }
      } catch (revErr) {
        req.payload.logger.warn(
          { err: revErr },
          `[syncProjectToListings] Failed to call revalidate webhook for "${doc.slug}"`,
        );
      }
    }
  } catch (err) {
    req.payload.logger.error(
      { err },
      `[syncProjectToListings] Failed to sync "${doc.slug}" to listings-service`,
    );
  }

  return doc;
};

export const deleteProjectFromListings: CollectionAfterDeleteHook = async ({
  doc,
  req,
}) => {
  const listingsUrl = process.env.LISTINGS_SERVICE_URL;
  const token = process.env.CMS_SYNC_TOKEN;

  if (!listingsUrl || !token) {
    req.payload.logger.warn(
      `[deleteProjectFromListings] LISTINGS_SERVICE_URL or CMS_SYNC_TOKEN not set — skipping delete for "${doc.slug}"`,
    );
    return doc;
  }

  try {
    const url = `${listingsUrl.replace(/\/$/, "")}/internal/project-sync/${encodeURIComponent(String(doc.id))}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      req.payload.logger.error(
        `[deleteProjectFromListings] ${res.status} from listings-service for "${doc.slug}": ${text}`,
      );
      return doc;
    }

    req.payload.logger.info(
      `[deleteProjectFromListings] Soft-deleted "${doc.slug}" in listings-service`,
    );

    try {
      const { CmsEventPublisher } =
        await import("../../rabbitmq/cms-event.publisher");
      const publisher = CmsEventPublisher.getInstance();
      if (publisher.isConnected()) {
        await publisher.publishProjectDeleted({
          id: String(doc.id),
          payloadId: doc.id as number | string,
          slug: doc.slug,
        });
      }
    } catch (rmqErr) {
      req.payload.logger.error(
        { err: rmqErr },
        `[deleteProjectFromListings] Failed to publish project.deleted for "${doc.slug}"`,
      );
    }

    const revalidateUrl = process.env.FRONTEND_REVALIDATE_URL;
    const revalidateSecret = process.env.REVALIDATE_SECRET;
    if (revalidateUrl && revalidateSecret) {
      try {
        await fetch(revalidateUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            secret: revalidateSecret,
            paths: [`/project-details/${doc.slug}`, "/projects"],
          }),
        });
      } catch (revErr) {
        req.payload.logger.warn(
          { err: revErr },
          `[deleteProjectFromListings] revalidate webhook failed for "${doc.slug}"`,
        );
      }
    }
  } catch (err) {
    req.payload.logger.error(
      { err },
      `[deleteProjectFromListings] Failed to delete "${doc.slug}" in listings-service`,
    );
  }

  return doc;
};
