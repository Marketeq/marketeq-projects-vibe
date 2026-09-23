import { getPublicHomepageUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const HOMEPAGE_BASE = getPublicHomepageUrl() || ""

export const HomepageAPI = {
  /** Fetch the fully assembled homepage payload (public, no auth required). */
  getHomepage: () => {
    const fresh = typeof window !== "undefined" && sessionStorage.getItem("hp_fresh")
    if (fresh) sessionStorage.removeItem("hp_fresh")
    const qs = fresh ? "?fresh=1" : ""
    return AxiosRequest.get(`${HOMEPAGE_BASE}/homepage${qs}`)
  },
}
