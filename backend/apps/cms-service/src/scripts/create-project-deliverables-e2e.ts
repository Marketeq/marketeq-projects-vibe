import "dotenv/config";
import payload from "payload";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET environment variable is required");

  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info("Payload CMS initialized (create project e2e)");
    },
  });

  // Reuse any existing media item so we don't need to automate uploads.
  const existingMedia = await payload.find({
    collection: "media",
    limit: 1,
    overrideAccess: true,
  });
  const thumbnail = existingMedia.totalDocs > 0 ? (existingMedia.docs[0] as any).id : null;
  if (!thumbnail) {
    throw new Error("No media found in cms.media to reuse as thumbnail.");
  }

  const now = new Date();
  const title = `Test Deliverables Gen ${now
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14)}`;
  const slug = slugify(title);

  const scope = [
    {
      phaseName: "Discovery",
      order: 1,
      tasks: [
        {
          title: "Product requirements workshop",
          roleName: "Product Manager",
          experienceLevel: "Senior",
          estimatedHours: 10,
        },
        {
          title: "User research synthesis",
          roleName: "UX Researcher",
          experienceLevel: "Medior",
          estimatedHours: 12,
        },
      ],
    },
    {
      phaseName: "Build",
      order: 2,
      tasks: [
        {
          title: "UI implementation",
          roleName: "Front End Developer",
          experienceLevel: "Senior",
          estimatedHours: 24,
        },
      ],
    },
  ];

  payload.logger.info(`Creating new project slug="${slug}" ...`);

  const created = await payload.create({
    collection: "projects",
    overrideAccess: true,
    data: {
      title,
      slug,
      shortDescription: "E2E deliverables generation test project.",
      fullDescription: {
        root: {
          type: "root",
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
              children: [
                {
                  type: "text",
                  text: "Testing deliverables generation from scope.",
                  version: 1,
                },
              ],
            },
          ],
        },
      },

      // Required pricing fields (minimum viable values)
      totalEstimatedHours: 1,
      timelineValue: 2,
      timelineUnit: "weeks",
      pricingModel: "biweekly",
      priceRangeMin: 100,
      priceRangeMax: 500,
      projectType: "team",

      // Required categorization constraints
      categories: [{ value: "design" }],

      // Required media
      thumbnail,

      // Critical: force listings-service to derive deliverables from scope.
      deliverables: null,
      scope,

      // Ensure it is synced (sync hook deletes when not published)
      _status: "published",
    } as any,
  });

  payload.logger.info(`Created project id=${(created as any).id} slug="${slug}".`);
  payload.logger.info("Wait a moment, then query public.projects.deliverables by slug.");

  // Print slug as script output for follow-up DB query.
  // eslint-disable-next-line no-console
  console.log(slug);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Create project e2e failed:", err);
  process.exit(1);
});

