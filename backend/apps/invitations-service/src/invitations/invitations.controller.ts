import {
  Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { InviteSettingsService } from './invite-settings.service';
import {
  CreateInvitationsDto,
  CreateInviteLinkDto,
  ListInvitationsDto,
  AcceptInvitationDto,
  ShareProjectLinkDto,
  UpdateInvitationDto,
  CheckInvitationsDto,
  ResendInvitationDto,
} from '../dto/invitation.dto';
import {
  GetInviteSettingsDto,
  UpdateInviteSettingsDto,
} from '../dto/invite-settings.dto';
import { GatewayAuthGuard } from '../guards/gateway-auth.guard';
import { Public } from '../decorators/public.decorator';

/** The gateway's authenticated caller, as GatewayAuthGuard assembles it. */
type RequestWithUser = { user?: { id?: string; sub?: string; email?: string | null } };

const actorOf = (req: RequestWithUser) => ({
  id: req.user?.id ?? req.user?.sub ?? '',
  email: req.user?.email ?? null,
});

// Mounted at both the legacy path and the doc's /v1 path (api-gateway
// strips /v1 for this service, see proxy.controller.ts). Kept as one
// controller class, not two, so the two paths can never drift apart.
@Controller(['invitations', 'v1/invitations'])
@UseGuards(GatewayAuthGuard)
export class InvitationsController {
  constructor(
    private readonly svc: InvitationsService,
    private readonly settings: InviteSettingsService,
  ) {}

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

  // ---------------------------------------------------------------------
  // Static paths first. Nest resolves in declaration order, so every one of
  // these has to sit above ':id' or it is swallowed as an invitation id.
  // ---------------------------------------------------------------------

  /**
   * Manage Invite Settings, read (R3-02).
   *
   * Defaults to the caller's own account. Reading is open to the account and
   * to anyone acting through one of its companies; the password itself has no
   * representation in the response, only `passwordSet`.
   */
  @Get('settings')
  @HttpCode(HttpStatus.OK)
  async getSettings(@Query() dto: GetInviteSettingsDto, @Req() req: RequestWithUser) {
    const actor = actorOf(req);
    const accountId = dto.accountId ?? actor.id;
    await this.settings.assertCanRead(accountId, actor.id, dto.companyId);
    const settings = await this.settings.get(accountId);
    return { success: true, data: this.settings.toPublic(settings) };
  }

  /**
   * Manage Invite Settings, write (R3-02, R3-14).
   *
   * PATCH rather than PUT because each control saves on change: a request
   * carries the switch that moved, not the whole panel. There is no Save
   * button to answer to and no confirmation to render.
   */
  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  async updateSettings(@Body() dto: UpdateInviteSettingsDto, @Req() req: RequestWithUser) {
    const actor = actorOf(req);
    const accountId = dto.accountId ?? actor.id;
    await this.settings.assertCanManage(accountId, actor.id, dto.companyId);
    const saved = await this.settings.update(accountId, dto);
    return { success: true, data: this.settings.toPublic(saved) };
  }

  /**
   * Duplicate / existing-member check for addresses still in the invite
   * field (R3-11). POST because it takes a list of addresses, not because it
   * changes anything — it does not.
   */
  @Post('check')
  @HttpCode(HttpStatus.OK)
  check(@Body() dto: CheckInvitationsDto, @Req() req: RequestWithUser) {
    return this.svc.checkEmails(dto, actorOf(req));
  }

  // Public: this is what the sign-in/sign-up banner and the accept page
  // render before the visitor is authenticated. See jwt.middleware.ts's
  // PUBLIC_PATTERNS, which must whitelist this exact path.
  @Public()
  @Get('preview')
  @HttpCode(HttpStatus.OK)
  preview(@Query('token') token: string) {
    return this.svc.preview(token);
  }

  @Get()
  list(@Query() dto: ListInvitationsDto, @Req() req: RequestWithUser) {
    return this.svc.listFor(dto, actorOf(req));
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.svc.getOneFor(id, actorOf(req));
  }

  /** Change the roles on a pending invitation (R3-10). Administrator only. */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInvitationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.updatePending(id, dto, actorOf(req));
  }

  /**
   * Resend, optionally held first (R3-09). `holdMs` defaults to 0, so a
   * caller that runs its own hold keeps today's behaviour.
   */
  @Post(':id/resend')
  resend(
    @Param('id') id: string,
    @Body() dto: ResendInvitationDto,
    @Req() req: RequestWithUser,
  ) {
    return this.svc.resend(id, actorOf(req), dto?.holdMs ?? 0);
  }

  /** Undo on "Your invitation has been resent": drop a resend still held. */
  @Delete(':id/resend')
  @HttpCode(HttpStatus.OK)
  undoResend(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.svc.undoResend(id, actorOf(req));
  }

  @Delete(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.svc.cancel(id, actorOf(req));
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
