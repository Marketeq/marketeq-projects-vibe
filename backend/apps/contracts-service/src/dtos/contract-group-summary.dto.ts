// Response shape for GET /contract-groups/mine — not a class-validator DTO,
// there is no request body/query to validate here, identity comes from
// req.user. Project name and phase are intentionally absent: T2-0 found no
// source for them without cross-service enrichment (T2-2).
export class ContractGroupMemberSummaryDto {
  contractId: string;
  talentId: string;
  title: string;
  status: string;
}

export class ContractGroupSummaryDto {
  id: string;
  members: ContractGroupMemberSummaryDto[];
  projectId: string | null;
  serviceId: string | null;
  teamId: string | null;
  jobId: string | null;
}
