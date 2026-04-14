import { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload/types';

/**
 * Payload Projects → listings-service sync.
 *
 * NestJS Postgres is the source of truth (per the project-sync architecture
 * doc); Payload is the editorial overlay. After every save / delete in the
 * Payload admin we POST the document to listings-service which upserts
 * `public.projects` keyed on `payloadId`.
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

function isResolvedMedia(value: unknown): value is ResolvedMediaRef {
  return typeof value === 'object' && value !== null && ('url' in (value as object) || 'filename' in (value as object));
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
  const baseClean = baseUrl.replace(/\/$/, '');
  const stripBase = (url: string): string =>
    baseClean && url.startsWith(baseClean) ? url.slice(baseClean.length) : url;

  if (typeof value === 'string') return stripBase(value);
  if (isResolvedMedia(value)) {
    if (value.url) {
      return value.url.startsWith('http') ? stripBase(value.url) : value.url;
    }
    if (value.filename) {
      return `/cms-media/${value.filename}`;
    }
  }
  return null;
}

export const syncProjectToListings: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  const listingsUrl = process.env.LISTINGS_SERVICE_URL;
  const token = process.env.CMS_SYNC_TOKEN;
  const cmsBase = process.env.CMS_PUBLIC_URL || `http://localhost:${process.env.CMS_PORT || 3020}`;

  if (!listingsUrl || !token) {
    req.payload.logger.warn(
      `[syncProjectToListings] LISTINGS_SERVICE_URL or CMS_SYNC_TOKEN not set — skipping sync for "${doc.slug}"`,
    );
    return doc;
  }

  try {
    // Re-fetch the doc with depth=2 so all media references arrive as
    // populated objects (Payload may give the afterChange hook a doc with
    // raw numeric IDs, which leaves us no way to resolve URLs locally).
    //
    // We deliberately omit `draft: true` so this returns the *published*
    // version when one exists. Otherwise autosaved drafts would overwrite
    // the listings row with `_status='draft'`, which the read controller
    // filters out — making the project disappear from the frontend.
    let populated: any = doc;
    try {
      populated = await req.payload.findByID({
        collection: 'projects' as any,
        id: doc.id,
        depth: 2,
      });
    } catch (err) {
      req.payload.logger.warn(
        { err },
        `[syncProjectToListings] depth=2 refetch failed for "${doc.slug}", falling back to hook doc`,
      );
    }

    // Skip syncs for non-published states. Payload fires afterChange on
    // every autosave; we only want to push the latest *published* snapshot
    // to listings-service so the public frontend never sees in-flight edits.
    const docStatus = (populated as any)._status ?? (doc as any)._status;
    if (docStatus && docStatus !== 'published') {
      req.payload.logger.info(
        `[syncProjectToListings] Skipping non-published "${doc.slug}" (status=${docStatus})`,
      );
      return doc;
    }

    const thumbnailUrl = mediaUrl(populated.thumbnail, cmsBase);
    const galleryUrls = Array.isArray(populated.gallery)
      ? populated.gallery
          .map((g: { image?: unknown }) => mediaUrl(g?.image, cmsBase))
          .filter((u: string | null): u is string => !!u)
      : [];
    const videoUrl =
      populated.videoWalkthrough?.externalUrl ||
      mediaUrl(populated.videoWalkthrough?.upload, cmsBase) ||
      undefined;

    const payload = {
      ...populated,
      id: doc.id,
      thumbnailUrl: thumbnailUrl ?? undefined,
      galleryUrls,
      videoUrl,
      // Payload puts draft/published state under `_status`; mirror it onto
      // `status` so the receiver can rely on either name.
      status: (populated as any)._status ?? (doc as any)._status ?? 'published',
    };

    const url = `${listingsUrl.replace(/\/$/, '')}/internal/project-sync`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
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
    const url = `${listingsUrl.replace(/\/$/, '')}/internal/project-sync/${encodeURIComponent(String(doc.id))}`;
    const res = await fetch(url, {
      method: 'DELETE',
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
  } catch (err) {
    req.payload.logger.error(
      { err },
      `[deleteProjectFromListings] Failed to delete "${doc.slug}" in listings-service`,
    );
  }

  return doc;
};
