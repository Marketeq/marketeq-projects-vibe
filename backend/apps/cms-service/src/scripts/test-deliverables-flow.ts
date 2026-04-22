import "dotenv/config";
import payload from "payload";

async function main() {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET environment variable is required");

  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info("Payload CMS initialized (deliverables flow test)");
    },
  });

  const targetSlug = process.env.TEST_PROJECT_SLUG || "kids-learning-app";

  const existing = await payload.find({
    collection: "projects",
    where: { slug: { equals: targetSlug } },
    limit: 1,
    overrideAccess: true,
  });

  if (existing.totalDocs === 0) {
    throw new Error(
      `No project found with slug="${targetSlug}". Set TEST_PROJECT_SLUG to an existing project slug.`,
    );
  }

  const project = existing.docs[0] as any;

  const scope = [
    {
      phaseName: "Research",
      order: 1,
      tasks: [
        {
          title: "Stakeholder interviews",
          roleName: "Product Researcher",
          experienceLevel: "Senior",
          estimatedHours: 24,
        },
        {
          title: "Competitive analysis",
          roleName: "Product Researcher",
          experienceLevel: "Medior",
          estimatedHours: 16,
        },
      ],
    },
    {
      phaseName: "Design",
      order: 2,
      tasks: [
        {
          title: "Wireframes",
          roleName: "UX Designer",
          experienceLevel: "Medior",
          estimatedHours: 30,
        },
        {
          title: "UI design",
          roleName: "UI Designer",
          experienceLevel: "Senior",
          estimatedHours: 40,
        },
      ],
    },
  ];

  payload.logger.info(
    `Updating project "${targetSlug}" (id=${project.id}) with scope and clearing deliverables...`,
  );

  await payload.update({
    collection: "projects",
    id: project.id,
    overrideAccess: true,
    data: {
      scope,
      // Clear authored deliverables so listings-service is forced to derive from scope.
      deliverables: null,
      // Ensure it stays visible in listings-service sync path.
      _status: "published",
    } as any,
  });

  payload.logger.info("Update complete. Check listings-service public.projects.deliverables.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Deliverables flow test failed:", err);
  process.exit(1);
});

