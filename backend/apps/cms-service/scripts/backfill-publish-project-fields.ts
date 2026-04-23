/**
 * Backfill publish-project canonical fields for existing Payload CMS projects.
 *
 * Why:
 * - We made `/publish-project` the source of truth for schema + rules.
 * - CMS now uses `categorySelections` + `publishScope` as canonical inputs.
 * - Older docs may only have legacy `categories`/`subcategories` and `scope`.
 *
 * What this script does (best-effort, idempotent):
 * - If `categorySelections` missing, derives it from flattened legacy
 *   `categories` + `subcategories` by chunking subcategories into groups of 5.
 * - If `publishScope` missing, derives it from legacy `scope` by mapping:
 *   phaseName/order -> name/stageName/order, tasks -> taskName/role/location[]/duration.
 *   Duration is set to `{ value: estimatedHours, type: 'hours' }`.
 * - If required tag-like arrays are empty, seeds a conservative default `General`
 *   to avoid blocking saves. Adjust as needed.
 *
 * Usage:
 *   npm run backfill:publish-project-fields
 */
import "dotenv/config";
import payload from "payload";

const DEFAULT_TOKEN = { value: "General" };

const asValueStrings = (arr: unknown): string[] => {
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x: any) => (typeof x?.value === "string" ? x.value.trim() : ""))
    .filter(Boolean);
};

const lexicalToPlainText = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return "";
  if (typeof value !== "object") return "";
  const root = (value as any).root ?? value;
  const visit = (node: any): string => {
    if (!node) return "";
    if (typeof node.text === "string") return node.text;
    if (Array.isArray(node.children)) return node.children.map(visit).join("");
    return "";
  };
  return visit(root).replace(/\s+/g, " ").trim();
};

async function main() {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET environment variable is required");

  await payload.init({ secret, local: true });

  let page = 1;
  const limit = 50;
  let updated = 0;

  while (true) {
    const res = await payload.find({
      collection: "projects",
      overrideAccess: true,
      limit,
      page,
      depth: 0,
    });

    for (const doc of res.docs as any[]) {
      const patch: Record<string, any> = {};

      // Backfill categorySelections
      const hasCategorySelections =
        Array.isArray(doc.categorySelections) && doc.categorySelections.length > 0;
      if (!hasCategorySelections) {
        const cats = asValueStrings(doc.categories);
        const subs = asValueStrings(doc.subcategories);
        if (cats.length === 3) {
          const groups = cats.map((category: string, idx: number) => {
            const chunk = subs.slice(idx * 5, idx * 5 + 5);
            const ensured = chunk.length ? chunk : ["General"];
            return {
              category,
              subCategories: ensured.map((value) => ({ value })),
            };
          });
          patch.categorySelections = groups;
        }
      }

      // Backfill publishScope
      const hasPublishScope = Array.isArray(doc.publishScope) && doc.publishScope.length > 0;
      if (!hasPublishScope && Array.isArray(doc.scope) && doc.scope.length > 0) {
        const phases = (doc.scope as any[]).map((p: any, idx: number) => {
          const name = typeof p?.phaseName === "string" ? p.phaseName.trim() : `Phase ${idx + 1}`;
          const order = typeof p?.order === "number" && p.order > 0 ? p.order : idx + 1;
          const tasks = (Array.isArray(p?.tasks) ? p.tasks : [])
            .map((t: any) => {
              const taskName = typeof t?.title === "string" ? t.title.trim() : "";
              const role = typeof t?.roleName === "string" ? t.roleName.trim() : "";
              const loc = typeof t?.location === "string" ? t.location.trim() : "Remote";
              const experienceLevel =
                typeof t?.experienceLevel === "string" ? t.experienceLevel : "Medior";
              const estimatedHours =
                typeof t?.estimatedHours === "number" && t.estimatedHours > 0
                  ? Math.round(t.estimatedHours)
                  : 1;
              if (!taskName || !role) return null;
              return {
                taskName,
                role,
                location: [{ value: loc }],
                experienceLevel,
                duration: { value: estimatedHours, type: "hours" },
                estimatedHours,
              };
            })
            .filter(Boolean);
          return {
            name,
            stageName: `Stage ${order}`,
            startDay: 1,
            endDay: 8,
            order,
            tasks,
          };
        });
        patch.publishScope = phases;
      }

      // Ensure required arrays have at least one value (so the new validations don't block).
      const ensureMin1 = (key: string) => {
        const v = doc[key];
        if (!Array.isArray(v) || v.length === 0) patch[key] = [DEFAULT_TOKEN];
      };
      ensureMin1("tags");
      ensureMin1("industries");
      ensureMin1("projectSkills");

      // fullDescription changed to textarea (string). Convert Lexical docs to plain text.
      if (doc.fullDescription) {
        if (typeof doc.fullDescription === "object") {
          const text = lexicalToPlainText(doc.fullDescription);
          if (text) patch.fullDescription = text.slice(0, 2000);
        } else if (typeof doc.fullDescription === "string") {
          const raw = doc.fullDescription.trim();
          // After DB type change (jsonb -> varchar), Postgres can cast JSONB to a JSON string.
          // Detect and convert those stringified Lexical docs back into plain text.
          if ((raw.startsWith("{") && raw.includes("\"root\"")) || raw.startsWith("[")) {
            try {
              const parsed = JSON.parse(raw);
              const text = lexicalToPlainText(parsed);
              if (text) patch.fullDescription = text.slice(0, 2000);
            } catch {
              // leave as-is
            }
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        await payload.update({
          collection: "projects",
          id: String(doc.id),
          overrideAccess: true,
          data: patch,
        });
        updated += 1;
      }
    }

    if (!res.hasNextPage) break;
    page += 1;
  }

  console.log(`✔ Backfill complete. Updated ${updated} project(s).`);

  // Best-effort cleanup so the process exits (Payload v2 doesn't guarantee a
  // stable top-level destroy API).
  const anyPayload = payload as any;
  if (typeof anyPayload.destroy === "function") {
    await anyPayload.destroy();
  } else if (typeof anyPayload.close === "function") {
    await anyPayload.close();
  } else if (typeof anyPayload.db?.destroy === "function") {
    await anyPayload.db.destroy();
  } else if (typeof anyPayload.db?.pool?.end === "function") {
    await anyPayload.db.pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
