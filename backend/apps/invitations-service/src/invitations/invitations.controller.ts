import {
  Controller, Post, Get, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { InvitationsService } from './invitations.service';
import { CreateInvitationsDto, ListInvitationsDto, AcceptInvitationDto } from '../dto/invitation.dto';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';

@Controller('invitations')
@UseGuards(GatewayAuthGuard)
export class InvitationsController {
  constructor(private readonly svc: InvitationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateInvitationsDto, @Req() req: any) {
    return this.svc.createInvites(dto, req.user);
  }

  @Get()
  list(@Query() dto: ListInvitationsDto) {
    return this.svc.list(dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Post(':id/resend')
  resend(@Param('id') id: string) {
    return this.svc.resend(id);
  }

  @Delete(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.svc.cancel(id);
  }

  @Post('accept')
  accept(@Body() dto: AcceptInvitationDto, @Req() req: any) {
    return this.svc.accept(dto, req.user);
  }

  // RabbitMQ
  @MessagePattern('invitations.create')
  handleCreate(@Payload() data: { dto: CreateInvitationsDto; user: { id: string; email: string } }) {
    return this.svc.createInvites(data.dto, data.user);
  }
}
