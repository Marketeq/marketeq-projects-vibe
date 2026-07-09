import { getPublicHomepageUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const HOMEPAGE_BASE = getPublicHomepageUrl() || ""

export const HomepageAPI = {
  /** Fetch the fully assembled homepage payload (public, no auth required). */
  getHomepage: () => {
    return AxiosRequest.get(`${HOMEPAGE_BASE}/homepage`)
  },
}
