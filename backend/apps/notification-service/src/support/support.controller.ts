import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { Public } from '../guards/jwt-auth.guard';
import { ScheduleCallDto } from './dto/schedule-call.dto';
import { SupportMessageDto } from './dto/support-message.dto';
import { SupportService } from './support.service';

/**
 * Contact Support, reached from the account recovery flow.
 *
 * Deliberately unauthenticated: someone locked out of their account cannot
 * present a token, which is the entire reason this surface exists. The gateway
 * must list these paths in PUBLIC_EXACT_ROUTES for them to be reachable at all.
 */
@Public()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  private clientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const chain = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return chain?.split(',')[0]?.trim() || req.ip || '';
  }

  @Post('messages')
  @HttpCode(HttpStatus.OK)
  async sendMessage(@Body() dto: SupportMessageDto, @Req() req: Request) {
    return this.supportService.sendSupportMessage(dto, this.clientIp(req));
  }

  @Post('call-requests')
  @HttpCode(HttpStatus.OK)
  async requestCall(@Body() dto: ScheduleCallDto, @Req() req: Request) {
    return this.supportService.requestCall(dto, this.clientIp(req));
  }
}
