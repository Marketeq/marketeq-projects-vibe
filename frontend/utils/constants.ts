export const ONE_SECOND = 1000

export const IMAGE_QUALITY = (() => {
  if (process.env.NEXT_PUBLIC_IMAGE_QUALITY !== undefined) {
    const parsed = parseFloat(process.env.NEXT_PUBLIC_IMAGE_QUALITY)
    return Number.isNaN(parsed) ? 75 : parsed
  }

  return 75
})()

export const HOT_KEYS = {
  ENTER: "Enter",
  SPACE: " ",
} as const

export const DAY_PERIODS = ["PM", "AM"]

export const TIMES = [
  "01:00",
  "01:30",
  "02:00",
  "02:30",
  "03:00",
  "03:30",
  "04:00",
  "04:30",
  "05:00",
  "05:30",
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
]

export enum Categories {
  SUGGESTED = "suggested",
  CUSTOM = "custom",
  SMILEYS_PEOPLE = "smileys_people",
  ANIMALS_NATURE = "animals_nature",
  FOOD_DRINK = "food_drink",
  TRAVEL_PLACES = "travel_places",
  ACTIVITIES = "activities",
  OBJECTS = "objects",
  SYMBOLS = "symbols",
  FLAGS = "flags",
}

export type CustomCategoryConfig = {
  category: Categories.CUSTOM
  name: string
}

export type CategoryConfig = {
  category: Categories
  name: string
}

export const configByCategory: Record<Categories, CategoryConfig> = {
  [Categories.SUGGESTED]: {
    category: Categories.SUGGESTED,
    name: "Frequently Used",
  },
  [Categories.CUSTOM]: {
    category: Categories.CUSTOM,
    name: "Custom Emojis",
  },
  [Categories.SMILEYS_PEOPLE]: {
    category: Categories.SMILEYS_PEOPLE,
    name: "Smileys & People",
  },
  [Categories.ANIMALS_NATURE]: {
    category: Categories.ANIMALS_NATURE,
    name: "Animals & Nature",
  },
  [Categories.FOOD_DRINK]: {
    category: Categories.FOOD_DRINK,
    name: "Food & Drink",
  },
  [Categories.TRAVEL_PLACES]: {
    category: Categories.TRAVEL_PLACES,
    name: "Travel & Places",
  },
  [Categories.ACTIVITIES]: {
    category: Categories.ACTIVITIES,
    name: "Activities",
  },
  [Categories.OBJECTS]: {
    category: Categories.OBJECTS,
    name: "Objects",
  },
  [Categories.SYMBOLS]: {
    category: Categories.SYMBOLS,
    name: "Symbols",
  },
  [Categories.FLAGS]: {
    category: Categories.FLAGS,
    name: "Flags",
  },
}

export const HTTPS = "https://"
