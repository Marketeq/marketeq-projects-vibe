import {
  Controller, Post, Get, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationsDto, CreateInviteLinkDto, ListInvitationsDto, AcceptInvitationDto, ShareProjectLinkDto } from '../dto/invitation.dto';
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

  @Post('link')
  @HttpCode(HttpStatus.OK)
  createLink(@Body() dto: CreateInviteLinkDto, @Req() req: any) {
    const user = req.user as { sub?: string; id?: string; email?: string };
    const userId = user?.sub ?? user?.id ?? '';
    const team = { id: dto.teamId, name: dto.teamName || dto.teamId };
    return this.svc.createInviteLink(dto, { id: userId, email: user?.email ?? '' }, team);
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

  @Post('share-link')
  @HttpCode(HttpStatus.OK)
  shareLink(@Body() dto: ShareProjectLinkDto, @Req() req: any) {
    return this.svc.shareProjectLink(dto, req.user);
  }
}
