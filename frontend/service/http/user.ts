import AxiosRequest from ".."

const USER_BASE_ENV = process.env.NEXT_PUBLIC_USER_URL ?? ""
const USER_BASE =
  USER_BASE_ENV === "http://localhost:3003" ||
  USER_BASE_ENV === "http://127.0.0.1:3003"
    ? "/__user"
    : USER_BASE_ENV || "/__user"

export type CreatePortfolioData = {
  name: string
  description?: string
  url?: string
  imageUrl?: string
  tags?: string[]
}

export type UpdatePortfolioData = Partial<CreatePortfolioData>

export type CreateSkillData = {
  name: string
  proficiency?: string
}

export type UpdateSkillData = Partial<CreateSkillData>

export type CreateExperienceData = {
  title: string
  company: string
  location?: string
  startDate: string
  endDate?: string
  isCurrentRole?: boolean
  description?: string
}

export type UpdateExperienceData = Partial<CreateExperienceData>

export type CreateEducationData = {
  school: string
  degree: string
  fieldOfStudy?: string
  startYear: number
  startMonth?: number
  endYear?: number
  endMonth?: number
  currentlyStudying?: boolean
}

export type UpdateEducationData = Partial<CreateEducationData>

export const UserAPI = {
  me: () => {
    return AxiosRequest.get(`${USER_BASE}/user/me`)
  },
  getById: (id: string) => {
    return AxiosRequest.get(`${USER_BASE}/users/${id}`)
  },
  handleSkip: (data: { role: string }) =>
    AxiosRequest.patch(`${USER_BASE}/user/onboarding-dismissed`, data),

  // Portfolio
  portfolio: {
    create: (data: CreatePortfolioData) =>
      AxiosRequest.post(`${USER_BASE}/portfolio`, data),
    list: () => AxiosRequest.get(`${USER_BASE}/portfolio`),
    update: (itemId: string, data: UpdatePortfolioData) =>
      AxiosRequest.put(`${USER_BASE}/portfolio/${itemId}`, data),
    delete: (itemId: string) =>
      AxiosRequest.del(`${USER_BASE}/portfolio/${itemId}`),
  },

  // Skills
  skills: {
    create: (data: CreateSkillData) =>
      AxiosRequest.post(`${USER_BASE}/skills`, data),
    list: (params?: { search?: string; limit?: number }) =>
      AxiosRequest.get(`${USER_BASE}/skills`, { params }),
    update: (id: string, data: UpdateSkillData) =>
      AxiosRequest.put(`${USER_BASE}/skills/${id}`, data),
    delete: (id: string) => AxiosRequest.del(`${USER_BASE}/skills/${id}`),
  },

  // Work Experiences
  experiences: {
    create: (data: CreateExperienceData) =>
      AxiosRequest.post(`${USER_BASE}/experiences`, data),
    list: () => AxiosRequest.get(`${USER_BASE}/experiences`),
    update: (id: string, data: UpdateExperienceData) =>
      AxiosRequest.put(`${USER_BASE}/experiences/${id}`, data),
    delete: (id: string) => AxiosRequest.del(`${USER_BASE}/experiences/${id}`),
  },

  // Languages
  languages: {
    create: (data: { name: string; fluency: string }) =>
      AxiosRequest.post(`${USER_BASE}/languages`, data),
    list: () => AxiosRequest.get(`${USER_BASE}/languages`),
    update: (id: string, data: { name?: string; fluency?: string }) =>
      AxiosRequest.put(`${USER_BASE}/languages/${id}`, data),
    delete: (id: string) => AxiosRequest.del(`${USER_BASE}/languages/${id}`),
  },

  // Education
  education: {
    create: (data: CreateEducationData) =>
      AxiosRequest.post(`${USER_BASE}/education`, data),
    list: () => AxiosRequest.get(`${USER_BASE}/education`),
    update: (id: string, data: UpdateEducationData) =>
      AxiosRequest.put(`${USER_BASE}/education/${id}`, data),
    delete: (id: string) => AxiosRequest.del(`${USER_BASE}/education/${id}`),
  },

  // User settings
  updateRate: (data: { rate_min?: number; rate_max?: number }) =>
    AxiosRequest.put(`${USER_BASE}/rate`, data),
  updateOverview: (data: { overview: string }) =>
    AxiosRequest.put(`${USER_BASE}/overview`, data),
  updateBio: (data: { bio: string }) =>
    AxiosRequest.put(`${USER_BASE}/bio`, data),
  updateAvailability: (data: {
    availability: string
    customAvailability?: unknown
  }) => AxiosRequest.put(`${USER_BASE}/availability`, data),
  updateJobTitle: (data: { recentJobTitle: string }) =>
    AxiosRequest.put(`${USER_BASE}/job-title`, data),
  refreshTimezone: (data: { clientTimeZone?: string }) =>
    AxiosRequest.patch(`${USER_BASE}/user/refresh-timezone`, data),
  updateAvatar: (data: { avatarUrl: string }) =>
    AxiosRequest.put(`${USER_BASE}/avatar`, data),
  removeAvatar: () => AxiosRequest.del(`${USER_BASE}/avatar`),
}
