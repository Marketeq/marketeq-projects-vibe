// Response item for GET /contracts?addableJobsOnly=true — not a
// class-validator DTO, there is no request body to validate. phase is the
// group's own column (null when unset). memberAvatars has one entry per member
// (length equals memberCount): the avatar URL from user-service as stored
// there, or null for a member without one.
export class AddableContractDto {
  id: string;
  name: string;
  // The group's own type ('project' | 'service' | 'team' | 'job'); lets the
  // selector tag service contracts.
  type: string;
  status: string;
  phase: string | null;
  memberAvatars: Array<string | null>;
  // Each member's individual contract id, same order and length as memberAvatars.
  memberContractIds: string[];
  memberCount: number;
  createdAt: string;
}
