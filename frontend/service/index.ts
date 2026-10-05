/* eslint-disable no-param-reassign */

/* eslint-disable no-underscore-dangle */
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"
import { getPublicApiUrl, getPublicAuthUrl } from "@/lib/runtime-urls"
import { getCsrfToken, setCsrfToken, waitForCsrfToken } from "@/src/lib/csrf"

interface Config extends AxiosRequestConfig {}

const BASE = getPublicApiUrl()

axios.defaults.baseURL = BASE
axios.defaults.withCredentials = true

const axiosInstance = axios.create({
  baseURL: BASE,
  timeout: 30000,
  withCredentials: true,
})

const WRITE_METHODS = new Set(["post", "put", "patch", "delete"])

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.headers?.Authorization) {
      delete config.headers.Authorization
    }

    // Attach CSRF token on state-changing requests.
    // If the token isn't available yet (page reload), wait for the
    // GET /auth/csrf fetch to complete before sending the request.
    if (config.method && WRITE_METHODS.has(config.method)) {
      if (!getCsrfToken()) {
        await Promise.race([waitForCsrfToken(), new Promise((r) => setTimeout(r, 3000))])
      }
      const token = getCsrfToken()
      if (token) {
        config.headers.set("X-CSRF-Token", token)
      }
    }

    return Promise.resolve(config)
  },
  (err) => {
    return Promise.reject(err)
  }
)

// Auto-refresh: if a request gets 401, try refreshing the token and retry once
let isRefreshing = false
let failedQueue: Array<{
  resolve: () => void
  reject: (err: unknown) => void
}> = []

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (!error) prom.resolve()
    else prom.reject(error)
  })
  failedQueue = []
}

let refreshInFlight: Promise<void> | null = null

/**
 * Refresh the session, collapsing concurrent callers onto a single request.
 *
 * `apiFetch` (src/lib/api.ts) is a separate HTTP layer that does not go through
 * these interceptors, so without a shared entry point a fetch-side 401 and an
 * axios-side 401 could POST /auth/refresh concurrently — the second call would
 * present a refresh token the first one had already consumed and log the user
 * out. Both layers route through here so only one refresh is ever in flight.
 */
export const refreshSession = (): Promise<void> => {
  if (!refreshInFlight) {
    const AUTH_BASE = getPublicAuthUrl()
    refreshInFlight = axiosInstance
      .post(`${AUTH_BASE}/auth/refresh`, null)
      .then((res) => {
        const csrf = res?.data?.csrfToken
        if (csrf) setCsrfToken(csrf)
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

axiosInstance.interceptors.response.use(
  (response) => {
    // Capture csrfToken from auth responses (login, register, oauth, 2fa verify)
    const csrf = response?.data?.csrfToken
    if (csrf && typeof csrf === "string") {
      setCsrfToken(csrf)
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config
    const status = error?.response?.status
    const isCsrf =
      status === 403 &&
      error?.response?.data?.code === "CSRF_TOKEN_INVALID"

    // Only intercept 401s and 403 CSRF failures, skip if already retried or
    // if this IS the refresh/login call
    if (
      (!isCsrf && status !== 401) ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login")
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: () => {
            originalRequest._retry = true
            resolve(axiosInstance(originalRequest))
          },
          reject: () => reject(error),
        })
      })
    }

    isRefreshing = true
    originalRequest._retry = true

    try {
      await refreshSession()
      processQueue()
      return axiosInstance(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError)
      // Refresh failed, so the session is genuinely over. Reject with the
      // caller's own 401 rather than the refresh call's error: the caller's
      // payload already reads "Your session has expired. Please log in again
      // to continue.", whereas the refresh error surfaces the internal
      // "Invalid refresh token" — which is what onboarding was showing users.
      // Nothing can be cleared here; access_token/refresh_token are httpOnly,
      // so only a fresh sign-in replaces them.
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)

const get = (url: string, config: Config = {}): Promise<AxiosResponse> =>
  axiosInstance.get(url, config)

const post = <T>(
  url: string,
  data: T,
  config: Config = {}
): Promise<AxiosResponse> => axiosInstance.post(url, data, config)

const put = <T>(
  url: string,
  data: T,
  config: Config = {}
): Promise<AxiosResponse> => axiosInstance.put(url, data, config)

const patch = <T>(
  url: string,
  data: T,
  config: Config = {}
): Promise<AxiosResponse> => axiosInstance.patch(url, data, config)

const del = (url: string, config: Config = {}): Promise<AxiosResponse> =>
  axiosInstance.delete(url, config)

const AxiosRequest = {
  get,
  post,
  put,
  patch,
  del,
}

export default AxiosRequest
