// apps/offer-service/src/offers/offers.controller.ts
// OS-10: All 8 primary offer endpoints — uses @libs/auth (RS256)
// OS-23: Added GET :id/ably-token endpoint for frontend real-time subscriptions
import {
  Controller, Get, Post, Patch, Param, Body, Query, Req,
  UseGuards, UseInterceptors, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, CurrentUser } from '@libs/auth';
import { OffersService } from './offers.service';
import { AblyService } from '../realtime/ably.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { EditOfferDto } from './dto/edit-offer.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import { DeclineOfferDto } from './dto/decline-offer.dto';
import { WithdrawOfferDto } from './dto/withdraw-offer.dto';
import { ResendOfferDto } from './dto/resend-offer.dto';
import { OfferHistoryQueryDto } from './dto/offer-history-query.dto';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';
import { RolesGuard } from '../guards/roles.guard';
import { OfferPartyGuard } from '../guards/offer-party.guard';
import { ListingOwnerGuard } from '../guards/listing-owner.guard';
import { IdempotencyInterceptor } from '../interceptors/idempotency.interceptor';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/types/user-role.enum';

@Controller('offers')
@UseGuards(JwtAuthGuard)
export class OffersController {
  constructor(
    private readonly offersService: OffersService,
    private readonly ablyService: AblyService,
  ) {}

  // POST /v1/offers — no @Roles(CLIENT)/RolesGuard here: role is never set
  // on the JWT (see roles.guard.ts's comment), and there's no offer yet to
  // derive a party from either. ListingOwnerGuard is the authorization
  // boundary instead — only the client who owns dto.jobListingId may
  // create an offer against it. See listing-owner.guard.ts.
  @Post()
  @UseGuards(ListingOwnerGuard)
  @UseInterceptors(IdempotencyInterceptor)
  @HttpCode(HttpStatus.CREATED)
  async createOffer(@CurrentUser() user: any, @Body() dto: CreateOfferDto, @Req() req: Request) {
    const authHeader = req.headers['authorization'] as string | undefined;
    const clientJwt = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    return this.offersService.create(user.id, dto, clientJwt);
  }
 
  // GET /v1/offers — offers inbox, scoped to the authenticated user by role.
  // Declared ahead of GET :id (literal path, no collision either way since
  // ':id' requires a path segment — same convention as the other literal
  // routes in this file).
  //
  // Guarded exactly as GET :id: OfferPartyGuard only, no RolesGuard/@Roles —
  // both clients and talents call this for their own inbox. OfferPartyGuard
  // itself no-ops here (it only checks a :id/:offerId param, and there is
  // none on this route — see its own "skip (creation endpoints)" comment).
  // The actual authorization boundary is inside offersService.list(): the
  // party (client_id or talent_id) is derived from the JWT-carried
  // role+userId only, never from a query param.
  @Get()
  @UseGuards(OfferPartyGuard)
  async listOffers(
    @CurrentUser() user: any,
    @Query() query: ListOffersQueryDto,
  ) {
    return this.offersService.list(user.id, query);
  }

  // GET /v1/offers/:id
  @Get(':id')
  @UseGuards(OfferPartyGuard)
  async getOffer(@Param('id', ParseUUIDPipe) id: string) {
    return this.offersService.findById(id);
  }
 
  // PATCH /v1/offers/:id — CLIENT (derived from offer party). Guard order
  // matters — OfferPartyGuard must run first to populate request.partyRole
  // before RolesGuard reads it. Same bug as accept/decline/withdraw/resend
  // had, same fix.
  @Patch(':id')
  @UseGuards(OfferPartyGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @UseInterceptors(IdempotencyInterceptor)
  async editOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: EditOfferDto,
  ) {
    return this.offersService.edit(id, user.id, dto);
  }
 
  // POST /v1/offers/:id/accept — TALENT (derived from offer party — see
  // OfferPartyGuard/RolesGuard). OfferPartyGuard MUST run before
  // RolesGuard: it's what populates request.partyRole that RolesGuard
  // reads. Order here is significant, not stylistic.
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OfferPartyGuard, RolesGuard)
  @Roles(UserRole.TALENT)
  @UseInterceptors(IdempotencyInterceptor)
  async acceptOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: AcceptOfferDto,
  ) {
    return this.offersService.accept(id, user.id, dto);
  }
 
  // POST /v1/offers/:id/decline — TALENT (derived from offer party).
  // Guard order matters — see acceptOffer's comment above.
  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OfferPartyGuard, RolesGuard)
  @Roles(UserRole.TALENT)
  @UseInterceptors(IdempotencyInterceptor)
  async declineOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: DeclineOfferDto,
  ) {
    return this.offersService.decline(id, user.id, dto);
  }
 
  // POST /v1/offers/:id/withdraw — CLIENT (derived from offer party).
  // Guard order matters — see acceptOffer's comment above.
  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OfferPartyGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @UseInterceptors(IdempotencyInterceptor)
  async withdrawOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: WithdrawOfferDto,
  ) {
    return this.offersService.withdraw(id, user.id, dto);
  }
 
  // POST /v1/offers/:id/resend — CLIENT (derived from offer party).
  // Guard order matters — see acceptOffer's comment above.
  @Post(':id/resend')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OfferPartyGuard, RolesGuard)
  @Roles(UserRole.CLIENT)
  @UseInterceptors(IdempotencyInterceptor)
  async resendOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: ResendOfferDto,
  ) {
    return this.offersService.resend(id, user.id, dto);
  }
 
  // GET /v1/offers/:id/history
  @Get(':id/history')
  @UseGuards(OfferPartyGuard)
  async getHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: OfferHistoryQueryDto,
  ) {
    return this.offersService.getHistory(id, query);
  }
 
  // ============================================================
  // OS-23: GET /v1/offers/:id/ably-token
  // ============================================================
  /**
   * Generates a short-lived Ably token for the frontend to subscribe
   * to the real-time channel for this offer.
   *
   * Auth: JWT required. Must be offer.clientId or offer.talentId.
   * Guards: JwtAuthGuard (class-level), OfferPartyGuard (validates party membership).
   *
   * The token capability is: { "offer:{offerId}": ["subscribe"] }
   * The token expires after ABLY_TOKEN_TTL_SECONDS (default 1 hour).
   */
  @Get(':id/ably-token')
  @UseGuards(OfferPartyGuard)
  @HttpCode(HttpStatus.OK)
  async getAblyToken(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.ablyService.createToken(id, user.sub ?? user.id);
  }
}