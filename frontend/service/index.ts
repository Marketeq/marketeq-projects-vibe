/* eslint-disable no-param-reassign */

/* eslint-disable no-underscore-dangle */
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"
import Cookies from "js-cookie"

interface Config extends AxiosRequestConfig {}

const BASE_ENV = process.env.NEXT_PUBLIC_API_URL ?? ""
const BASE =
  BASE_ENV === "http://localhost:3002" || BASE_ENV === "http://127.0.0.1:3002"
    ? "/__api"
    : BASE_ENV || "/__api"

axios.defaults.baseURL = BASE

const axiosInstance = axios.create({
  baseURL: BASE,
})

const resolveConfig = (url: string, config: Config = {}): Config => {
  if (url.startsWith("/__")) {
    return {
      ...config,
      baseURL: "",
    }
  }
  return config
}

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const access_token = Cookies.get("access_token")
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

const get = (url: string, config: Config = {}): Promise<AxiosResponse> =>
  axiosInstance.get(url, resolveConfig(url, config))

const post = <T>(
  url: string,
  data: T,
  config: Config = {}
): Promise<AxiosResponse> =>
  axiosInstance.post(url, data, resolveConfig(url, config))

const put = <T>(
  url: string,
  data: T,
  config: Config = {}
): Promise<AxiosResponse> =>
  axiosInstance.put(url, data, resolveConfig(url, config))

const patch = <T>(
  url: string,
  data: T,
  config: Config = {}
): Promise<AxiosResponse> =>
  axiosInstance.patch(url, data, resolveConfig(url, config))

const del = (url: string, config: Config = {}): Promise<AxiosResponse> =>
  axiosInstance.delete(url, resolveConfig(url, config))

const AxiosRequest = {
  get,
  post,
  put,
  patch,
  del,
}

export default AxiosRequest
