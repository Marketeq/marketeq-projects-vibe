/**
 * View-model builder for project details static blocks.
 *
 * Input must match `projectStaticContent` on GET /v1/projects/slug/:slug
 * (listings-service → gateway). This module must not import or assume Payload
 * / CMS collection shapes — only the public API JSON.
 */

export type ProjectStaticIcon = "rocket" | "shield-zap" | "shield-dollar"

export type ProjectStaticHowItWorksStep = {
  stepNumber: string
  title: string
  description: string
  iconUrl?: string
}

/** Only `steps` are API-driven; headings and CTA are fixed in the UI. */
export type ProjectStaticHowItWorks = {
  steps: ProjectStaticHowItWorksStep[]
}

/** Merged model used by the project details page (always includes howItWorks). */
export type ProjectStaticContent = {
  heading: string
  guaranteeItems: Array<{
    icon: ProjectStaticIcon
    title: string
    description: string
  }>
  highlightedNotice: {
    icon: ProjectStaticIcon
    description: string
  }
  policy: {
    prefixText: string
    linkLabel: string
    linkHref: string
  }
  howItWorks: ProjectStaticHowItWorks
}

function normalizeStepNumber(value: unknown): string {
  if (value == null) return ""
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "string") return value.trim()
  return String(value).trim()
}

function normalizeSafeNavigationHref(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.startsWith("/")) return trimmed
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return null
}

function normalizeSafeImageHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith("/")) {
    return trimmed.startsWith("/cms-media/")
      ? "/media/" + trimmed.slice("/cms-media/".length)
      : trimmed
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return undefined
}

/**
 * Parses `howItWorks.steps` from the gateway payload. Returns null if missing
 * or if no valid steps (same rules as listings-service mapper).
 */
function parseHowItWorksFromPayload(
  payload: Record<string, unknown>
): ProjectStaticHowItWorks | null {
  const rawHow = payload.howItWorks
  if (!rawHow || typeof rawHow !== "object") return null
  const hi = rawHow as Record<string, unknown>
  if (!Array.isArray(hi.steps)) return null
  const steps = hi.steps
    .map((s: unknown) => {
      if (!s || typeof s !== "object") return null
      const row = s as Record<string, unknown>
      const stepNumber = normalizeStepNumber(row.stepNumber)
      const stepTitle = typeof row.title === "string" ? row.title.trim() : ""
      const description =
        typeof row.description === "string" ? row.description.trim() : ""
      const iconUrlRaw =
        normalizeSafeImageHref(row.iconUrl) ?? ""
      if (!stepNumber || !stepTitle || !description) return null
      return {
        stepNumber,
        title: stepTitle,
        description,
        ...(iconUrlRaw ? { iconUrl: iconUrlRaw } : {}),
      }
    })
    .filter(Boolean) as ProjectStaticHowItWorksStep[]
  if (steps.length === 0) return null
  return { steps }
}

export const DEFAULT_PROJECT_STATIC_CONTENT: ProjectStaticContent = {
  heading: "Peace of Mind Guarantee",
  guaranteeItems: [
    {
      icon: "rocket",
      title: "Peace of Mind Guarantee",
      description:
        "If the project falls short, you can initiate a dispute for a full refund.",
    },
    {
      icon: "shield-zap",
      title: "Peace of Mind Guarantee",
      description:
        "If the project falls short, you can initiate a dispute for a full refund.",
    },
  ],
  highlightedNotice: {
    icon: "shield-dollar",
    description:
      "If the project falls short, you can initiate a dispute for a full refund.",
  },
  policy: {
    prefixText:
      "We securely process payments and release upon rating. We securely process payments",
    linkLabel: "See Policy Details.",
    linkHref: "/policy",
  },
  howItWorks: {
    steps: [
      {
        stepNumber: "1",
        title: "Customize Your Scope",
        description: "Lorem ipsum odor amet, consectetuer adipiscing elit.",
        iconUrl: "/media/seed-1558655146-9f40138edfeb.jpg",
      },
      {
        stepNumber: "2",
        title: "Customize Your Scope",
        description: "Lorem ipsum odor amet, consectetuer adipiscing elit.",
        iconUrl: "/media/seed-1454165804606-c3d57bc86b40.jpg",
      },
      {
        stepNumber: "3",
        title: "Customize Your Scope",
        description: "Lorem ipsum odor amet, consectetuer adipiscing elit.",
        iconUrl: "/media/seed-1455390582262-044cdead277a.jpg",
      },
    ],
  },
}

