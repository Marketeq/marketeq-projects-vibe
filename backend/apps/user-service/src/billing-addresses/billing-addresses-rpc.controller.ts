import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { BillingAddressesService } from './billing-addresses.service';

@Controller()
export class BillingAddressesRpcController {
  constructor(private readonly service: BillingAddressesService) {}

  @MessagePattern('user.billing-address.get')
  async get(@Payload() data: { userId: string; id: string }) {
    const address = await this.service.getOne(data.userId, data.id);
    if (!address) {
      throw new RpcException({
        statusCode: 404,
        message: 'Billing address not found',
      });
    }
    return address;
  }
}
