import AxiosRequest from ".."

export interface IpLocationResolution {
  ip: string
  country: string | null
  currency: string | null
  timezone: string | null
  coordinates: [number, number] | null
}

export const LocationAPI = {
  resolveIp: () =>
    AxiosRequest.get("/location/resolve-ip") as Promise<{
      data: IpLocationResolution
    }>,
}
