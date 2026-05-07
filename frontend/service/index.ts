/* eslint-disable no-param-reassign */

/* eslint-disable no-underscore-dangle */
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"
import Cookies from "js-cookie"
import { getPublicApiUrl, getPublicAuthUrl } from "@/lib/runtime-urls"

interface Config extends AxiosRequestConfig {}

const BASE = getPublicApiUrl()

const getAccessToken = () => {
  const cookieToken = Cookies.get("access_token") || Cookies.get("accessToken")
  if (cookieToken) return cookieToken

  if (typeof window === "undefined") return undefined

  return (
    window.localStorage.getItem("access_token") ||
    window.localStorage.getItem("token") ||
    undefined
  )
}

axios.defaults.baseURL = BASE

const axiosInstance = axios.create({
  baseURL: BASE,
  timeout: 30000,
})

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const access_token = getAccessToken()
    if (access_token) {
      config.headers.Authorization = `Bearer ${access_token}`
    } else if (config.headers?.Authorization) {
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
  resolve: (token: string) => void
  reject: (err: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) prom.resolve(token)
    else prom.reject(error)
  })
  failedQueue = []
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

    const refreshToken = Cookies.get("refresh_token")
    if (!refreshToken) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
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
      const AUTH_BASE = getPublicAuthUrl()
      const res = await axiosInstance.post(`${AUTH_BASE}/auth/refresh`, {
        refresh_token: refreshToken,
      })

      const newAccessToken = res?.data?.access_token
      const newRefreshToken = res?.data?.refresh_token

      if (newAccessToken) {
        Cookies.set("access_token", newAccessToken, { path: "/" })
        if (newRefreshToken) {
          Cookies.set("refresh_token", newRefreshToken, { path: "/" })
        }
        if (res?.data?.sessionId) {
          Cookies.set("session_id", res.data.sessionId, { path: "/" })
        }
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        processQueue(null, newAccessToken)
        return axiosInstance(originalRequest)
      }

      processQueue(error, null)
      return Promise.reject(error)
    } catch (refreshError) {
      processQueue(refreshError, null)
      // Refresh failed — clear tokens, user will need to re-login
      Cookies.remove("access_token", { path: "/" })
      Cookies.remove("refresh_token", { path: "/" })
      Cookies.remove("session_id", { path: "/" })
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
