export enum AUTH_PROVIDERS {
  EMAIL = "EMAIL",
  GOOGLE = "GOOGLE",
  LINKEDIN = "LINKEDIN",
}

export enum ROLE {
  ADMIN = "ADMIN",
  CLIENT = "CLIENT",
  TALENT = "TALENT",
}

export type User = {
  id: string
  email: string
  username?: string | null
  firstName?: string | null
  lastName?: string | null
  avatarUrl?: string | null
  role: ROLE
  provider: AUTH_PROVIDERS
  hasPassword?: boolean
  socialId?: string | null
  emailVerified: boolean
  onboardingDismissed: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export type UserSkill = {
  id: string
  name: string
  proficiency?: string | null
}

export type UserLanguage = {
  id: string
  name: string
  proficiency?: string | null
}

export type UserEducation = {
  id: string
  institution: string
  degree: string
  field: string
  startDate: string
  endDate?: string | null
}

export type UserExperience = {
  id: string
  company: string
  role: string
  startDate: string
  endDate?: string | null
  description?: string | null
}

export type UserCertification = {
  id: string
  name: string
  issuingOrganization?: string | null
  issueDate?: string | null
  expiryDate?: string | null
  credentialUrl?: string | null
}

export type UserIndustry = {
  id: string
  name: string
}

export type UserProfile = User & {
  bio?: string | null
  overview?: string | null
  location?: string | null
  timezone?: string | null
  availability?: string | null
  rateMin?: number | null
  rateMax?: number | null
  userType?: string | null
  industry?: string | null
  businessGoals?: string[] | null
  skills?: UserSkill[]
  languages?: UserLanguage[]
  education?: UserEducation[]
  experience?: UserExperience[]
  certifications?: UserCertification[]
  industries?: UserIndustry[]
}
