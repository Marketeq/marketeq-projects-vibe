import { ForbiddenException, Logger } from '@nestjs/common'

const logger = new Logger('WalletOwnership')

/**
 * Every wallet endpoint used to trust a user id supplied by the caller, so a
 * logged-in user could name somebody else's account. These two helpers make
 * the verified token the only source of that id.
 *
 * They are plain functions rather than a guard so the rule can be unit
 * tested on its own, and so a mismatch can be logged with the endpoint that
 * saw it — a mismatch is either a client bug or an attempt, and both are
 * worth seeing in the logs.
 */

export interface RequestUser {
  userId?: string
  sub?: string
}

const tokenUserId = (user: RequestUser | undefined): string => {
  const id = user?.userId ?? user?.sub
  if (!id) {
    // The guard runs first, so this means the guard was removed or bypassed.
    throw new ForbiddenException('No authenticated user on the request')
  }
  return id
}

/**
 * For bodies that carry a userId. Returns the caller's own id, ignoring
 * whatever was supplied, so a wrong value cannot act on another account and
 * a legitimate caller is never rejected for sending its own id.
 */
export function ownerFromToken(
  user: RequestUser | undefined,
  suppliedUserId: string | undefined,
  endpoint: string,
): string {
  const callerId = tokenUserId(user)
  if (suppliedUserId && suppliedUserId !== callerId) {
    logger.warn(
      `Ignored a user id that does not match the token: endpoint=${endpoint} caller=${callerId} supplied=${suppliedUserId}`,
    )
  }
  return callerId
}

/**
 * For a userId in the path, where silently substituting the caller's id would
 * change what the URL means. A mismatch is refused.
 */
export function assertOwner(
  user: RequestUser | undefined,
  pathUserId: string,
  endpoint: string,
): string {
  const callerId = tokenUserId(user)
  if (pathUserId !== callerId) {
    logger.warn(
      `Blocked access to another user's wallet: endpoint=${endpoint} caller=${callerId} requested=${pathUserId}`,
    )
    throw new ForbiddenException('You can only access your own wallet')
  }
  return callerId
}
