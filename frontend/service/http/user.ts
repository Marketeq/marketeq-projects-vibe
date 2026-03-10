import AxiosRequest from ".."
import Cookies from "js-cookie"

const USER_BASE = process.env.NEXT_PUBLIC_USER_URL ?? ""

const authHeaders = () => {
  const token = Cookies.get("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface EducationPayload {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate?: string
}

export interface ExperiencePayload {
  company: string
  role: string
  startDate: string
  endDate?: string
  description?: string
}

export interface SkillPayload {
  name: string
  proficiency?: string
}

export interface LanguagePayload {
  name: string
  proficiency?: string
}

export interface CertificationPayload {
  name: string
  issuingOrganization?: string
  issueDate?: string
  expiryDate?: string
  credentialUrl?: string
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
  rateMin?: number
  rateMax?: number
  userType?: string
  industry?: string
  businessGoals?: string[]
}

export const UserAPI = {
  // Existing
  me: () => AxiosRequest.get(`${USER_BASE}/user/me`),
  handleSkip: (data: { role: string }) =>
    AxiosRequest.patch(`${USER_BASE}/user/onboarding-dismissed`, data),

  // Profile
  getProfile: (userId: string) =>
    AxiosRequest.get(`${USER_BASE}/v1/users/${userId}`, {
      headers: authHeaders(),
    }),
  updateProfile: (userId: string, data: UserProfilePayload) =>
    AxiosRequest.put(`${USER_BASE}/v1/users/${userId}`, data, {
      headers: authHeaders(),
    }),
  dismissOnboarding: (userId: string) =>
    AxiosRequest.patch(
      `${USER_BASE}/v1/users/${userId}/onboarding/dismiss`,
      {},
      { headers: authHeaders() }
    ),

  // Education
  addEducation: (userId: string, data: EducationPayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/users/${userId}/education`, data, {
      headers: authHeaders(),
    }),
  updateEducation: (userId: string, eduId: string, data: EducationPayload) =>
    AxiosRequest.put(
      `${USER_BASE}/v1/users/${userId}/education/${eduId}`,
      data,
      { headers: authHeaders() }
    ),
  removeEducation: (userId: string, eduId: string) =>
    AxiosRequest.del(
      `${USER_BASE}/v1/users/${userId}/education/${eduId}`,
      { headers: authHeaders() }
    ),

  // Experience
  addExperience: (userId: string, data: ExperiencePayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/users/${userId}/work`, data, {
      headers: authHeaders(),
    }),
  updateExperience: (
    userId: string,
    workId: string,
    data: ExperiencePayload
  ) =>
    AxiosRequest.put(
      `${USER_BASE}/v1/users/${userId}/work/${workId}`,
      data,
      { headers: authHeaders() }
    ),
  removeExperience: (userId: string, workId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/users/${userId}/work/${workId}`, {
      headers: authHeaders(),
    }),

  // Skills
  addSkill: (userId: string, data: SkillPayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/users/${userId}/skills`, data, {
      headers: authHeaders(),
    }),
  updateSkill: (userId: string, skillId: string, data: SkillPayload) =>
    AxiosRequest.put(
      `${USER_BASE}/v1/users/${userId}/skills/${skillId}`,
      data,
      { headers: authHeaders() }
    ),
  removeSkill: (userId: string, skillId: string) =>
    AxiosRequest.del(`${USER_BASE}/v1/users/${userId}/skills/${skillId}`, {
      headers: authHeaders(),
    }),

  // Languages
  addLanguage: (userId: string, data: LanguagePayload) =>
    AxiosRequest.post(`${USER_BASE}/v1/users/${userId}/languages`, data, {
      headers: authHeaders(),
    }),
  updateLanguage: (userId: string, langId: string, data: LanguagePayload) =>
    AxiosRequest.put(
      `${USER_BASE}/v1/users/${userId}/languages/${langId}`,
      data,
      { headers: authHeaders() }
    ),
  removeLanguage: (userId: string, langId: string) =>
    AxiosRequest.del(
      `${USER_BASE}/v1/users/${userId}/languages/${langId}`,
      { headers: authHeaders() }
    ),

  // Certifications
  addCertification: (userId: string, data: CertificationPayload) =>
    AxiosRequest.post(
      `${USER_BASE}/v1/users/${userId}/certifications`,
      data,
      { headers: authHeaders() }
    ),
  updateCertification: (
    userId: string,
    certId: string,
    data: CertificationPayload
  ) =>
    AxiosRequest.put(
      `${USER_BASE}/v1/users/${userId}/certifications/${certId}`,
      data,
      { headers: authHeaders() }
    ),
  removeCertification: (userId: string, certId: string) =>
    AxiosRequest.del(
      `${USER_BASE}/v1/users/${userId}/certifications/${certId}`,
      { headers: authHeaders() }
    ),

  // Industries
  addIndustry: (userId: string, data: { name: string }) =>
    AxiosRequest.post(`${USER_BASE}/v1/users/${userId}/industries`, data, {
      headers: authHeaders(),
    }),
  removeIndustry: (userId: string, industryId: string) =>
    AxiosRequest.del(
      `${USER_BASE}/v1/users/${userId}/industries/${industryId}`,
      { headers: authHeaders() }
    ),
}
