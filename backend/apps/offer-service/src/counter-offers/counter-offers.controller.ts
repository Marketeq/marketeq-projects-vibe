// apps/offer-service/src/counter-offers/counter-offers.controller.ts
// OS-10: All 6 counter offer endpoints — uses @libs/auth (RS256)
import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, UseInterceptors, HttpCode, HttpStatus, ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@libs/auth';
import { CounterOffersService } from './counter-offers.service';
import { CreateCounterOfferDto } from './dto/create-counter-offer.dto';
import { EditCounterOfferDto } from './dto/edit-counter-offer.dto';
import { WithdrawCounterOfferDto } from './dto/withdraw-counter-offer.dto';
import { DeclineCounterOfferDto } from './dto/decline-counter-offer.dto';
import { OfferPartyGuard } from '../guards/offer-party.guard';
import { TalentGateGuard } from '../guards/talent-gate.guard';
import { IdempotencyInterceptor } from '../interceptors/idempotency.interceptor';
import { CurrentPartyRole } from '../common/decorators/current-party-role.decorator';
import { UserRole } from '../common/types/user-role.enum';

@Controller('offers/:offerId/counter-offers')
@UseGuards(JwtAuthGuard, OfferPartyGuard)
export class CounterOffersController {
  constructor(private readonly counterOffersService: CounterOffersService) {}

  // G4: create, edit and accept are gated on the OFFER'S talent (TalentGateGuard,
  // after the class-level OfferPartyGuard, before the interceptor), whichever
  // party acts. Decline, withdraw and reads stay ungated.
  //
  // POST /v1/offers/:offerId/counter-offers
  // submittedBy (CLIENT/TALENT — used for rate-warning direction and the
  // stored submitted_by column) comes from partyRole, derived by
  // OfferPartyGuard (class-level, already run) from actual offer party
  // membership — not from user.role, which libs/auth's JwtStrategy never
  // sets (see offer-party.guard.ts's comment). partyRole is guaranteed
  // set here: OfferPartyGuard already 403'd anyone who isn't clientId or
  // talentId on this offer before this handler runs.
  @Post()
  @UseGuards(TalentGateGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(HttpStatus.CREATED)
  async createCounterOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @CurrentUser() user: any,
    @CurrentPartyRole() partyRole: UserRole | undefined,
    @Body() dto: CreateCounterOfferDto,
  ) {
    if (!partyRole) {
      throw new ForbiddenException("You don't have permission to do that.");
    }
    return this.counterOffersService.create(offerId, user.id, partyRole, dto);
  }

  // GET /v1/offers/:offerId/counter-offers/:id
  @Get(':id')
  async getCounterOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.counterOffersService.findById(offerId, id);
  }

  // PATCH /v1/offers/:offerId/counter-offers/:id
  @Patch(':id')
  @UseGuards(TalentGateGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async editCounterOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: EditCounterOfferDto,
  ) {
    return this.counterOffersService.edit(offerId, id, user.id, dto);
  }

  // POST /v1/offers/:offerId/counter-offers/:id/accept
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(TalentGateGuard)
  @UseInterceptors(IdempotencyInterceptor)
  async acceptCounterOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.counterOffersService.accept(offerId, id, user.id);
  }

  // POST /v1/offers/:offerId/counter-offers/:id/decline
  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(IdempotencyInterceptor)
  async declineCounterOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: DeclineCounterOfferDto,
  ) {
    return this.counterOffersService.decline(offerId, id, user.id, dto);
  }

  // POST /v1/offers/:offerId/counter-offers/:id/withdraw
  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(IdempotencyInterceptor)
  async withdrawCounterOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: WithdrawCounterOfferDto,
  ) {
    return this.counterOffersService.withdraw(offerId, id, user.id, dto);
  }
}