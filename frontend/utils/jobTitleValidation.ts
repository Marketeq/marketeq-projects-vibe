import leoProfanity from "leo-profanity"
import { blacklist } from "../utils/blacklist"
import { categoryRules } from "../utils/blacklist"

// Initialize the profanity dictionary once
leoProfanity.loadDictionary("en")

// 🔧 Define a strict type for allowed categories
type BlacklistCategory = keyof typeof blacklist

// ✅ Basic spell check using LanguageTool API
export const spellCheck = async (input: string): Promise<boolean> => {
  const response = await fetch("https://api.languagetoolplus.com/v2/check", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      text: input,
      language: "en-US",
    }),
  })

  const result = await response.json()
  const spellingIssues = result.matches.filter(
    (match: any) => match.rule.issueType === "misspelling"
  )

  return spellingIssues.length === 0
}

// ✅ Format check: letters, spaces, dashes, parentheses
export const formatCheck = (input: string): boolean => {
  return /^[a-zA-Z\s\-\(\)]+$/.test(input)
}

// ✅ Placeholder for category-specific logic
export const categoryCheck = async (
  input: string
): Promise<{ valid: boolean; category: string | null }> => {
  const allowed = ["tech", "marketing", "finance", "design", "operations"]
  const category = await matchCategory(input)
  return {
    valid: category !== null && allowed.includes(category),
    category,
  }
}

// ✅ Profanity filter
export const profanityCheck = (input: string): boolean => {
  return !leoProfanity.check(input)
}

// ✅ Blacklist category filter
export const categoryFilter = (input: string): boolean => {
  const normalized = input.toLowerCase()
  for (const category of Object.keys(blacklist) as BlacklistCategory[]) {
    const terms = blacklist[category]
    for (const banned of terms) {
      if (normalized.includes(banned.toLowerCase())) {
        console.warn(`Blocked due to ${category}; ${banned}`)
        return false
      }
    }
  }
  return true
}

export const nonsenseKeywordCheck = (input: string): boolean => {
  const words = input.toLowerCase().split(/\s+/)
  const nonsenseWords = blacklist.nonsense

  let matchCount = 0
  for (const word of words) {
    if (nonsenseWords.includes(word)) {
      matchCount++
    }
  }

  return matchCount === 0 // ✅ Reject if any nonsense word matches
}

// ✅ Log rejected input to backend
async function logRejection(
  input: string,
  type: "job-title" | "project" | "industry",
  reason: string
) {
  try {
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/talent/rejected-inputs`
    console.log("🔁 Sending rejected input to:", url)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input, type, reason }),
    })

    const result = await response.json()
    console.log("📬 Rejection log response:", response.status, result)

    if (!response.ok) {
      console.error("❌ Backend rejected log request:", result)
    }
  } catch (err) {
    console.error("💥 Failed to log rejection (network error):", err)
  }
}

export const assignHeuristicCategory = (label: string): string | null => {
  const words = label.toLowerCase().split(/\s|\-/)

  for (const [category, keywords] of Object.entries(categoryRules)) {
    if (keywords.some((keyword) => words.includes(keyword))) {
      return category
    }
  }

  return null
}

export const assignSemanticCategory = async (
  label: string
): Promise<string | null> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SEMANTIC_API_URL}/semantic-category`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      }
    )

    const { category, score } = await response.json()
    console.log(`Semantic match result:`, { input: label, category, score })
    return score >= 0.85 ? category : null
  } catch (err) {
    console.error("Semantic category match failed:", err)
    return null
  }
}

export const matchCategory = async (label: string): Promise<string | null> => {
  const heuristic = assignHeuristicCategory(label)
  if (heuristic) return heuristic

  const semantic = await assignSemanticCategory(label)
  return semantic
}

// ✅ Unified moderation submit function
export async function submitTextToModerationQueue(
  input: string,
  type: "job-title" | "project" | "industry"
) {
  const isSpellingCorrect = await spellCheck(input)
  const isFormatted = formatCheck(input)
  const isClean = profanityCheck(input)
  const { valid: isCategoryOkay, category } = await categoryCheck(input)
  const isBlacklistSafe = categoryFilter(input)
  const isNonsenseFree = nonsenseKeywordCheck(input) // ✅ New
  const isLengthValid = input.length >= 3 && input.length <= 100
  const isWordCountValid = input.trim().split(/\s+/).length <= 4

  const reasons: string[] = []

  if (!isSpellingCorrect) reasons.push("spelling")
  if (!isFormatted) reasons.push("format")
  if (!isClean) reasons.push("profanity")
  if (!isCategoryOkay) reasons.push(`category: ${category ?? "none"}`)
  if (!isBlacklistSafe) reasons.push("blacklist")
  if (!isNonsenseFree) reasons.push("nonsense") // ✅ Added
  if (!isLengthValid) reasons.push("length")
  if (!isWordCountValid) reasons.push("too many words")

  if (reasons.length > 0) {
    console.error(`❌ Blocked ${type} failed moderation:`, input)
    await logRejection(input, type, reasons.join(", "))
    return null
  }

  try {
    const endpoint = "/talent/job-titles/queue"
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: input, type }),
      }
    )

    if (!response.ok) throw new Error("Failed to queue")

    const result = await response.json()
    console.log("✅ Successfully submitted to backend:", result)
    return result
  } catch (error) {
    console.error(`💥 Failed to submit ${type}`, error)
    return null
  }
}
