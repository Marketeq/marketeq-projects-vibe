import { CreateClientType } from "@/types/client"
import AxiosRequest from ".."
import Cookies from "js-cookie"
import { getPublicUserUrl } from "@/lib/runtime-urls"

const USER_BASE = getPublicUserUrl()

export const ClientAPI = {
  CreateClient: (data: CreateClientType) => {
    return AxiosRequest.post(`${USER_BASE}/client`, data)
  },
  UploadAvatar: (file: File) => {
    const token = Cookies.get("access_token")
    const form = new FormData()
    form.append("file", file)
    return AxiosRequest.post<FormData>(
      `${USER_BASE}/user/me/avatar`,
      form,
      {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
    )
  },
}
