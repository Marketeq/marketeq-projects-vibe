import Cookies from "js-cookie"
import { CreateTalentType } from "@/types/talent"
import AxiosRequest from ".."

const USER_BASE = process.env.NEXT_PUBLIC_USER_URL ?? ""
export const TalentAPI = {
  CreateTalent: (data: CreateTalentType | FormData) => {
    const token = Cookies.get("access_token")
    return AxiosRequest.post(`${USER_BASE}/talent`, data, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}
