import { Controller, Get, Post, Param, Body, Req } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation } from '../entities/invitation.entity';
import { v4 as uuidv4 } from 'uuid';

@Controller('v1/invitations')
export class InvitationsController {
  constructor(@InjectRepository(Invitation) private readonly repo: Repository<Invitation>) {}

  @Post()
  async invite(@Body() dto: { inviteeEmail: string }, @Req() req: any) {
    const invitation = this.repo.create({ inviterId: req.user?.id, inviteeEmail: dto.inviteeEmail, token: uuidv4(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    return this.repo.save(invitation);
  }

  @Get('verify/:token')
  async verify(@Param('token') token: string) {
    const inv = await this.repo.findOne({ where: { token } });
    if (!inv) return { valid: false };
    if (inv.status !== 'pending' || inv.expiresAt < new Date()) return { valid: false, reason: 'expired' };
    return { valid: true, invitation: inv };
  }

  @Post(':token/accept')
  async accept(@Param('token') token: string, @Req() req: any) {
    await this.repo.update({ token }, { status: 'accepted', inviteeId: req.user?.id });
    return { accepted: true };
  }

  @Get('health')
  health() { return { status: 'ok', service: 'invitations-service' }; }
}
