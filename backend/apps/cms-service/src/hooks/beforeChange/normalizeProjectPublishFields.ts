import { CollectionBeforeChangeHook } from "payload/types";

/**
 * Normalize "publish-project" shaped fields into the CMS sync contract fields.
 *
 * Goal: let the Payload admin UI follow the same *conceptual* schema as
 * `/publish-project` (category selections), while still emitting the legacy
 * `{value}` arrays that the listings-service `ProjectSyncDto` currently expects.
 */
export const normalizeProjectPublishFields = async ({
  data,
}: {
  data?: any;
}) => {
  if (!data || typeof data !== "object") return data;

  const d = data as Record<string, any>;

  // categorySelections: [{ category: string, subCategories: string[] }]
  // -> categories/subcategories: [{ value: string }]
  if (Array.isArray(d.categorySelections) && d.categorySelections.length > 0) {
    const categories: string[] = [];
    const subcategories: string[] = [];

    for (const row of d.categorySelections) {
      const cat = typeof row?.category === "string" ? row.category.trim() : "";
      if (cat) categories.push(cat);

      const subs = Array.isArray(row?.subCategories)
        ? row.subCategories
            .map((s: unknown) => {
              if (typeof s === "string") return s.trim();
              if (s && typeof s === "object" && typeof (s as any).value === "string")
                return String((s as any).value).trim();
              return "";
            })
            .filter(Boolean)
        : [];
      subcategories.push(...subs);
    }

    const uniq = (arr: string[]) => Array.from(new Set(arr));

    d.categories = uniq(categories).map((value) => ({ value }));
    d.subcategories = uniq(subcategories).map((value) => ({ value }));
  }

  // publishScope (publish-project shape) -> scope (CMS legacy shape used by
  // computeProjectFields + listings-service ProjectSyncDto)
  if (Array.isArray(d.publishScope) && d.publishScope.length > 0) {
    const phases = d.publishScope as any[];
    const derived = phases
      .map((p, idx) => {
        const phaseName =
          typeof p?.name === "string" && p.name.trim()
            ? p.name.trim()
            : typeof p?.phaseName === "string" && p.phaseName.trim()
            ? p.phaseName.trim()
            : "";
        const order =
          typeof p?.order === "number" && Number.isFinite(p.order) && p.order > 0
            ? p.order
            : idx + 1;
        const rawTasks = Array.isArray(p?.tasks) ? p.tasks : [];

        const tasks = rawTasks
          .map((t: any) => {
            const title =
              typeof t?.taskName === "string" && t.taskName.trim()
                ? t.taskName.trim()
                : typeof t?.title === "string" && t.title.trim()
                ? t.title.trim()
                : "";
            const roleName =
              typeof t?.role === "string" && t.role.trim()
                ? t.role.trim()
                : typeof t?.roleName === "string" && t.roleName.trim()
                ? t.roleName.trim()
                : "";

            const locArr = Array.isArray(t?.location) ? t.location : [];
            const location =
              locArr
                .map((l: any) =>
                  typeof l === "string"
                    ? l.trim()
                    : typeof l?.value === "string"
                    ? l.value.trim()
                    : "",
                )
                .filter(Boolean)[0] || undefined;

            const experienceLevel =
              typeof t?.experienceLevel === "string" && t.experienceLevel.trim()
                ? t.experienceLevel.trim()
                : "Medior";

            const explicitHours =
              typeof t?.estimatedHours === "number" && t.estimatedHours > 0
                ? Math.round(t.estimatedHours)
                : null;

            // Derive hours from duration when estimatedHours not provided.
            const durVal =
              typeof t?.duration?.value === "number" && t.duration.value > 0
                ? t.duration.value
                : null;
            const durType =
              typeof t?.duration?.type === "string" ? t.duration.type : null;
            const derivedHours =
              durVal && durType === "hours"
                ? Math.round(durVal)
                : durVal && durType === "days"
                ? Math.round(durVal * 8)
                : durVal && durType === "weeks"
                ? Math.round(durVal * 40)
                : 0;

            const estimatedHours = explicitHours ?? derivedHours;

            if (!title || !roleName) {
              return null;
            }

            return {
              title,
              roleName,
              location,
              experienceLevel,
              estimatedHours,
            };
          })
          .filter(Boolean);

        if (!phaseName || tasks.length === 0) return null;
        return { phaseName, order, tasks };
      })
      .filter(Boolean);

    // Write back into the legacy field that the rest of the system expects.
    d.scope = derived;
  }

  return data;
};
