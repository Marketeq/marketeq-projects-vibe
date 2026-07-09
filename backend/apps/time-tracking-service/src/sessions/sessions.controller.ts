import { Body, Controller, Get, Param, Post, Query, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { BearerGuard } from '../common/guards/bearer.guard';

@Controller('sessions')
@UseGuards(BearerGuard)
export class SessionsController {
  constructor(private readonly svc: SessionsService) {}

  /** Desktop app: open a new session (idempotent) */
  @Post()
  async create(@Req() req: any, @Body() dto: CreateSessionDto) {
    const userId = req?.user?.sub ?? req?.headers?.['x-user-id'];
    if (!userId) throw new UnauthorizedException('Missing user identity');
    return this.svc.create(String(userId), dto);
  }

  /** Desktop app: close an existing session */
  @Post(':id/close')
  async close(@Param('id') id: string, @Req() req: any, @Body() dto: CloseSessionDto) {
    const userId = req?.user?.sub ?? req?.headers?.['x-user-id'];
    if (!userId) throw new UnauthorizedException('Missing user identity');
    return this.svc.close(id, String(userId), dto);
  }

  /** Frontend: list sessions for a contract */
  @Get()
  async list(@Req() req: any, @Query('contractId') contractId: string) {
    const userId = req?.user?.sub ?? req?.headers?.['x-user-id'];
    if (!userId) throw new UnauthorizedException('Missing user identity');
    return this.svc.findByContract(String(userId), contractId);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  /** Doc 13 §6.3 — POST /sessions/:id/take-over */
  @Post(':id/take-over')
  async takeOver(@Param('id') id: string, @Req() req: any, @Body() body: { deviceId: string }) {
    const userId = req?.user?.sub ?? req?.headers?.['x-user-id'];
    return this.svc.takeOver(id, String(userId), body.deviceId);
  }
}
