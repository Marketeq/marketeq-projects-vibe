/**
 * Response shapes for GET /contracts/talent-network.
 *
 * Not class-validator DTOs: there is no request body or query to validate,
 * the client identity comes from req.user.
 *
 * These mirror "Talent Network & My Team — Final Logic" (Aug 2026):
 * Talent Network is derived from the contracts relationship, so there is no
 * Talent Network table. Every talent the client has a non-canceled contract
 * with lands in exactly one of three buckets.
 */

/**
 * active:  talent on an active contract; part of the current team.
 * pending: talent invited to a new contract who has not yet accepted;
 *          visible in the tab, never a team member.
 * past:    talent whose contract has ended; kept for history and re-hiring,
 *          not part of the current team.
 */
export type TalentNetworkStatus = 'active' | 'pending' | 'past';

/** The contract that decided which bucket a talent landed in. */
export class TalentNetworkContractDto {
  id: string;
  groupId: string;
  title: string;
  status: string;
  rate: number;
  schedule: string;
  duration: string;
  startAtISO: string | null;
  endAtISO: string | null;
  projectId: string | null;
  serviceId: string | null;
  teamId: string | null;
  jobId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class TalentNetworkEntryDto {
  talentId: string;
  status: TalentNetworkStatus;
  /**
   * Whether this person counts toward the My Team number. True only for
   * `active`. Pending invitations and past hires are visible in the tab
   * but never counted.
   */
  countsTowardTeam: boolean;
  /** The deciding contract (see the precedence rule in TalentNetworkService). */
  contract: TalentNetworkContractDto;
  /** Every non-canceled contract this client has with this talent. */
  contractIds: string[];
  /** Earliest start across those contracts; null when none has started. */
  firstHiredAtISO: string | null;
  /** Latest end across those contracts; null while nothing has ended. */
  lastEndedAtISO: string | null;
}

export class TalentNetworkCountsDto {
  /** Active Talent, the Talent Network half of the My Team count. */
  active: number;
  /** Pending Talent Invitations, shown in the tab, not counted. */
  pending: number;
  /** Past Talent / ended contract, shown in the tab, not counted. */
  past: number;
  /** Everyone visible in the Talent Network tab. */
  total: number;
}

export class TalentNetworkDto {
  clientId: string;
  active: TalentNetworkEntryDto[];
  pending: TalentNetworkEntryDto[];
  past: TalentNetworkEntryDto[];
  counts: TalentNetworkCountsDto;
}
