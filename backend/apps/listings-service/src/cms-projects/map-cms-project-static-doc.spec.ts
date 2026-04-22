import { mapCmsProjectStaticDocToDto } from "./map-cms-project-static-doc";

/** Minimal CMS-shaped document (Payload REST), not the public API DTO. */
const cmsDocFixture = {
  id: "fixture-1",
  heading: "Peace of Mind Guarantee",
  guaranteeItems: [
    {
      icon: "rocket",
      title: "Guarantee A",
      description: "Description for guarantee row one.",
    },
    {
      icon: "shield-zap",
      title: "Guarantee B",
      description: "Description for guarantee row two.",
    },
  ],
  highlightedNotice: {
    icon: "shield-dollar",
    description: "Highlighted callout copy from CMS fixture.",
  },
  policy: {
    prefixText: "Policy prefix from fixture.",
    linkLabel: "Fixture policy link",
    linkHref: "/fixture-policy",
  },
  howItWorks: {
    steps: [
      {
        stepNumber: "1",
        title: "Fixture Step One",
        description: "Fixture step one body.",
        icon: { url: "https://example.test/icon-1.png" },
      },
      {
        stepNumber: "2",
        title: "Fixture Step Two",
        description: "Fixture step two body.",
      },
    ],
  },
};

describe("mapCmsProjectStaticDocToDto", () => {
  it("maps a CMS document into the API projectStaticContent DTO", () => {
    const dto = mapCmsProjectStaticDocToDto(cmsDocFixture);
    expect(dto).not.toBeNull();
    expect(dto!.heading).toBe("Peace of Mind Guarantee");
    expect(dto!.guaranteeItems).toHaveLength(2);
    expect(dto!.guaranteeItems[0].icon).toBe("rocket");
    expect(dto!.policy.linkHref).toBe("/fixture-policy");
    expect(dto!.howItWorks).not.toBeNull();
    expect(dto!.howItWorks!.steps).toHaveLength(2);
    expect(dto!.howItWorks!.steps[0].iconUrl).toBe(
      "https://example.test/icon-1.png",
    );
    expect(dto!.howItWorks!.steps[1].iconUrl).toBeUndefined();
  });

  it("returns null when required sidebar fields are missing", () => {
    expect(mapCmsProjectStaticDocToDto(null)).toBeNull();
    expect(mapCmsProjectStaticDocToDto({})).toBeNull();
    expect(
      mapCmsProjectStaticDocToDto({
        ...cmsDocFixture,
        heading: "",
      }),
    ).toBeNull();
  });

  it("returns DTO with howItWorks null when the howItWorks group is invalid", () => {
    const dto = mapCmsProjectStaticDocToDto({
      ...cmsDocFixture,
      howItWorks: { steps: [] },
    });
    expect(dto).not.toBeNull();
    expect(dto!.howItWorks).toBeNull();
  });

  it("accepts numeric stepNumber from CMS JSON", () => {
    const dto = mapCmsProjectStaticDocToDto({
      ...cmsDocFixture,
      howItWorks: {
        steps: [
          {
            stepNumber: 1,
            title: "Numeric step",
            description: "Body.",
          },
        ],
      },
    });
    expect(dto!.howItWorks!.steps[0].stepNumber).toBe("1");
  });

  it("sanitizes unsafe policy link protocols", () => {
    const dto = mapCmsProjectStaticDocToDto({
      ...cmsDocFixture,
      policy: {
        ...cmsDocFixture.policy,
        linkHref: "javascript:alert(1)",
      },
    });

    expect(dto).not.toBeNull();
    expect(dto!.policy.linkHref).toBe("/policy");
  });

  it("drops unsafe icon URL protocols", () => {
    const dto = mapCmsProjectStaticDocToDto({
      ...cmsDocFixture,
      howItWorks: {
        steps: [
          {
            stepNumber: "1",
            title: "Unsafe icon step",
            description: "Body.",
            icon: "javascript:alert(1)",
          },
        ],
      },
    });

    expect(dto).not.toBeNull();
    expect(dto!.howItWorks).not.toBeNull();
    expect(dto!.howItWorks!.steps[0].iconUrl).toBeUndefined();
  });
});
