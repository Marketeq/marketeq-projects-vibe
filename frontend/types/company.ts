export interface Company {
  id: string
  name: string
  domain?: string
  logoUrl?: string
  ownerUserId: string
  createdAt?: string
  updatedAt?: string
}

export interface CompanyMember {
  userId: string
  email?: string
  /** Real name (first + last). Absent when the user hasn't set one. */
  name?: string
  /** Chosen handle, without the leading "@". Absent for system-generated ones. */
  username?: string
  avatarUrl?: string
  role: string
  permissions: string[]
  joinedAt?: string
}

export interface CreateCompanyDto {
  name: string
  domain?: string
  logoUrl?: string
}

export interface UpdateCompanyDto {
  name?: string
  logoUrl?: string
}

export interface UpdateCompanyMemberDto {
  role?: string
  permissions?: string[]
}
