import type { ProjectStaticHowItWorksStep } from "../project-static-content-from-api"

/**
 * Example step rows from `projectStaticContent.howItWorks.steps` (gateway).
 * CMS supplies steps only; headings and CTA are app-static in the section component.
 */
export const SAMPLE_PROJECT_DETAILS_STEPS_FROM_GATEWAY: ProjectStaticHowItWorksStep[] =
  [
    {
      stepNumber: "1",
      title: "First step from API fixture",
      description: "First step body from gateway-shaped data.",
      iconUrl: "/media/seed-1558655146-9f40138edfeb.jpg",
    },
    {
      stepNumber: "2",
      title: "Second step from API fixture",
      description: "Second step body from gateway-shaped data.",
      iconUrl: "/media/seed-1454165804606-c3d57bc86b40.jpg",
    },
    {
      stepNumber: "3",
      title: "Third step from API fixture",
      description: "Third step body from gateway-shaped data.",
      iconUrl: "/media/seed-1455390582262-044cdead277a.jpg",
    },
  ]
