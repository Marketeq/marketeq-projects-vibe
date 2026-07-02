import { getPublicListingsUrl } from "@/lib/runtime-urls"
import AxiosRequest from ".."

const getJobListingBaseUrl = () => {
  return getPublicListingsUrl()
}

const jobListingUrl = (path: string) => `${getJobListingBaseUrl()}${path}`

export type JobListingContractType = "new" | "existing"
export type JobListingScopeKnowledge =
  | "has_scope"
  | "no_scope"
  | "no_scope_selected"
export type JobListingWorkType = "project" | "service"
export type JobListingHiringType = "team" | "individual"
export type JobListingStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "needs_update"
  | "closed"
export type JobListingFrequency =
  | "per_day"
  | "per_week"
  | "per_month"
  | "per_quarter"
  | "per_year"
export type JobListingPhaseType = "setup" | "recurring" | "ongoing"
export type JobListingWorkSchedule = "full_time" | "part_time" | "custom"

export const JobListingAPI = {
  Create: (data: {
    contractType: JobListingContractType
    scopeKnowledge?: JobListingScopeKnowledge
    workType?: JobListingWorkType
    hiringType?: JobListingHiringType
    contractId?: string
  }) => AxiosRequest.post(jobListingUrl("/v1/job-listings"), data),

  Get: (id: string) =>
    AxiosRequest.get(jobListingUrl(`/v1/job-listings/${id}`)),

  List: (params?: {
    status?: JobListingStatus
    type?: JobListingWorkType | JobListingHiringType
    contractType?: JobListingContractType
    page?: number
    limit?: number
  }) => AxiosRequest.get(jobListingUrl("/v1/job-listings"), { params }),

  Update: (
    id: string,
    data: {
      scopeKnowledge?: JobListingScopeKnowledge
      workType?: JobListingWorkType
      hiringType?: JobListingHiringType
      description?: string
      deliverables?: string
      successCriteria?: string
      headcount?: number
      budgetAmount?: number
      budgetDisplayCurrency?: string
      budgetFrequency?: JobListingFrequency
      durationMonths?: number
      isOngoing?: boolean
      briefR2Key?: string
      briefFilename?: string
      briefSizeBytes?: number
      ndaEnabled?: boolean
      ndaScopeVisibility?: string
      lastCompletedStep?: number
    }
  ) => AxiosRequest.patch(jobListingUrl(`/v1/job-listings/${id}`), data),

  UpdateBasicInformation: (
    id: string,
    data: {
      title?: string
      jobType?: string
      industries?: string[]
      languages?: string[]
    }
  ) =>
    AxiosRequest.patch(
      jobListingUrl(`/v1/job-listings/${id}/basic-information`),
      data
    ),

  SmartAssistant: (
    id: string,
    data:
      | {
          mode: "scope"
          command: string
          currentScope: Record<string, unknown>
          workType: JobListingWorkType
        }
      | {
          mode: "field"
          command: string
          field: "title" | "overview" | "benefits" | "responsibilities"
          currentValue: string
          context?: string
        }
  ) =>
    AxiosRequest.post(
      jobListingUrl(`/v1/job-listings/${id}/smart-assistant`),
      data
    ),

  GenerateTools: (
    id: string,
    data: {
      workType?: JobListingWorkType
      description?: string
      deliverables?: string
      roles?: string[]
    }
  ) =>
    AxiosRequest.post(jobListingUrl(`/v1/job-listings/${id}/generate-tools`), data),

  GenerateScope: (
    id: string,
    data: {
      workType?: JobListingWorkType
      description?: string
      deliverables?: string
      successCriteria?: string
      tools?: string[]
      roles?: string[]
      budgetUsdCents?: number
      durationMonths?: number
      hiringType?: JobListingHiringType
      minimalInput?: boolean
    }
  ) =>
    AxiosRequest.post(jobListingUrl(`/v1/job-listings/${id}/generate-scope`), data),

  GenerateRoleDescriptions: (
    id: string,
    data: {
      projectTitle?: string
      workType?: JobListingWorkType
      description?: string
      roles?: Array<{
        roleTitle: string
        experienceLevel?: string
        location?: string
        workSchedule?: string
        tasks?: string[]
      }>
    }
  ) =>
    AxiosRequest.post(
      jobListingUrl(`/v1/job-listings/${id}/generate-role-descriptions`),
      data
    ),

  GetRoleDescriptions: (id: string) =>
    AxiosRequest.get(jobListingUrl(`/v1/job-listings/${id}/role-descriptions`)),

  SaveRoleDescription: (
    id: string,
    roleTitle: string,
    data: {
      overview?: string
      benefits?: string
      responsibilities?: string
      skills?: string[]
    }
  ) =>
    AxiosRequest.patch(
      jobListingUrl(
        `/v1/job-listings/${id}/role-descriptions/${encodeURIComponent(roleTitle)}`
      ),
      data
    ),

  Publish: (id: string) =>
    AxiosRequest.post(jobListingUrl(`/v1/job-listings/${id}/publish`), {}),

  RevertToDraft: (id: string) =>
    AxiosRequest.post(
      jobListingUrl(`/v1/job-listings/${id}/revert-to-draft`),
      {}
    ),

  Delete: (id: string) =>
    AxiosRequest.del(jobListingUrl(`/v1/job-listings/${id}`)),

  DuplicateRole: (
    id: string,
    data: {
      roleRowId: string
    }
  ) =>
    AxiosRequest.post(
      jobListingUrl(`/v1/job-listings/${id}/duplicate-role`),
      data
    ),

  SendInvites: (
    id: string,
    data: {
      talentUserIds: string[]
      roleRowId?: string
    }
  ) => AxiosRequest.post(jobListingUrl(`/v1/job-listings/${id}/invite`), data),

  PresignBriefUpload: (
    id: string,
    data: {
      filename: string
      contentType: string
      sizeBytes: number
    }
  ) =>
    AxiosRequest.post(
      jobListingUrl(`/v1/job-listings/${id}/brief-upload/presign`),
      data
    ),

  SaveBriefMetadata: (
    id: string,
    data: {
      briefR2Key: string
      briefFilename: string
      briefSizeBytes: number
    }
  ) => AxiosRequest.patch(jobListingUrl(`/v1/job-listings/${id}`), data),

  CreatePhase: (
    id: string,
    data: {
      phaseName: string
      phaseType: JobListingPhaseType
      durationDays?: number
      recurrenceSchedule?: string
      recurrenceCount?: number
    }
  ) => AxiosRequest.post(jobListingUrl(`/v1/job-listings/${id}/phases`), data),

  UpdatePhase: (
    id: string,
    phaseId: string,
    data: {
      phaseName?: string
      durationDays?: number
      recurrenceSchedule?: string
      recurrenceCount?: number
    }
  ) =>
    AxiosRequest.patch(
      jobListingUrl(`/v1/job-listings/${id}/phases/${phaseId}`),
      data
    ),

  DeletePhase: (id: string, phaseId: string) =>
    AxiosRequest.del(jobListingUrl(`/v1/job-listings/${id}/phases/${phaseId}`)),

  ReorderPhases: (id: string, orderedPhaseIds: string[]) =>
    AxiosRequest.patch(jobListingUrl(`/v1/job-listings/${id}/phases/reorder`), {
      orderedPhaseIds,
    }),

  CreateTask: (
    id: string,
    phaseId: string,
    data: {
      taskName: string
      roleTitle: string
      location?: string
      experienceLevel?: string
      workSchedule: JobListingWorkSchedule
      customHours?: number
      customFrequency?: string
      estimatedHours: number
    }
  ) =>
    AxiosRequest.post(
      jobListingUrl(`/v1/job-listings/${id}/phases/${phaseId}/tasks`),
      data
    ),

  UpdateTask: (
    id: string,
    phaseId: string,
    taskId: string,
    data: {
      taskName?: string
      roleTitle?: string
      location?: string
      experienceLevel?: string
      workSchedule?: JobListingWorkSchedule
      customHours?: number
      customFrequency?: string
      estimatedHours?: number
    }
  ) =>
    AxiosRequest.patch(
      jobListingUrl(
        `/v1/job-listings/${id}/phases/${phaseId}/tasks/${taskId}`
      ),
      data
    ),

  DeleteTask: (id: string, phaseId: string, taskId: string) =>
    AxiosRequest.del(
      jobListingUrl(
        `/v1/job-listings/${id}/phases/${phaseId}/tasks/${taskId}`
      )
    ),

  CreateRoleRow: (
    id: string,
    data: {
      role: string
      positionOrder?: number
      assignedUserId?: string
    }
  ) => AxiosRequest.post(jobListingUrl(`/v1/job-listings/${id}/roles`), data),
}
