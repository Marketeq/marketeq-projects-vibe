import { Body, Controller, Delete, Get, Param, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { InvitationsService } from "./invitations.service";
import { AcceptInvitationDto, CreateInviteLinkDto, CreateInvitationsDto, ListInvitationsQuery } from "./invitations.dto";
import { ApiOperation } from "@nestjs/swagger";

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly svc: InvitationsService) {}

  @ApiOperation({ summary: 'Create invitations for team members' })
  @Post()
  async create(
    @Body() dto: CreateInvitationsDto,
    @Req() req: Request,
  ) {
    // JwtAuthGuard populates req.user
    const user = req.user as { sub?: string; id?: string; email?: string };
    const userId = user?.sub ?? user?.id;
    if (!userId || !user?.email) {
      throw new UnauthorizedException('Invalid user');
    }
    // Use teamName from DTO (sent by frontend) instead of hardcoded placeholder
    const team = { id: dto.teamId, name: dto.teamName || dto.teamId };

    const result = await this.svc.createInvites(dto, { id: userId, email: user.email }, team);
    return result.map(r => ({
      id: r.invitation.id,
      email: r.invitation.invitedEmail,
      status: r.invitation.status,
      expiresAt: r.invitation.expiresAt,
      teamName: r.invitation.teamName,
      alreadyInvited: r.alreadyInvited,
      token: r.invitation.token,
    }));
  }

  @ApiOperation({ summary: 'Create a generic team invite link' })
  @Post('link')
  async createLink(
    @Body() dto: CreateInviteLinkDto,
    @Req() req: Request,
  ) {
    const user = req.user as { sub?: string; id?: string; email?: string };
    const userId = user?.sub ?? user?.id;
    if (!userId || !user?.email) {
      throw new UnauthorizedException('Invalid user');
    }

    const team = { id: dto.teamId, name: dto.teamName || dto.teamId };
    return this.svc.createInviteLink(dto, { id: userId, email: user.email }, team);
  }

  @ApiOperation({ summary: 'List invitations' })
  @Get()
  async list(@Query() q: ListInvitationsQuery) {
    return this.svc.list({
      teamId: q.teamId,
      invitedEmail: q.invitedEmail,
      status: q.status,
      limit: q.limit,
      cursor: q.cursor
    });
  }

  @ApiOperation({ summary: 'Get invitation by id' })
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const invitation = await this.svc.getOne(id);
    return {
      id: invitation.id,
      teamId: invitation.teamId,
      teamName: invitation.teamName,
      email: invitation.invitedEmail,
      status: invitation.status,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt,
      canceledAt: invitation.canceledAt,
      resentCount: invitation.resentCount,
      token: invitation.token,
    };
  }

  @ApiOperation({ summary: 'Resend an invitation' })
  @Post(':id/resend')
  async resend(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as { sub?: string; id?: string; email?: string };
    const userId = user?.sub ?? user?.id;
    if (!userId || !user?.email) {
      throw new UnauthorizedException('Invalid user');
    }
    const inv = await this.svc.getOne(id);
    const team = { name: 'Client Team' }; // fetch real team name if needed
    return this.svc.resend(inv.id, { id: userId, email: user.email }, team);
  }

  @ApiOperation({ summary: 'Cancel an invitation' })
  @Delete(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const user = req.user as { sub?: string; id?: string };
    const userId = user?.sub ?? user?.id;
    if (!userId) {
      throw new UnauthorizedException('Invalid user');
    }
    return this.svc.cancel(id, userId);
  }

  @ApiOperation({ summary: 'Accept invitation by token' })
  @Post('accept')
  async accept(
    @Body() dto: AcceptInvitationDto,
    @Req() req: Request,
  ) {
    const user = req.user as { sub?: string; id?: string; email?: string };
    const userId = user?.sub ?? user?.id;
    if (!userId || !user?.email) {
      throw new UnauthorizedException('Invalid user');
    }
    return this.svc.accept(dto, { id: userId, email: user.email });
  }
}
/*
export NOTIFICATIONS_URL='http://localhost:3011'
export NOTIFICATIONS_API_KEY='devkey'   # optional
npx nx serve invitations-service
# then
curl -X POST http://localhost:3011/notifications/send \
  -H "Content-Type: application/json" \
  -d '{"template":"team-invite","to":"alice@example.com","vars":{}}'
*/

/*
Reka@Reka MINGW64 ~/vscodedevops/marketeq-projects-nestjs-digital (master)
$ curl -X POST http://localhost:3011/notifications/send \  
  -H "Content-Type: application/json" \
  -d '{"template":"team-invite","to":"alice@example.com","vars":{}}'
{"success":true,"received":true}
*/
