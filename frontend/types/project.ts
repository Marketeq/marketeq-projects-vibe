export type MediaType = {
  featuredImage?: File
  additionalImages?: File[]
  videoUrl?: string
}

export type ProjectScopeTaskType = {
  taskName: string
  role: string
  location: string[]
  experience: string
  duration: number
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
  industries?: string[]
  tags?: string[]
  skills?: string[]
  shortDescription: string
  fullDescription: string
  userId: string
}
