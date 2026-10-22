import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { UserService } from '../user/user.service';
import { BillingAddressesService } from './billing-addresses.service';
import { CreateBillingAddressDto } from './billing-address.dto';

@ApiTags('User')
@Controller('user/billing-addresses')
export class BillingAddressesController {
  constructor(
    private readonly billingAddresses: BillingAddressesService,
    private readonly userService: UserService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List the signed-in user billing addresses, oldest first',
  })
  async list(@CurrentUser() user: JwtUser) {
    const resolved = await this.userService.getUserByClaims(user);
    return this.billingAddresses.list(resolved.id);
  }

  @Post()
  @ApiOperation({ summary: 'Save a billing address for the signed-in user' })
  async create(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateBillingAddressDto,
  ) {
    const resolved = await this.userService.getUserByClaims(user);
    return this.billingAddresses.create(resolved.id, dto);
  }
}
