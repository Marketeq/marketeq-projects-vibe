// apps/offer-service/src/counter-offers/counter-offers.controller.ts
// OS-10: All 6 counter offer endpoints — uses @libs/auth (RS256)
import {
  Controller, Get, Post, Patch, Param, Body,
  UseGuards, UseInterceptors, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@libs/auth';
import { CounterOffersService } from './counter-offers.service';
import { CreateCounterOfferDto } from './dto/create-counter-offer.dto';
import { EditCounterOfferDto } from './dto/edit-counter-offer.dto';
import { WithdrawCounterOfferDto } from './dto/withdraw-counter-offer.dto';
import { OfferPartyGuard } from '../guards/offer-party.guard';
import { IdempotencyInterceptor } from '../interceptors/idempotency.interceptor';

@Controller('offers/:offerId/counter-offers')
@UseGuards(JwtAuthGuard, OfferPartyGuard)
export class CounterOffersController {
  constructor(private readonly counterOffersService: CounterOffersService) {}

  // POST /v1/offers/:offerId/counter-offers
  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(HttpStatus.CREATED)
  async createCounterOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateCounterOfferDto,
  ) {
    return this.counterOffersService.create(offerId, user.id, user.role, dto);
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
  @UseInterceptors(IdempotencyInterceptor)
  async declineCounterOffer(
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.counterOffersService.decline(offerId, id, user.id);
  }

  // POST /v1/offers/:offerId/counter-offers/:id/withdraw
  @Post(':id/withdraw')
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