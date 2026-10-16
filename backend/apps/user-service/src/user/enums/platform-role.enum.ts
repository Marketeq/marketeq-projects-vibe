/**
 * Security roles — what an account is allowed to DO.
 *
 * Deliberately separate from `UserRole` (ADMIN/TALENT/CLIENT), which is a
 * profile label describing what an account *is*. `UserRole.ADMIN` exists but
 * has never granted anything on its own.
 *
 * Stored in `users.platform_role`, absent (null) for ordinary users, and
 * writable only by a deliberate admin path — never by a DTO.
 *
 * ── The catalogue is the source of truth ──
 * The role list, and what each role can do, live in
 * `src/guards/platform-roles.catalog.ts`. This file re-exports from it and
 * keeps a named enum for the roles that existing code refers to by name.
 * Do not add a role here — add it to the catalogue, where it also gets its
 * capabilities, and it becomes assignable and enforceable everywhere at once.
 */
export {
  PLATFORM_ROLES,
  isPlatformRole,
  capabilitiesOf,
  getRoleDefinition,
  PLATFORM_ROLE_CATALOGUE,
} from '../../guards/platform-roles.catalog';

/**
 * Named constants for the roles referred to by name in code. This is a
 * convenience, not the list — the catalogue is the list, and it currently
 * also carries `developer`, `qa` and `product-manager`, which no code names
 * directly because routes should ask for a capability instead.
 */
export enum PlatformRole {
  /** Full platform administration — the owner. */
  ADMIN = 'admin',
  /** Reviews and approves money movement; cannot move funds directly. */
  FINANCE = 'finance',
  /** Reads user records to answer tickets; no money, no role changes. */
  SUPPORT = 'support',
}
