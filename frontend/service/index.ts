/* eslint-disable no-param-reassign */

/* eslint-disable no-underscore-dangle */
import axios, {
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios"
import Cookies from "js-cookie"

interface Config extends AxiosRequestConfig {}

const BASE = process.env.NEXT_PUBLIC_API_URL

axios.defaults.baseURL = BASE

const axiosInstance = axios.create({
  baseURL: BASE,
})

axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const access_token = Cookies.get("access_token")
    config.headers.Authorization = access_token ? `Bearer ${access_token}` : ""

    return Promise.resolve(config)
  },
  (err) => {
    return Promise.reject(err)
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
