import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BlockedUsersService } from './blocked-users.service';

interface GetPairStatusPayload {
  userA: string;
  userB: string;
}

interface ListBlockedPayload {
  userId: string;
}

@Controller()
export class BlocksRpcController {
  private readonly logger = new Logger(BlocksRpcController.name);

  constructor(private readonly blockedUsersService: BlockedUsersService) {}

  @MessagePattern('user.blocks.get-pair-status')
  async getPairStatus(@Payload() payload: GetPairStatusPayload) {
    if (!payload?.userA || !payload?.userB) {
      this.logger.warn(
        'user.blocks.get-pair-status received invalid payload',
        payload,
      );
      return { aBlockedB: false, bBlockedA: false };
    }
    return this.blockedUsersService.getPairStatus(payload.userA, payload.userB);
  }

  @MessagePattern('user.blocks.list-blocked')
  async listBlocked(@Payload() payload: ListBlockedPayload) {
    if (!payload?.userId) {
      this.logger.warn(
        'user.blocks.list-blocked received invalid payload',
        payload,
      );
      return { blockedIds: [] };
    }
    const blockedIds = await this.blockedUsersService.listBlockedIds(
      payload.userId,
    );
    return { blockedIds };
  }
}
