import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';

import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { JwtUser } from '../auth/types/jwt-user.type';

@ApiTags('Client')
@ApiBearerAuth()
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @ApiOperation({ summary: 'Create client onboarding profile' })
  @Post()
  createClient(@CurrentUser() user: JwtUser, @Body() dto: CreateClientDto) {
    const userId = user.sub ?? user.id;
    return this.clientService.createClient(
      { id: userId, email: user.email },
      dto,
    );
  }
}
