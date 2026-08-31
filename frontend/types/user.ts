import type { CustomAvailabilityDay } from "./talent"

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
  phone?: string | null
  role: ROLE
  userType?: string | null
  accountType?: ROLE
  provider: AUTH_PROVIDERS
  hasPassword?: boolean
  twoFactorEnabled?: boolean
  twoFactorMethod?: "totp" | "sms" | null
  socialId?: string | null
  emailVerified: boolean
  onboardingDismissed: boolean
  gettingStartedStep?: number | null
  customAvailability?: CustomAvailabilityDay[] | null
  recentJobTitle?: string | null
  jobTitles?: string[] | null
  teamName?: string | null
  companyWebsite?: string | null
  workplaceValues?: string[] | null
  clientOnboardedAt?: string | Date | null
  talentOnboardedAt?: string | Date | null
  onboardedAt?: string | Date | null
  hasCompletedOnboarding?: boolean | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  isNewUser?: boolean
  accountLinked?: boolean
  linkedProvider?: AUTH_PROVIDERS
}

export type UserSkill = {
  id: string
  name: string
  proficiency?: string | null
}

export type UserLanguage = {
  id: string
  name: string
  fluency?: string | null
}

export type UserEducation = {
  id: string
  school: string
  degree: string
  fieldOfStudy?: string | null
  startYear: number
  startMonth?: number | null
  endYear?: number | null
  endMonth?: number | null
  currentlyStudying?: boolean | null
  institutionLogoUrl?: string | null
}

export type UserExperience = {
  id: string
  company: string
  title: string
  location?: string | null
  startDate: string
  endDate?: string | null
  isCurrentRole?: boolean | null
  description?: string | null
  skills?: string[] | null
  companyLogoUrl?: string | null
}

export type UserCertification = {
  id: string
  name: string
  issuer: string
  issueDate: string
  expirationDate?: string | null
  credentialId?: string | null
  credentialUrl?: string | null
  skills?: string[] | null
}

export type UserIndustry = {
  id: string
  industry: string
  yearsOfExperience?: number | null
  description?: string | null
}

export type UserPortfolioItem = {
  id: string
  name: string
  description?: string | null
  url?: string | null
  imageUrl?: string | null
  tags?: string[] | null
}

export type UserProfile = User & {
  bio?: string | null
  overview?: string | null
  location?: string | null
  timezone?: string | null
  availability?: string | null
  customAvailability?: CustomAvailabilityDay[] | null
  rateMin?: number | null
  rateMax?: number | null
  userType?: string | null
  industry?: string | null
  businessGoals?: string[] | null
  lookingToWorkWith?: string[] | null
  totalProjectsCompleted?: number | null
  clientSuccessRating?: number | null
  repeatHireRate?: number | null
  skills?: UserSkill[]
  languages?: UserLanguage[]
  education?: UserEducation[]
  experience?: UserExperience[]
  certifications?: UserCertification[]
  industries?: UserIndustry[]
  portfolio?: UserPortfolioItem[]
}
