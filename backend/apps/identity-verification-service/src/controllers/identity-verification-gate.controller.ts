import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { SkipThrottle } from '@nestjs/throttler';
import { IdentityVerificationService } from '../services/identity-verification.service';
import {
  ACCOUNT_GATE_CHECK_BATCH_PATTERN,
  ACCOUNT_GATE_CHECK_PATTERN,
  AccountGateBatchReply,
  AccountGateBatchRequest,
  AccountGateCheckRequest,
  AccountGateDecision,
  MAX_GATE_CHECK_BATCH,
} from '../common/gate/account-gate-decision';

// RabbitMQ request/reply surface for the synchronous gate check. It is
// reached only over the broker (never the API Gateway) and returns the same
// canonical decision the internal status endpoint's gateOpen is built from.
// MessagePattern rather than EventPattern because the caller blocks on the
// answer (same reason as category-service's category.match).
//
// SkipThrottle: the app-wide ThrottlerGuard is an APP_GUARD, which also wraps
// microservice handlers on a hybrid app; it has no HTTP request to key on
// here, and an internal caller must not be rate-limited out of its own gate.
@Controller()
@SkipThrottle()
export class IdentityVerificationGateController {
  constructor(private readonly service: IdentityVerificationService) {}

  @MessagePattern(ACCOUNT_GATE_CHECK_PATTERN)
  async check(@Payload() payload: Partial<AccountGateCheckRequest>): Promise<AccountGateDecision> {
    const userId = payload?.userId;
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      // Never guess an answer for a request that names no account. The
      // caller treats any error reply as "unavailable" and fails closed.
      throw new RpcException({ code: 'INVALID_GATE_CHECK_REQUEST', message: 'userId is required.' });
    }
    return this.service.getAccountGateDecision(userId);
  }

  // Same decision for many accounts in one round trip (G5 roster filtering).
  // A request that does not name 1..MAX distinct-string accounts is rejected
  // outright rather than answered for a subset the caller did not ask for.
  @MessagePattern(ACCOUNT_GATE_CHECK_BATCH_PATTERN)
  async checkBatch(@Payload() payload: Partial<AccountGateBatchRequest>): Promise<AccountGateBatchReply> {
    const userIds = payload?.userIds;
    const valid =
      Array.isArray(userIds) &&
      userIds.length > 0 &&
      userIds.length <= MAX_GATE_CHECK_BATCH &&
      userIds.every((id) => typeof id === 'string' && id.trim().length > 0);
    if (!valid) {
      throw new RpcException({
        code: 'INVALID_GATE_CHECK_REQUEST',
        message: `userIds must be 1-${MAX_GATE_CHECK_BATCH} non-empty strings.`,
      });
    }
    return { decisions: await this.service.getAccountGateDecisions(userIds as string[]) };
  }
}
