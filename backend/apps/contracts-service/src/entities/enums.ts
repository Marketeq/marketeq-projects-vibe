/**
 * enums.ts
 * Shared enums used by contracts service entities.
 */

export enum ContractStatus {
  PENDING = 'pending', // Created but not active (waiting for deposit)
  ACTIVE = 'active', // Active, billing and time tracking ongoing
  ENDED = 'ended', // Ended manually (client ended one individual contract)
  CANCELED = 'canceled', // Never activated (deposit failed or expired)
  PAUSED = 'paused', // Temporarily on hold; still accepts new members
  DISPUTED = 'disputed', // Under dispute; visible but not addable
  EXPIRED = 'expired', // Ran past its term; visible but not addable
  CLOSED = 'closed', // Wrapped up for good; visible but not addable
}

export enum GroupType {
  PROJECT = 'project',
  SERVICE = 'service',
  TEAM = 'team',
  JOB = 'job',
}
