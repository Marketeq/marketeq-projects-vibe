type AutocompleteSuggestion = {
  id?: string;
  label?: string;
  value?: string;
};

const FALLBACK_INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Media",
  "Real Estate",
  "Energy",
  "Transportation",
];

const FALLBACK_TAG_OPTIONS = [
  "Web App",
  "Mobile App",
  "AI",
  "Blockchain",
  "UI/UX",
  "SaaS",
  "Analytics",
  "Security",
  "E-commerce",
  "Automation",
];

const FALLBACK_SKILL_OPTIONS = [
  "Node.js",
  "JavaScript",
  "Wireframing",
  "React",
  "TypeScript",
  "Figma",
  "SQL",
  "Python",
  "UX Research",
  "API Integration",
];

const FALLBACK_LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "French",
  "German",
  "Mandarin",
  "Portuguese",
  "Arabic",
  "Japanese",
  "Hindi",
  "Italian",
];

export function getAutocompleteServiceBaseUrl(): string {
  // In Payload admin (browser), always use same-origin CMS proxy to avoid CORS
  // and missing env exposure after refresh.
  if (typeof window !== "undefined") return "";
  return process.env.AUTOCOMPLETE_SERVICE_URL || "http://localhost:3016";
}

function normalizeSuggestionLabel(value: AutocompleteSuggestion): string {
  return (value.label || value.value || value.id || "").trim();
}

function getUniqueOptions(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export async function loadAutocompleteOptions(
  type: string,
  query: string,
): Promise<string[]> {
  const trimmedQuery = query.trim();
  const base = getAutocompleteServiceBaseUrl().replace(/\/$/, "");
  const url = base
    ? `${base}/autocomplete/${encodeURIComponent(type)}?q=${encodeURIComponent(trimmedQuery)}`
    : `/cms-autocomplete/${encodeURIComponent(type)}?q=${encodeURIComponent(trimmedQuery)}`;

  // If query is empty, prefer DB/JSON-backed “top” suggestions from the service
  // (the service returns first N items when q is empty for JSON-backed types).
  // Fall back to local defaults only if the request fails or returns no rows.

  let response: Response | null = null;
  try {
    response = await fetch(url);
  } catch {
    response = null;
  }

  if (!response || !response.ok) {
    if (!trimmedQuery) {
      if (type === "industries") return FALLBACK_INDUSTRY_OPTIONS;
      if (type === "search_keywords") return FALLBACK_TAG_OPTIONS;
      if (type === "skills") return FALLBACK_SKILL_OPTIONS;
      if (type === "usernames") return [];
      return [];
    }
    throw new Error(
      `Failed to load ${type} autocomplete (${response ? response.status : "network"})`,
    );
  }

  const payload = (await response.json()) as AutocompleteSuggestion[];
  const normalizedOptions = getUniqueOptions(
    payload.map(normalizeSuggestionLabel),
  );

  if (normalizedOptions.length > 0) {
    return normalizedOptions;
  }

  if (type === "industries") return FALLBACK_INDUSTRY_OPTIONS;
  if (type === "search_keywords") return FALLBACK_TAG_OPTIONS;
  if (type === "skills") return FALLBACK_SKILL_OPTIONS;
  if (type === "languages") return FALLBACK_LANGUAGE_OPTIONS;
  return [];
}

type SubmitAutocompletePayload = {
  type: string;
  value: string;
  source?: string;
};

export async function submitAutocompleteEntry({
  type,
  value,
  source,
}: SubmitAutocompletePayload): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) return;

  const base = getAutocompleteServiceBaseUrl().replace(/\/$/, "");
  const url = base ? `${base}/autocomplete/submit` : "/cms-autocomplete/submit";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      type,
      value: trimmed,
      source: source ?? "cms-service:talent-profiles",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to submit ${type} autocomplete (${response.status})`,
    );
  }
}

export {
  FALLBACK_INDUSTRY_OPTIONS,
  FALLBACK_TAG_OPTIONS,
  FALLBACK_SKILL_OPTIONS,
  FALLBACK_LANGUAGE_OPTIONS,
};
