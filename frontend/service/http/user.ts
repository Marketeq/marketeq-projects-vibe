import { getPublicUserUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const USER_BASE = getPublicUserUrl()

export interface EducationPayload {
  school: string
  degree: string
  fieldOfStudy?: string
  startYear: number
  startMonth?: number
  endYear?: number
  endMonth?: number
  currentlyStudying?: boolean
}

export interface ExperiencePayload {
  company: string
  title: string
  location?: string
  startDate: string
  endDate?: string
  isCurrentRole?: boolean
  description?: string
  skills?: string[]
}

export interface SkillPayload {
  name: string
  proficiency?: string
}

export interface LanguagePayload {
  name: string
  fluency?: string
}

export interface CertificationPayload {
  name: string
  issuer?: string
  issueDate: string
  expirationDate?: string
  credentialId?: string
  credentialUrl?: string
  skills?: string[]
  doesntExpire?: boolean
}

export interface IndustryPayload {
  industry: string
  yearsOfExperience?: number
  description?: string
}

export interface UserProfilePayload {
  firstName?: string
  lastName?: string
  username?: string
  phone?: string
  language?: string
  bio?: string
  overview?: string
  location?: string
  timezone?: string
  availability?: string
  customAvailability?: Array<{
    day: string
    startTime: string
    startTimeDayPeriod: string
    endTime: string
    endTimeDayPeriod: string
  }> | null
  role?: string | null
  rateMin?: number | null
  rateMax?: number | null
  jobTitles?: Array<{
    jobTitle: string
    clientRate: number
    earning: number
    fee: number
    saveAsDefault: boolean
  }> | null
  recentJobTitle?: string | null
  userType?: string
  industry?: string
  businessGoals?: string[]
  gettingStartedStep?: number | null
  // Client company profile — collected by the client "Complete My Profile"
  // steps. `teamName` is the company name; the logo reuses `avatarUrl`.
  teamName?: string
  /** Department — Personal Info's "What team do you work on?". Distinct from
   *  `teamName`, which is the client's company name. */
  department?: string
  companyWebsite?: string
  workplaceValues?: string[]
}

export const UserAPI = {
  // Existing
  me: () => AxiosRequest.get(`${USER_BASE}/user/me`),
  handleSkip: (data: { role: string }) =>
    AxiosRequest.patch(`${USER_BASE}/user/onboarding-dismissed`, data),
  // Account recovery / contact number. Served by UserSelfController, so it
  // acts on the signed-in user and takes no id. Pass null to clear.
  updatePhone: (phone: string | null) =>
    AxiosRequest.patch(`${USER_BASE}/user/phone`, { phone }),
  // ES-06: Currency Settings entry point — sets the region currency
  // earnings-service falls back to USD without.
  updateCurrency: (currency: string) =>
    AxiosRequest.patch(`${USER_BASE}/user/currency`, { currency }),

  // List users
  listUsers: (limit = 50, offset = 0) =>
    AxiosRequest.get(`${USER_BASE}/v1/users?limit=${limit}&offset=${offset}`),

  // Total user count. Use this instead of measuring listUsers(), which is
  // paged, so its length plateaus at the limit rather than growing.
  countUsers: () => AxiosRequest.get(`${USER_BASE}/v1/users/count`),

  // Profile
  getProfile: (userId: string) =>
    AxiosRequest.get(`${USER_BASE}/v1/users/${userId}`),
  getByUsername: (username: string) =>
    // Public endpoint served by TalentController (no auth required).
    // Returns the user plus loaded skills/experiences for the talent
    // profile card view.
    AxiosRequest.get(`${USER_BASE}/talent/users/${username}`),
  getSimilarProfiles: (userId: string) =>
    AxiosRequest.get(`${USER_BASE}/users/${userId}/similar-profiles`),
  updateProfile: (userId: string, data: UserProfilePayload) =>
    AxiosRequest.patch(`${USER_BASE}/v1/users/${userId}`, data),
  dismissOnboarding: (userId: string) =>
    AxiosRequest.patch(`${USER_BASE}/v1/users/${userId}/onboarding/dismiss`, {}),

  // Education
  addEducation: (data: EducationPayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/education`, data),
  updateEducation: (eduId: string, data: EducationPayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/education/${eduId}`, data),
  removeEducation: (eduId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/education/${eduId}`),

  // Experience
  addExperience: (data: ExperiencePayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/experiences`, data),
  updateExperience: (experienceId: string, data: ExperiencePayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/experiences/${experienceId}`, data),
  removeExperience: (experienceId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/experiences/${experienceId}`),

  // Skills
  addSkill: (data: SkillPayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/skills`, data),
  updateSkill: (skillId: string, data: SkillPayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/skills/${skillId}`, data),
  removeSkill: (skillId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/skills/${skillId}`),

  // Languages
  addLanguage: (data: LanguagePayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/languages`, data),
  updateLanguage: (langId: string, data: LanguagePayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/languages/${langId}`, data),
  removeLanguage: (langId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/languages/${langId}`),

  // Certifications
  addCertification: (data: CertificationPayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/certifications`, data),
  updateCertification: (certId: string, data: CertificationPayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/certifications/${certId}`, data),
  removeCertification: (certId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/certifications/${certId}`),

  // Certification Issuers
  getCertificationIssuers: () =>
    AxiosRequest.get(`${USER_BASE}/v1/certification-issuers`),
  searchCertificationIssuers: (query: string) =>
    AxiosRequest.get(`${USER_BASE}/v1/certification-issuers/search?q=${encodeURIComponent(query)}`),
  resolveCertificationLogos: (certifications: Array<{ name: string; issuer?: string }>) =>
    AxiosRequest.post(`${USER_BASE}/v1/certification-issuers/resolve-logos`, { certifications }),

  // Industries
  addIndustry: (data: IndustryPayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/industries`, data),
  updateIndustry: (industryId: string, data: IndustryPayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/industries/${industryId}`, data),
  removeIndustry: (industryId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/industries/${industryId}`),

  // Resume
  uploadResume: (file: File, onUploadProgress?: (percent: number) => void) => {
    const formData = new FormData()
    formData.append("file", file)
    return AxiosRequest.post(`${USER_BASE}/resume/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
      ...(onUploadProgress
        ? {
            onUploadProgress: (event: {
              loaded: number
              total?: number
            }) => {
              if (!event.total) return
              onUploadProgress(Math.round((event.loaded * 100) / event.total))
            },
          }
        : {}),
    })
  },
  applyResume: (data: {
    parseResultId?: string
    skills?: { name: string; proficiency?: string }[]
    education?: {
      school: string
      degree: string
      fieldOfStudy?: string
      startYear?: number
      endYear?: number
      currentlyStudying?: boolean
    }[]
    workExperience?: {
      title: string
      company: string
      location?: string
      startDate?: string
      endDate?: string
      isCurrentRole?: boolean
      description?: string
    }[]
    certifications?: {
      name: string
      issuer?: string
      issueDate?: string
    }[]
    industries?: { name: string }[]
    replaceConflicts?: boolean
    conflictResolutions?: {
      entityType: "education" | "work" | "certification"
      existingId: string
      applyUpdate: boolean
    }[]
  }) => AxiosRequest.post(`${USER_BASE}/resume/apply`, data),
  deleteResume: () => AxiosRequest.del(`${USER_BASE}/resume`),
  getResumeStatus: () => AxiosRequest.get(`${USER_BASE}/resume/status`),
  getPendingReview: () => AxiosRequest.get(`${USER_BASE}/resume/pending-review`),
  getResumeViewUrl: () => AxiosRequest.get(`${USER_BASE}/resume/view`),
  getResumeDownloadUrl: () => AxiosRequest.get(`${USER_BASE}/resume/download`),
  undoResumeImport: (parseResultId: string) =>
    AxiosRequest.post(`${USER_BASE}/resume/undo/${parseResultId}`, {}),
}
