/**
 * Public shape of `projectStaticContent` on GET /v1/projects/slug/:slug.
 * Produced only inside listings-service (CMS document → DTO); the UI must
 * consume this DTO via the gateway, not Payload/CMS field shapes.
 */
export type ProjectStaticIcon = "rocket" | "shield-zap" | "shield-dollar";

export interface ProjectStaticItem {
  icon: ProjectStaticIcon;
  title: string;
  description: string;
}

export interface ProjectStaticHowItWorksStep {
  stepNumber: string;
  title: string;
  description: string;
  iconUrl?: string;
}

/** Only step rows are CMS-backed; headings and CTA are static in the client. */
export interface ProjectStaticHowItWorks {
  steps: ProjectStaticHowItWorksStep[];
}

export interface ProjectStaticContent {
  heading: string;
  guaranteeItems: ProjectStaticItem[];
  highlightedNotice: {
    icon: ProjectStaticIcon;
    description: string;
  };
  policy: {
    prefixText: string;
    linkLabel: string;
    linkHref: string;
  };
  howItWorks: ProjectStaticHowItWorks | null;
}
