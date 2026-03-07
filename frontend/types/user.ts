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
