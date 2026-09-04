import type { AxiosResponse } from "axios"
import { getPublicUserUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const USER_BASE = getPublicUserUrl()
const BASE = `${USER_BASE}/user/allowed-ips`

export interface AllowedIp {
  id: string
  /** A single address, or a range as "from – to", stored exactly as entered. */
  address: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface AllowedIpInput {
  address: string
  description?: string
}

export interface BulkCreateResult {
  created: AllowedIp[]
  /** Addresses already on the list; reported rather than treated as failures. */
  skipped: string[]
}

// The shared wrapper types its generic as the *request body* and always
// resolves AxiosResponse<any>, so response shapes are annotated on the return
// rather than passed as a type argument.
const AllowedIpsAPI = {
  list: (): Promise<AxiosResponse<AllowedIp[]>> => AxiosRequest.get(BASE),

  create: (input: AllowedIpInput): Promise<AxiosResponse<AllowedIp>> =>
    AxiosRequest.post(BASE, input),

  createMany: (
    entries: AllowedIpInput[]
  ): Promise<AxiosResponse<BulkCreateResult>> =>
    AxiosRequest.post(`${BASE}/bulk`, { entries }),

  update: (
    id: string,
    input: Partial<AllowedIpInput>
  ): Promise<AxiosResponse<AllowedIp>> =>
    AxiosRequest.patch(`${BASE}/${id}`, input),

  remove: (id: string): Promise<AxiosResponse<void>> =>
    AxiosRequest.del(`${BASE}/${id}`),
}

export default AllowedIpsAPI
