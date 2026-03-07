import AxiosRequest from ".."

const USER_BASE = process.env.NEXT_PUBLIC_USER_URL ?? ""

export const UserAPI = {
  me: () => {
    return AxiosRequest.get(`${USER_BASE}/user/me`)
  },
  handleSkip: (data: { role: string }) =>
    AxiosRequest.patch(`${USER_BASE}/user/onboarding-dismissed`, data),
}
