import Cookies from "js-cookie"
import { getPublicUserUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const USER_BASE = getPublicUserUrl()

const authHeaders = () => {
  const token = Cookies.get("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

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
  bio?: string
  overview?: string
  location?: string
  timezone?: string
  availability?: string
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
}

export const UserAPI = {
  // Existing
  me: () => AxiosRequest.get(`${USER_BASE}/user/me`),
  handleSkip: (data: { role: string }) =>
    AxiosRequest.patch(`${USER_BASE}/user/onboarding-dismissed`, data),

  // List users
  listUsers: (limit = 50, offset = 0) =>
    AxiosRequest.get(`${USER_BASE}/v1/users?limit=${limit}&offset=${offset}`, {
      headers: authHeaders(),
    }),

  // Profile
  getProfile: (userId: string) =>
    AxiosRequest.get(`${USER_BASE}/v1/users/${userId}`, {
      headers: authHeaders(),
    }),
  getByUsername: (username: string) =>
    // Public endpoint served by TalentController (no auth required).
    // Returns the user plus loaded skills/experiences for the talent
    // profile card view.
    AxiosRequest.get(`${USER_BASE}/talent/users/${username}`),
  updateProfile: (userId: string, data: UserProfilePayload) =>
    AxiosRequest.patch(`${USER_BASE}/v1/users/${userId}`, data, {
      headers: authHeaders(),
    }),
  dismissOnboarding: (userId: string) =>
    AxiosRequest.patch(
      `${USER_BASE}/v1/users/${userId}/onboarding/dismiss`,
      {},
      { headers: authHeaders() }
    ),

  // Education
  addEducation: (data: EducationPayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/education`, data, {
      headers: authHeaders(),
    }),
  updateEducation: (eduId: string, data: EducationPayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/education/${eduId}`, data, {
      headers: authHeaders(),
    }),
  removeEducation: (eduId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/education/${eduId}`, {
      headers: authHeaders(),
    }),

  // Experience
  addExperience: (data: ExperiencePayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/experiences`, data, {
      headers: authHeaders(),
    }),
  updateExperience: (experienceId: string, data: ExperiencePayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/experiences/${experienceId}`, data, {
      headers: authHeaders(),
    }),
  removeExperience: (experienceId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/experiences/${experienceId}`, {
      headers: authHeaders(),
    }),

  // Skills
  addSkill: (data: SkillPayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/skills`, data, {
      headers: authHeaders(),
    }),
  updateSkill: (skillId: string, data: SkillPayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/skills/${skillId}`, data, {
      headers: authHeaders(),
    }),
  removeSkill: (skillId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/skills/${skillId}`, {
      headers: authHeaders(),
    }),

  // Languages
  addLanguage: (data: LanguagePayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/languages`, data, {
      headers: authHeaders(),
    }),
  updateLanguage: (langId: string, data: LanguagePayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/languages/${langId}`, data, {
      headers: authHeaders(),
    }),
  removeLanguage: (langId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/languages/${langId}`, {
      headers: authHeaders(),
    }),

  // Certifications
  addCertification: (data: CertificationPayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/certifications`, data, {
      headers: authHeaders(),
    }),
  updateCertification: (certId: string, data: CertificationPayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/certifications/${certId}`, data, {
      headers: authHeaders(),
    }),
  removeCertification: (certId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/certifications/${certId}`, {
      headers: authHeaders(),
    }),

  // Industries
  addIndustry: (data: IndustryPayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/industries`, data, {
      headers: authHeaders(),
    }),
  updateIndustry: (industryId: string, data: IndustryPayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/industries/${industryId}`, data, {
      headers: authHeaders(),
    }),
  removeIndustry: (industryId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/industries/${industryId}`, {
      headers: authHeaders(),
    }),
}
