/**
 * Maps a listings-service project updated event to a Payload CMS project document.
 */
export function mapServiceEventToProject(event: any) {
  const data: Record<string, any> = {
    title: event.title,
    slug: event.slug,
    shortDescription: event.shortDescription,
    featured: !!event.featured,
    status: event.status,
    startingPriceTotal: event.budget,
    projectDurationLabel: event.duration,
  };

  // Handle fullDescription (RichText)
  if (event.description) {
    if (typeof event.description === "string") {
      // Simple HTML to Lexical-like conversion (heuristic)
      data.fullDescription = {
        root: {
          children: [
            {
              children: [
                {
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text: event.description.replace(/<[^>]*>/g, ""), // Strip tags for now
                  type: "text",
                  version: 1,
                },
              ],
              direction: "ltr",
              format: "",
              indent: 0,
              type: "paragraph",
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      };
    } else {
      data.fullDescription = event.description;
    }
  }

  // Map categories
  // CMS expects: categories: [{ value: '...', subcategories: [{ value: '...' }] }]
  // Service sends: category: string, categories: string[], subcategories: string[]
  if (Array.isArray(event.categories)) {
    data.categories = event.categories.map((c: string) => ({
      value: c,
      subcategories: (event.subcategories || [])
        .filter((sc: string) => sc.startsWith(c) || true) // Rough heuristic
        .map((sc: string) => ({ value: sc })),
    }));
  }

  // Map industries
  if (Array.isArray(event.industry)) {
    data.industries = event.industry.map((i: string) => ({ value: i }));
  }

  // Map tags
  if (Array.isArray(event.tags)) {
    data.tags = event.tags.map((t: string) => ({ value: t }));
  }

  // Map skills
  if (Array.isArray(event.skills)) {
    data.projectSkills = event.skills.map((s: string) => ({ value: s }));
  }

  // Map FAQs
  if (Array.isArray(event.faqs)) {
    data.faqQuestions = event.faqs.map((f: any) => ({
      question: f.question,
      answer: {
        root: {
          children: [
            {
              children: [
                {
                  text: typeof f.answer === "string" ? f.answer : "",
                  type: "text",
                  version: 1,
                },
              ],
              type: "paragraph",
              version: 1,
            },
          ],
          type: "root",
          version: 1,
        },
      },
    }));
  }

  // Map scope
  if (Array.isArray(event.scope)) {
    data.scope = event.scope.map((p: any) => ({
      phaseName: p.phaseName,
      order: p.order,
      tasks: (p.tasks || []).map((t: any) => ({
        title: t.title,
        roleName: t.roleName,
        location: t.location,
        experienceLevel: t.experienceLevel,
        durationValue: t.estimatedHours,
        durationType: "hours",
      })),
    }));
  }

  // Map deliverables
  if (Array.isArray(event.deliverables)) {
    data.deliverables = event.deliverables.map((d: any) => ({
      phaseLabel: d.phaseLabel,
      phaseName: d.phaseName,
      items: (d.items || []).map((text: string) => ({ text })),
    }));
  }

  return data;
}
