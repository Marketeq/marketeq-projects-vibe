import {
  CheckUsernameParams,
  CreatePasswordParams,
  GoogleLoginParams,
  LinkedInLoginParams,
  LoginParams,
  SignUpParams,
} from "@/types/auth"
import AxiosRequest from ".."

const AUTH_BASE = process.env.NEXT_PUBLIC_AUTH_URL ?? ""
export const AuthAPI = {
  SignUpWithEmail: (data: SignUpParams) => {
    // email-only signup
    return AxiosRequest.post(`${AUTH_BASE}/auth/register-email`, {
      email: data.email,
    })
  },

  LoginWithEmail: (data: LoginParams) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/login`, data)
  },

  LoginWithGoogle: (data: GoogleLoginParams) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/google`, data)
  },

  LoginWithLinkedIn: (data: LinkedInLoginParams) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/linkedin`, data)
  },

  CheckUsername: (data: CheckUsernameParams) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/check-username`, data)
  },

  CreatePassword: (data: CreatePasswordParams) => {
    return AxiosRequest.patch(`${AUTH_BASE}/auth/set-password`, data)
  },

  Logout: () => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/logout`, null, {
      withCredentials: true,
    })
  },
}
