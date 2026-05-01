import AxiosRequest from ".."
import { getPublicHomepageUrl } from "@/lib/runtime-urls"

const HOMEPAGE_BASE = getPublicHomepageUrl() || ""

export const HomepageAPI = {
  /** Fetch the fully assembled homepage payload (public, no auth required). */
  getHomepage: () => {
    return AxiosRequest.get(`${HOMEPAGE_BASE}/homepage`)
  },
}
