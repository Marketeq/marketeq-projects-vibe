import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const languagesPath = path.resolve(__dirname, "../public/mock/languages.json")

// Maintained ranking for the static language picker. Unknown languages keep a
// stable alphabetical order after these common choices.
const popularityOrder = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "zh", label: "Chinese" },
  { id: "hi", label: "Hindi" },
  { id: "ar", label: "Arabic" },
  { id: "pt", label: "Portuguese" },
  { id: "bn", label: "Bengali" },
  { id: "ru", label: "Russian" },
  { id: "ja", label: "Japanese" },
  { id: "pa", label: "Punjabi" },
  { id: "ko", label: "Korean" },
  { id: "te", label: "Telugu" },
  { id: "mr", label: "Marathi" },
  { id: "ta", label: "Tamil" },
  { id: "ur", label: "Urdu" },
  { id: "tr", label: "Turkish" },
  { id: "vi", label: "Vietnamese" },
  { id: "it", label: "Italian" },
  { id: "pl", label: "Polish" },
  { id: "uk", label: "Ukrainian" },
  { id: "nl", label: "Dutch" },
  { id: "el", label: "Greek" },
  { id: "he", label: "Hebrew" },
  { id: "id", label: "Indonesian" },
  { id: "ms", label: "Malay" },
  { id: "th", label: "Thai" },
  { id: "sv", label: "Swedish" },
  { id: "no", label: "Norwegian" },
  { id: "da", label: "Danish" },
  { id: "fi", label: "Finnish" },
]

const rankById = new Map(popularityOrder.map((item, index) => [item.id, index]))
const rankByLabel = new Map(
  popularityOrder.map((item, index) => [item.label.toLowerCase(), index])
)

const languages = JSON.parse(fs.readFileSync(languagesPath, "utf8"))

languages.sort((a, b) => {
  const aLabel = String(a.label ?? "")
  const bLabel = String(b.label ?? "")
  const aRank =
    rankById.get(String(a.id ?? "")) ?? rankByLabel.get(aLabel.toLowerCase())
  const bRank =
    rankById.get(String(b.id ?? "")) ?? rankByLabel.get(bLabel.toLowerCase())

  if (aRank !== undefined || bRank !== undefined) {
    return (
      (aRank ?? Number.MAX_SAFE_INTEGER) - (bRank ?? Number.MAX_SAFE_INTEGER)
    )
  }

  return aLabel.localeCompare(bLabel, "en")
})

fs.writeFileSync(languagesPath, `${JSON.stringify(languages, null, 2)}\n`)
