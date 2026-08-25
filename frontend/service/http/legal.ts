import { getPublicLegalUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const getLegalBaseUrl = () => {
  const legalBase = getPublicLegalUrl()

  if (
    process.env.NODE_ENV === "development" &&
    /^http:\/\/localhost:4000\/?$/.test(legalBase)
  ) {
    return "http://localhost:3032"
  }

  return legalBase
}

const legalUrl = (path: string) => `${getLegalBaseUrl()}${path}`

export const LegalAPI = {
  GetNda: (id: string) => AxiosRequest.get(legalUrl(`/v1/nda/${id}`)),

  GetNdaPreview: (id: string) =>
    AxiosRequest.get(legalUrl(`/v1/nda/${id}/preview`)),
}
