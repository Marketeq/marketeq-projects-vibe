import {
  type StatusAlert,
  type StatusAlertTransport,
  dismissStatusAlert,
  listStatusAlerts,
} from "@/src/lib/api/status-alerts"
import AxiosRequest from ".."

// The shared Axios client: cookie auth, CSRF on writes and the 401 refresh live there.
const transport: StatusAlertTransport = {
  get: (path) => AxiosRequest.get(path),
  post: (path, body) => AxiosRequest.post(path, body ?? null),
}

export const StatusAlertsAPI = {
  list: (): Promise<StatusAlert[]> => listStatusAlerts(transport),
  dismiss: (id: string): Promise<void> => dismissStatusAlert(transport, id),
}
