import AxiosRequest from ".."
import { getPublicApiUrl, getPublicAuthUrl } from "@/lib/runtime-urls"

const API_BASE =
  getPublicApiUrl() ||
  getPublicAuthUrl() ||
  ""

export const HomepageAPI = {
  /** Fetch the fully assembled homepage payload (public, no auth required). */
  getHomepage: () => {
    return AxiosRequest.get(`${API_BASE}/homepage`)
  },
}
