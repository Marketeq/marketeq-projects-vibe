import AxiosRequest from ".."

// Teams service runs on port 3003 (user-service), accessed through gateway
const TEAMS_BASE = process.env.NEXT_PUBLIC_TEAMS_URL ?? "/teams"
const AFFILIATED_TEAMS_BASE = "/affiliated-teams"

export interface TeamMember {
  id: string
  teamId: string
  userId: string
  role: string
  createdAt: string
  updatedAt: string
  username?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  email?: string
}

export interface AffiliatedTeam {
  id: string
  name: string
  location: string
  time: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface TeamsAPIType {
  getTeamMembers: (teamId: string) => ReturnType<typeof AxiosRequest.get>
  addTeamMember: (
    teamId: string,
    userId: string,
    role?: string
  ) => ReturnType<typeof AxiosRequest.post>
  removeTeamMember: (
    teamId: string,
    userId: string
  ) => ReturnType<typeof AxiosRequest.del>
  getMyTeam: () => ReturnType<typeof AxiosRequest.get>
  getAffiliatedTeams: () => ReturnType<typeof AxiosRequest.get>
  getMyTeams: () => ReturnType<typeof AxiosRequest.get>
  createAffiliatedTeam: (dto: {
    name: string
    location: string
    time: string
  }) => ReturnType<typeof AxiosRequest.post>
  getTalentUserByUsername: (
    username: string
  ) => ReturnType<typeof AxiosRequest.get>
  getTeam: (teamId: string) => ReturnType<typeof AxiosRequest.get>
}

export const TeamsAPI: TeamsAPIType = {
  getTalentUserByUsername: (username: string) => {
    return AxiosRequest.get(`/talent/users/${username}`)
  },

  // Teams the signed-in user owns or belongs to, returned as
  // { owned: Team[], member: Team[] } so the two can be shown separately.
  getMyTeams: () => {
    return AxiosRequest.get(`${TEAMS_BASE}/mine`)
  },

  // Get all members of a team
  getTeamMembers: (teamId: string) => {
    return AxiosRequest.get(`${TEAMS_BASE}/${teamId}/members`)
  },

  // Add a member to a team
  addTeamMember: (teamId: string, userId: string, role: string = "member") => {
    return AxiosRequest.post(`${TEAMS_BASE}/${teamId}/members`, {
      userId,
      role,
    })
  },

  // Remove a member from a team
  removeTeamMember: (teamId: string, userId: string) => {
    return AxiosRequest.del(`${TEAMS_BASE}/${teamId}/members/${userId}`)
  },

  getMyTeam: () => {
    return AxiosRequest.get(`${TEAMS_BASE}/my-team`)
  },

  getAffiliatedTeams: () => {
    return AxiosRequest.get(AFFILIATED_TEAMS_BASE)
  },

  createAffiliatedTeam: (dto) => {
    return AxiosRequest.post(AFFILIATED_TEAMS_BASE, dto)
  },

  getTeam: (teamId: string) => {
    return AxiosRequest.get(`${AFFILIATED_TEAMS_BASE}/${teamId}`)
  },
}
