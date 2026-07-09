// apps/offer-service/src/offers/enums/contract-type.enum.ts
// OS-08 + OS-11: Contract types and grouping arrays for conditional DTO validation.
export enum ContractType {
  PROJECT  = 'PROJECT',
  SERVICE  = 'SERVICE',
  TEAM     = 'TEAM',
  CONTRACT = 'CONTRACT',
}

/** Contract types that require a contractTitle in the request body. */
export const CONTRACT_TYPES_REQUIRING_TITLE: ContractType[] = [
  ContractType.TEAM,
  ContractType.CONTRACT,
  ContractType.SERVICE,
];

/** Contract types where start date is suggested by listings-service scope. */
export const SCOPED_CONTRACT_TYPES: ContractType[] = [
  ContractType.PROJECT,
  ContractType.SERVICE,
];