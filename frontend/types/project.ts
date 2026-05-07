export type MediaType = {
  featuredImage?: File
  additionalImages?: File[]
  videoUrl?: string
}

export type ProjectScopeTaskType = {
  taskName: string
  role: string
  workSchedule?: {
    type: "full-time" | "part-time" | "custom"
    custom?: {
      hours?: number
      period?: "day" | "week" | "month" | "quarter"
    }
  }
  location: string[]
  experience: string
  duration: number
  estimatedHours?: number
}

export type ProjectScopePhaseType = {
  name: string
  stage: string
  startDay: number
  endDay: number
  tasks: ProjectScopeTaskType[]
}

export type CreateProjectType = {
  title: string
  categories?: string[]
  subCategories?: string[]
  categorySelections?: {
    category: string
    subCategories: string[]
  }[]
  industries?: string[]
  tags?: string[]
  skills?: string[]
  listingType?: string
  shortDescription: string
  fullDescription: string
  userId: string
}
