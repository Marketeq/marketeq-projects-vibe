/* eslint-disable no-param-reassign */

/* eslint-disable no-underscore-dangle */
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"
import { getPublicApiUrl, getPublicAuthUrl } from "@/lib/runtime-urls"

interface Config extends AxiosRequestConfig {}

const BASE = getPublicApiUrl()

axios.defaults.baseURL = BASE
axios.defaults.withCredentials = true

const axiosInstance = axios.create({
  baseURL: BASE,
  timeout: 30000,
  withCredentials: true,
})

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (config.headers?.Authorization) {
      delete config.headers.Authorization
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
      .then(() => undefined)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    // Only intercept 401s, skip if already retried or if this IS the refresh call
    if (
      error?.response?.status !== 401 ||
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
          reject: (err: unknown) => reject(err),
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
      // Refresh failed — clear tokens, user will need to re-login
      return Promise.reject(refreshError)
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
