// utils/getJobTitleSuffixes.ts

const suffixKeywords = [
  "engineer",
  "developer",
  "designer",
  "scientist",
  "analyst",
  "architect",
  "manager",
  "strategist",
  "consultant",
  "technician",
  "specialist",
]

export function extractSuffixFromJobTitle(title: string): string | null {
  const lower = title.toLowerCase()
  const match = suffixKeywords.find((suffix) => lower.includes(suffix))
  return match || null
}
