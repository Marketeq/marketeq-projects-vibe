import AxiosRequest from ".."

export interface ReportAttachmentMeta {
  name: string
  size: number
  type: string
}

export interface ReportProjectDto {
  reason: string
  description?: string
  attachments?: ReportAttachmentMeta[]
}

interface ReportsAPIType {
  reportProject: (
    projectId: string,
    dto: ReportProjectDto
  ) => ReturnType<typeof AxiosRequest.post>
}

export const ReportsAPI: ReportsAPIType = {
  reportProject: (projectId, dto) =>
    AxiosRequest.post(`/v1/projects/${projectId}/report`, dto),
}
