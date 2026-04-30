import { CreateTalentType } from "@/types/talent"
import AxiosRequest from ".."
import Cookies from "js-cookie"
import { getPublicUserUrl } from "@/lib/runtime-urls"

const USER_BASE = getPublicUserUrl()
export const TalentAPI = {
  CreateTalent: (data: CreateTalentType | FormData) => {
    const token = Cookies.get("access_token")
    return AxiosRequest.post(`${USER_BASE}/talent`, data, {
  headers: { Authorization: `Bearer ${token}` },
})
  },
}
