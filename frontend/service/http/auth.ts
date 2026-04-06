import {
  CheckUsernameParams,
  CreatePasswordParams,
  GoogleLoginParams,
  LinkedInLoginParams,
  LoginParams,
  SignUpParams,
} from "@/types/auth"
import AxiosRequest from ".."

const AUTH_BASE_ENV = process.env.NEXT_PUBLIC_AUTH_URL ?? ""
const AUTH_BASE =
  AUTH_BASE_ENV === "http://localhost:3001" ||
  AUTH_BASE_ENV === "http://127.0.0.1:3001"
    ? "/__auth"
    : AUTH_BASE_ENV || "/__auth"
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
