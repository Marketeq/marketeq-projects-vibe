import { CreateClientType } from "@/types/client"
import AxiosRequest from ".."

const USER_BASE = process.env.NEXT_PUBLIC_USER_URL ?? "";
export const ClientAPI = {
  CreateClient: (data: CreateClientType) => {
    return AxiosRequest.post(`${USER_BASE}/client`, data);
  },
}
