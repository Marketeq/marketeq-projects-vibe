import type {
  ProjectStaticContent,
  ProjectStaticHowItWorks,
  ProjectStaticHowItWorksStep,
  ProjectStaticIcon,
  ProjectStaticItem,
} from "./project-static-content.dto";

/**
 * Maps a raw Payload `project-static-contents` REST document into the
 * listings-service API DTO. All CMS-specific field names stay here — not in
 * the frontend.
 */
export function mapCmsProjectStaticDocToDto(
  doc: unknown,
): ProjectStaticContent | null {
  if (!doc || typeof doc !== "object") return null;

  const isValidIcon = (value: unknown): value is ProjectStaticIcon =>
    value === "rocket" || value === "shield-zap" || value === "shield-dollar";

  const guaranteeItems = Array.isArray((doc as any).guaranteeItems)
    ? (doc as any).guaranteeItems
        .map((item: any) => {
          const icon = isValidIcon(item?.icon) ? item.icon : null;
          const title =
            typeof item?.title === "string" ? item.title.trim() : "";
          const description =
            typeof item?.description === "string"
              ? item.description.trim()
              : "";
          if (!icon || !title || !description) return null;
          return { icon, title, description };
        })
        .filter(
          (item: ProjectStaticItem | null): item is ProjectStaticItem =>
            item !== null,
        )
    : [];

  const highlightedIcon = isValidIcon((doc as any)?.highlightedNotice?.icon)
    ? (doc as any).highlightedNotice.icon
    : null;
  const highlightedDescription =
    typeof (doc as any)?.highlightedNotice?.description === "string"
      ? (doc as any).highlightedNotice.description.trim()
      : "";

  const heading =
    typeof (doc as any).heading === "string"
      ? (doc as any).heading.trim()
      : "";
  const policyPrefixText =
    typeof (doc as any)?.policy?.prefixText === "string"
      ? (doc as any).policy.prefixText.trim()
      : "";
  const policyLinkLabel =
    typeof (doc as any)?.policy?.linkLabel === "string"
      ? (doc as any).policy.linkLabel.trim()
      : "";
  const policyLinkHref =
    typeof (doc as any)?.policy?.linkHref === "string"
      ? (doc as any).policy.linkHref.trim()
      : "";

  if (
    !heading ||
    guaranteeItems.length === 0 ||
    !highlightedIcon ||
    !highlightedDescription ||
    !policyPrefixText ||
    !policyLinkLabel
  ) {
    return null;
  }

  return {
    heading,
    guaranteeItems,
    highlightedNotice: {
      icon: highlightedIcon,
      description: highlightedDescription,
    },
    policy: {
      prefixText: policyPrefixText,
      linkLabel: policyLinkLabel,
      linkHref: policyLinkHref || "/policy",
    },
    howItWorks: mapHowItWorksGroup((doc as any)?.howItWorks),
  };
}

/** Payload may send stepNumber as string or number from JSON/admin. */
function normalizeStepNumber(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function mapHowItWorksGroup(raw: unknown): ProjectStaticHowItWorks | null {
  if (!raw || typeof raw !== "object") return null;

  const steps = Array.isArray((raw as any).steps)
    ? (raw as any).steps
        .map((s: any) => {
          const stepNumber = normalizeStepNumber(s?.stepNumber);
          const stepTitle =
            typeof s?.title === "string" ? s.title.trim() : "";
          const description =
            typeof s?.description === "string" ? s.description.trim() : "";
          const iconUrl = resolveStepIconUrl(s?.icon);
          if (!stepNumber || !stepTitle || !description) return null;
          return {
            stepNumber,
            title: stepTitle,
            description,
            ...(iconUrl ? { iconUrl } : {}),
          };
        })
        .filter(
          (
            item: ProjectStaticHowItWorksStep | null,
          ): item is ProjectStaticHowItWorksStep => item !== null,
        )
    : [];

  if (steps.length === 0) return null;

  return { steps };
}

function resolveStepIconUrl(value: unknown): string | undefined {
  if (!value) return undefined;

  // Payload may return an ID (number/string) when depth is 0.
  // We request depth=1 so in practice this should be a Media object.
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (typeof value !== "object") return undefined;

  const v = value as Record<string, unknown>;

  const url = typeof v.url === "string" ? v.url.trim() : "";
  if (url) return url;

  const filename = typeof v.filename === "string" ? v.filename.trim() : "";
  if (filename) return `/cms-media/${filename}`;

  return undefined;
}
