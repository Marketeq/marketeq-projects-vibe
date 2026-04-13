import AxiosRequest from ".."

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_AUTH_URL ||
  ""

export const HomepageAPI = {
  /** Fetch the fully assembled homepage payload (public, no auth required). */
  getHomepage: () => {
    return AxiosRequest.get(`${API_BASE}/homepage`)
  },
}
