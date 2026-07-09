import { fetchAutocomplete } from "../utils/fetchAutocomplete"

export const autocompleteSources: Record<
  string,
  (q?: string) => Promise<any[]>
> = {
  job_titles: (q) => fetchAutocomplete("job_titles", q),
  skills: (q) => fetchAutocomplete("skills", q),
  certifications: (q) => fetchAutocomplete("certifications", q),
  industries: (q) => fetchAutocomplete("industries", q),
  languages: (q) => fetchAutocomplete("languages", q),
  // locations uses LocationIQ — leave as-is, don't touch
}
