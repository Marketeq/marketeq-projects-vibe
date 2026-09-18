import {
  CheckUsernameParams,
  CreatePasswordParams,
  GoogleLoginParams,
  LinkedInLoginParams,
  LoginParams,
  SignUpParams,
} from "@/types/auth"
import { getPublicAuthUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const AUTH_BASE = getPublicAuthUrl()

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

  ForgotPassword: (data: { email: string; redirectUrl?: string }) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/forgot-password`, data)
  },

  ResetPassword: (data: { token: string; password: string }) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/reset-password`, data)
  },

  GenerateTwoFactor: () => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/2fa/generate`, {})
  },

  EnableTwoFactor: (data: { code: string; method?: string }) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/2fa/enable`, data)
  },

  GenerateSmsTwoFactor: (data: { phone: string }) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/2fa/generate-sms`, data)
  },

  ResendTwoFactorCode: (data: { partialToken?: string }) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/2fa/resend`, data)
  },

  DisableTwoFactor: (data: { code: string }) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/2fa/disable`, data)
  },

  VerifyTwoFactor: (data: { code: string; partialToken: string }) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/2fa/verify`, data)
  },

  RegenerateBackupCodes: (data: { code: string }) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/2fa/backup-codes`, data)
  },

  GetSessions: (currentSessionId: string) => {
    return AxiosRequest.get(
      `${AUTH_BASE}/auth/sessions?currentSessionId=${encodeURIComponent(currentSessionId)}`
    )
  },

  RevokeSession: (sessionId: string) => {
    return AxiosRequest.del(`${AUTH_BASE}/auth/sessions/${sessionId}`)
  },

  Heartbeat: () => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/sessions/heartbeat`, {})
  },

  RevokeAllOtherSessions: (currentSessionId: string) => {
    return AxiosRequest.del(
      `${AUTH_BASE}/auth/sessions?currentSessionId=${encodeURIComponent(currentSessionId)}`
    )
  },
}
