import { getPublicLegalUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

// Always go through the API gateway: it turns the access_token cookie into the
// x-user-id header legal-service authenticates on. Calling legal-service
// directly (e.g. localhost:3032) has no such header, so JWT-protected routes 401.
const getLegalBaseUrl = () => getPublicLegalUrl()

const legalUrl = (path: string) => `${getLegalBaseUrl()}${path}`

export const LegalAPI = {
  GetNda: (id: string) => AxiosRequest.get(legalUrl(`/v1/nda/${id}`)),

  GetNdaPreview: (id: string) =>
    AxiosRequest.get(legalUrl(`/v1/nda/${id}/preview`)),
}