/**
 * Normalizes the gateway `projectStaticContent` payload with safe defaults.
 * Call with `project?.projectStaticContent` from the project details fetch.
 */
export function buildProjectStaticContentFromGateway(
  apiPayload: unknown | null | undefined
): ProjectStaticContent {
  if (!apiPayload || typeof apiPayload !== "object") {
    return DEFAULT_PROJECT_STATIC_CONTENT
  }

  const payload = apiPayload as Record<string, unknown>

  const howItWorksFromApi =
    parseHowItWorksFromPayload(payload) ?? DEFAULT_PROJECT_STATIC_CONTENT.howItWorks

  const guaranteeItems = Array.isArray(payload.guaranteeItems)
    ? payload.guaranteeItems
        .map((item: unknown) => {
          if (!item || typeof item !== "object") return null
          const row = item as Record<string, unknown>
          const icon = row.icon
          const title = typeof row.title === "string" ? row.title.trim() : ""
          const description =
            typeof row.description === "string" ? row.description.trim() : ""
          if (
            (icon !== "rocket" &&
              icon !== "shield-zap" &&
              icon !== "shield-dollar") ||
            !title ||
            !description
          ) {
            return null
          }
          return {
            icon,
            title,
            description,
          }
        })
        .filter(Boolean) as ProjectStaticContent["guaranteeItems"]
    : []

  if (guaranteeItems.length === 0) {
    return {
      ...DEFAULT_PROJECT_STATIC_CONTENT,
      howItWorks: howItWorksFromApi,
    }
  }

  const heading =
    typeof payload.heading === "string" && payload.heading.trim()
      ? payload.heading.trim()
      : DEFAULT_PROJECT_STATIC_CONTENT.heading

  const highlightedIcon = payload?.highlightedNotice
    ? (payload.highlightedNotice as Record<string, unknown>)?.icon
    : undefined
  const highlightedDescription =
    payload.highlightedNotice &&
    typeof (payload.highlightedNotice as Record<string, unknown>)
      .description === "string" &&
    String(
      (payload.highlightedNotice as Record<string, unknown>).description
    ).trim()
      ? String(
          (payload.highlightedNotice as Record<string, unknown>).description
        ).trim()
      : DEFAULT_PROJECT_STATIC_CONTENT.highlightedNotice.description

  const highlightedNotice = {
    icon:
      highlightedIcon === "rocket" ||
      highlightedIcon === "shield-zap" ||
      highlightedIcon === "shield-dollar"
        ? highlightedIcon
        : DEFAULT_PROJECT_STATIC_CONTENT.highlightedNotice.icon,
    description: highlightedDescription,
  }

  const pol =
    payload.policy && typeof payload.policy === "object"
      ? (payload.policy as Record<string, unknown>)
      : null
  const policyPrefixText =
    pol && typeof pol.prefixText === "string" && pol.prefixText.trim()
      ? pol.prefixText.trim()
      : DEFAULT_PROJECT_STATIC_CONTENT.policy.prefixText
  const policyLinkLabel =
    pol && typeof pol.linkLabel === "string" && pol.linkLabel.trim()
      ? pol.linkLabel.trim()
      : DEFAULT_PROJECT_STATIC_CONTENT.policy.linkLabel
  const policyLinkHref =
    normalizeSafeNavigationHref(pol?.linkHref) ??
    DEFAULT_PROJECT_STATIC_CONTENT.policy.linkHref

  return {
    heading,
    guaranteeItems,
    highlightedNotice,
    policy: {
      prefixText: policyPrefixText,
      linkLabel: policyLinkLabel,
      linkHref: policyLinkHref,
    },
    howItWorks: howItWorksFromApi,
  }
}
