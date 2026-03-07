export const blacklist: Record<
  | "drugs"
  | "gambling"
  | "tobacco"
  | "adult"
  | "provocative"
  | "profanity"
  | "nonsense",
  string[]
> = {
  drugs: ["xanax", "weed", "molly", "ecstasy", "meth", "coke"],
  gambling: ["poker", "slots", "bet", "parlay", "sportsbook"],
  tobacco: ["vape", "nicotine", "juul", "zyn", "dip"],
  adult: ["porn", "camgirl", "fetish", "nude", "gangbang"],
  provocative: ["onlyfans", "hot girl", "sugar baby"],
  profanity: ["damn", "hell"],
  nonsense: [
    "goblin",
    "clown",
    "jedi",
    "dungeon",
    "wizard",
    "fairy",
    "pirate",
    "elf",
    "zombie",
    "ghost",
    "orc",
    "troll",
    "mythical",
    "unicorn",
  ],
}

// ✅ Add heuristic category rules inline
export const categoryRules = {
  tech: [
    "engineer",
    "developer",
    "data",
    "cloud",
    "ai",
    "machine",
    "software",
    "qa",
    "cybersecurity",
    "network",
    "systems",
    "backend",
    "frontend",
  ],
  marketing: [
    "seo",
    "content",
    "growth",
    "brand",
    "ads",
    "marketing",
    "digital",
    "media",
  ],
  finance: [
    "finance",
    "accountant",
    "investment",
    "equity",
    "analyst",
    "budget",
    "audit",
    "risk",
    "capital",
    "bank",
  ],
  design: [
    "ux",
    "ui",
    "designer",
    "illustrator",
    "figma",
    "photoshop",
    "sketch",
    "visual",
    "creative",
  ],
  operations: [
    "logistics",
    "supply",
    "inventory",
    "procurement",
    "warehouse",
    "distribution",
    "fulfillment",
    "operations",
    "transport",
  ],
}
