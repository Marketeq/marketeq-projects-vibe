import { CreateClientType } from "@/types/client"
import AxiosRequest from ".."

export const ClientAPI = {
  CreateClient: (data: CreateClientType) => {
    return AxiosRequest.post("/client", data)
  },
}
