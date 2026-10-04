import { Controller, NotFoundException } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { UserService } from './user.service';

@Controller()
export class UserInternalRpcController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('user.profile.get')
  async getProfile(@Payload() data: { id: string }) {
    try {
      const user = await this.userService.getUserWithRelations(data.id);
      return {
        id: user.id,
        firstName: (user as any).firstName ?? null,
        lastName: (user as any).lastName ?? null,
        username: (user as any).username ?? null,
        avatarUrl: (user as any).avatarUrl ?? null,
        location: (user as any).location ?? null,
        rate: (user as any).rate ?? null,
      };
    } catch (err) {
      throw new RpcException(
        err instanceof NotFoundException
          ? { statusCode: 404, message: err.message }
          : {
              statusCode: 500,
              message: err instanceof Error ? err.message : 'Unexpected error',
            },
      );
    }
  }
}
