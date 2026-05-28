import { CreateTalentType } from "@/types/talent"
import { getPublicUserUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const USER_BASE = getPublicUserUrl()
export const TalentAPI = {
  CreateTalent: (data: CreateTalentType | FormData) => {
    return AxiosRequest.post(`${USER_BASE}/talent`, data)
  },
}
