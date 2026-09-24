// apps/payout-service/src/card/card.controller.ts
// PS-13 §2–§7: Card management endpoints
// Feature-flagged behind FEATURE_DEBIT_CARD_ENABLED

import { Controller, Post, Patch, Delete, Body, Param, ParseUUIDPipe, UseGuards, Request, HttpCode } from '@nestjs/common';
import { CardIssuanceService } from './card-issuance.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { UpdateSpendingLimitsDto } from './dto/update-spending-limits.dto';

@Controller('v1/cards')
@UseGuards(JwtAuthGuard)
export class CardController {
  constructor(private readonly cardSvc: CardIssuanceService) {}

  // PS-13 §2: Request a new card (virtual or physical)
  @Post()
  @HttpCode(201)
  async requestCard(@Request() req: any, @Body() dto: { cardType: 'virtual' | 'physical' }) {
    return this.cardSvc.requestCard(req.user.userId, dto);
  }

  // PS-13 §3: Activate card (last4 confirmation)
  @Post(':id/activate')
  @HttpCode(200)
  async activateCard(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: { last4: string },
  ) {
    return this.cardSvc.activateCard(req.user.userId, id, dto);
  }

  // PS-13 §7: Freeze card
  @Post(':id/freeze')
  @HttpCode(200)
  async freezeCard(@Request() req: any, @Param('id') id: string) {
    return this.cardSvc.freezeCard(req.user.userId, id);
  }

  // PS-13 §7: Unfreeze card
  @Post(':id/unfreeze')
  @HttpCode(200)
  async unfreezeCard(@Request() req: any, @Param('id') id: string) {
    return this.cardSvc.unfreezeCard(req.user.userId, id);
  }

  // PS-13 §7: Report lost/stolen (cancels old card, creates replacement)
  @Post(':id/report-lost')
  @HttpCode(200)
  async reportLost(@Request() req: any, @Param('id') id: string) {
    return this.cardSvc.reportLost(req.user.userId, id);
  }

  // PS-13 §7: Cancel card permanently
  @Delete(':id')
  @HttpCode(200)
  async cancelCard(@Request() req: any, @Param('id') id: string) {
    return this.cardSvc.cancelCard(req.user.userId, id);
  }

  // PS-13 §5: Admin — override weekly/monthly/single-transaction spending
  // limits. Doc marks these "Adjustable by Marketeq admin: Yes"; existed
  // with no persistence or endpoint before.
  //
  // Reviewer-caught bug: the inline body type here had a runtime metatype
  // of `Object`, which the global ValidationPipe silently skips — nothing
  // was actually validated. $0/negative/fractional-cent values reached
  // Stripe and Postgres unchecked. Now a real DTO. `:id` also lacked
  // ParseUUIDPipe, unlike the sibling admin routes from #665
  // (release-edd, waive-first-hold) — a non-UUID id 500'd instead of 400ing.
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch('admin/:id/spending-limits')
  @HttpCode(200)
  async updateSpendingLimits(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSpendingLimitsDto,
  ) {
    return this.cardSvc.adminUpdateSpendingLimits(id, req.user.userId, dto);
  }
}