import { ForbiddenException, Injectable } from '@nestjs/common';
import { ContractPartiesClient } from './contract-parties.client';

export interface Actor {
  userId: string;
  role?: string;
}

/** The caller as set by JwtAuthGuard. `role` only exists on tokens that carry one. */
export function actorOf(req: { user: { sub: string; role?: string } }): Actor {
  return { userId: req.user.sub, role: req.user.role };
}

/**
 * Access rules for time-tracking data, decided from the contract rather than
 * from a platform role (real access tokens carry no role):
 *  - the talent who owns the record can view and manage it,
 *  - the client on the record's contract can view and moderate it,
 *  - a platform admin can do both.
 */
@Injectable()
export class ContractAccessService {
  constructor(private readonly parties: ContractPartiesClient) {}

  isAdmin(actor: Actor): boolean {
    return actor.role === 'admin';
  }

  async isClientOf(userId: string, contractId: string | null | undefined): Promise<boolean> {
    if (!contractId) return false;
    const p = (await this.parties.getParties([contractId])).get(contractId);
    return !!p && p.clientId === userId;
  }

  async isTalentOf(userId: string, contractId: string | null | undefined): Promise<boolean> {
    if (!contractId) return false;
    const p = (await this.parties.getParties([contractId])).get(contractId);
    return !!p && p.talentId === userId;
  }

  async isPartyOf(userId: string, contractId: string | null | undefined): Promise<boolean> {
    if (!contractId) return false;
    const p = (await this.parties.getParties([contractId])).get(contractId);
    return !!p && (p.clientId === userId || p.talentId === userId);
  }

  clientContractIds(userId: string): Promise<string[]> {
    return this.parties.contractIdsForClient(userId);
  }

  /** Owner (talent), the contract's client, or an admin. */
  async assertCanView(actor: Actor, record: { userId: string; contractId: string | null }): Promise<void> {
    if (this.isAdmin(actor) || record.userId === actor.userId) return;
    if (await this.isClientOf(actor.userId, record.contractId)) return;
    throw new ForbiddenException('Access denied');
  }

  /** The contract's client or an admin. */
  async assertClientOf(actor: Actor, contractId: string | null | undefined): Promise<void> {
    if (this.isAdmin(actor)) return;
    if (await this.isClientOf(actor.userId, contractId)) return;
    throw new ForbiddenException('Only the client on this contract can do this');
  }

  /** Either side of the contract, or an admin. */
  async assertPartyOf(actor: Actor, contractId: string | null | undefined): Promise<void> {
    if (this.isAdmin(actor)) return;
    if (await this.isPartyOf(actor.userId, contractId)) return;
    throw new ForbiddenException('Access denied');
  }
}
