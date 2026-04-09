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

  Logout: (refreshToken?: string) => {
    return AxiosRequest.post(
      `${AUTH_BASE}/auth/logout`,
      refreshToken ? { refresh_token: refreshToken } : null,
      { withCredentials: true }
    )
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

  EnableTwoFactor: (data: { code: string }) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/2fa/enable`, data)
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

  CleanupSession: (refreshToken: string, sessionId: string) => {
    return AxiosRequest.post(`${AUTH_BASE}/auth/sessions/cleanup`, {
      refresh_token: refreshToken,
      sessionId,
    })
  },

  RevokeAllOtherSessions: (currentSessionId: string) => {
    return AxiosRequest.del(
      `${AUTH_BASE}/auth/sessions?currentSessionId=${encodeURIComponent(currentSessionId)}`
    )
  },
}
