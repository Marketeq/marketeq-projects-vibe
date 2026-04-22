import { ProjectSyncService } from "./project-sync.service";

describe("ProjectSyncService deliverables normalization", () => {
  const service = new ProjectSyncService(
    null as any,
    { deriveDeliverables: jest.fn() } as any,
    { extractSkills: jest.fn() } as any,
  );

  it("normalizes rich-text HTML (headings + list items) into phase groups", () => {
    const html = `
      <h2>Phase One · Research</h2>
      <ul>
        <li>Competitive analysis</li>
        <li>Stakeholder interviews</li>
      </ul>
      <h2>Phase Two · Design</h2>
      <ul>
        <li>Wireframes</li>
      </ul>
    `;

    const phases = (service as any).deliverablePhases(html) as Array<{
      phaseLabel: string;
      phaseName: string;
      items: string[];
    }>;

    expect(phases).toEqual([
      {
        phaseLabel: "",
        phaseName: "Phase One · Research",
        items: ["Competitive analysis", "Stakeholder interviews"],
      },
      {
        phaseLabel: "",
        phaseName: "Phase Two · Design",
        items: ["Wireframes"],
      },
    ]);
  });

  it("falls back to a single group when only paragraphs exist", () => {
    const html = `
      <p>Build the design system</p>
      <p>Implement responsive layout</p>
    `;

    const phases = (service as any).deliverablePhases(html) as Array<{
      phaseLabel: string;
      phaseName: string;
      items: string[];
    }>;

    expect(phases).toEqual([
      {
        phaseLabel: "",
        phaseName: "Deliverables",
        items: ["Build the design system", "Implement responsive layout"],
      },
    ]);
  });
});

