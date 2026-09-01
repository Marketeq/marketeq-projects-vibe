import {
  Controller, Post, Get, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationsDto, CreateInviteLinkDto, ListInvitationsDto, AcceptInvitationDto, ShareProjectLinkDto } from '../dto/invitation.dto';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';
import { Public } from '../decorators/public.decorator';

// Mounted at both the legacy path and the doc's /v1 path (api-gateway
// strips /v1 for this service, see proxy.controller.ts). Kept as one
// controller class, not two, so the two paths can never drift apart.
@Controller(['invitations', 'v1/invitations'])
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

  // Static path. It must be declared before the ':id' route below, or Nest
  // will try to resolve "preview" as an invitation id. Public: this is what
  // the sign-in/sign-up banner and the accept page render before the
  // visitor is authenticated. See jwt.middleware.ts's PUBLIC_PATTERNS,
  // which must whitelist this exact path.
  @Public()
  @Get('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Query('token') token: string) {
    return this.svc.preview(token);
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
