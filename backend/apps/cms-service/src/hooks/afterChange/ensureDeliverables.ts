import type { CollectionAfterChangeHook } from "payload/types";

type DeliverablesRow = {
  phaseLabel: string;
  phaseName: string;
  items: Array<{ text: string }>;
};

const DELIVERABLES_FETCH_TIMEOUT_MS = 5000;

async function fetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init: RequestInit = {},
  timeoutMs = DELIVERABLES_FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function shouldGenerate(doc: any): boolean {
  const deliverables = doc?.deliverables;
  const hasDeliverables = Array.isArray(deliverables) && deliverables.length > 0;
  if (hasDeliverables) return false;

  const scope = doc?.scope;
  return Array.isArray(scope) && scope.length > 0;
}

/**
 * Auto-generate deliverables when scope exists but deliverables are empty.
 *
 * Uses listings-service `/internal/project-deliverables` (heuristic by default,
 * HF-backed when configured). Writes back into Payload immediately.
 *
 * Guarded by `req.context.skipEnsureDeliverables` to avoid afterChange loops.
 */
export const ensureDeliverables: CollectionAfterChangeHook = async ({
  doc,
  req,
}) => {
  const ctx = (req as any)?.context as Record<string, unknown> | undefined;
  if (ctx?.skipEnsureDeliverables) return doc;
  const isAutosave = Boolean((req as any)?.query?.autosave);
  if (isAutosave) return doc;
  if ((doc as any)?._status && (doc as any)._status !== "published") return doc;

  if (!shouldGenerate(doc)) return doc;

  const listingsUrl = process.env.LISTINGS_SERVICE_URL;
  const token = process.env.CMS_SYNC_TOKEN;
  if (!listingsUrl || !token) return doc;

  try {
    const base = listingsUrl.endsWith("/") ? listingsUrl.slice(0, -1) : listingsUrl;
    const upstream = await fetchWithTimeout(`${base}/internal/project-deliverables`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ scope: (doc as any)?.scope ?? [] }),
    });

    if (!upstream.ok) return doc;

    const json = (await upstream.json()) as {
      deliverables?: Array<{
        phaseLabel: string;
        phaseName: string;
        items: string[];
      }>;
    };

    const deliverables: DeliverablesRow[] = Array.isArray(json.deliverables)
      ? json.deliverables
          .map((g) => {
            const phaseLabel =
              typeof g.phaseLabel === "string" ? g.phaseLabel.trim() : "";
            const phaseName =
              typeof g.phaseName === "string" ? g.phaseName.trim() : "";
            const items = Array.isArray(g.items)
              ? g.items
                  .map((t) => (typeof t === "string" ? t.trim() : ""))
                  .filter(Boolean)
                  .map((text) => ({ text }))
              : [];

            if (!phaseLabel || !phaseName || items.length === 0) return null;
            return { phaseLabel, phaseName, items };
          })
          .filter((p): p is NonNullable<typeof p> => !!p)
      : [];

    if (deliverables.length === 0) return doc;

    await req.payload.update({
      collection: "projects",
      id: doc.id,
      data: { deliverables } as any,
      overrideAccess: true,
      context: { ...(ctx ?? {}), skipEnsureDeliverables: true },
    });
  } catch {
    return doc;
  }

  return doc;
};

