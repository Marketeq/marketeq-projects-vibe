import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Headers,
  UseGuards,
} from "@nestjs/common";
import { CheckoutService } from "./checkout.service";
import { CheckoutSummaryService } from "./checkout-summary.service";
import { CheckoutDraftService } from "./checkout-draft.service";
import { CheckoutDraftCodeService } from "./checkout-draft-code.service";
import { CheckoutDraftPricingService } from "./pricing/checkout-draft-pricing.service";
import { CheckoutDraftSessionService } from "./checkout-draft-session.service";
import { CheckoutPaymentMethodsService } from "./checkout-payment-methods.service";
import { SavedCardsService } from "./saved-cards.service";
import { SaveCardDto } from "./dto/save-card.dto";
import { UpdateCardDto } from "./dto/update-card.dto";
import { CreateDraftSessionDto } from "./dto/create-draft-session.dto";
import { ClientId } from "../decorators/client-id.decorator";
import { StripeService } from "../stripe/stripe.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { InternalTokenGuard } from "../guards/internal-token.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Request } from "express";

import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { ApplyDraftCodeDto } from './dto/draft-code.dto';
import { UseWalletDto } from './dto/use-wallet.dto';
import { ConfirmPaymentDto } from './dto/confirm-payment.dto';
import { CancelPaymentDto } from './dto/cancel-payment.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SplitPaymentDto } from './dto/split-payment.dto';
import { CreateBankLinkDto } from './dto/create-bank-link.dto';
import { AttachBankAccountDto } from './dto/attach-bank-account.dto';
import { PayACHDto } from './dto/pay-ach.dto';
import { ConfirmWireDto } from './dto/confirm-wire.dto';
import { WalletTopUpDto } from './dto/wallet-topup.dto';
import { StoreMetadataDto } from './dto/store-metadata.dto';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { ConfirmPaymentIntentDto } from './dto/confirm-payment-intent.dto';
import { CalculateRateEstimateDto } from './dto/calculate-rate-estimate.dto';
import {
  AddDraftPhaseDto,
  DuplicateDraftPhaseDto,
  RemoveDraftMemberDto,
  ReplaceDraftMemberDto,
  UpdateDraftRoleDto,
  AddDraftTaskDto,
  UpdateDraftPhaseDto,
  UpdateDraftTaskDto,
} from './dto/draft-task.dto';

@Controller("v1/checkout")
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly stripeService: StripeService,
    private readonly checkoutSummaryService: CheckoutSummaryService,
    private readonly checkoutDraftService: CheckoutDraftService,
    private readonly checkoutDraftCodeService: CheckoutDraftCodeService,
    private readonly checkoutDraftPricingService: CheckoutDraftPricingService,
    private readonly checkoutDraftSessionService: CheckoutDraftSessionService,
    private readonly checkoutPaymentMethodsService: CheckoutPaymentMethodsService,
    private readonly savedCardsService: SavedCardsService,
  ) {}

  @Post("cards/setup-intent")
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalTokenGuard)
  createCardSetupIntent(@ClientId() clientId: string) {
    return this.savedCardsService.createSetupIntent(clientId);
  }

  @Post("cards")
  @UseGuards(InternalTokenGuard)
  saveCard(@Body() dto: SaveCardDto, @ClientId() clientId: string) {
    return this.savedCardsService.saveCard(clientId, dto);
  }

  @Get("cards")
  @UseGuards(InternalTokenGuard)
  listCards(@ClientId() clientId: string) {
    return this.savedCardsService.listCards(clientId);
  }

  @Get("cards/:cardId")
  @UseGuards(InternalTokenGuard)
  getCard(
    @Param("cardId", ParseUUIDPipe) cardId: string,
    @ClientId() clientId: string,
  ) {
    return this.savedCardsService.getCard(clientId, cardId);
  }

  @Patch("cards/:cardId")
  @UseGuards(InternalTokenGuard)
  updateCard(
    @Param("cardId", ParseUUIDPipe) cardId: string,
    @Body() dto: UpdateCardDto,
    @ClientId() clientId: string,
  ) {
    return this.savedCardsService.updateCard(clientId, cardId, dto);
  }

  @Delete("cards/:cardId")
  @UseGuards(InternalTokenGuard)
  deleteCard(
    @Param("cardId", ParseUUIDPipe) cardId: string,
    @ClientId() clientId: string,
  ) {
    return this.savedCardsService.deleteCard(clientId, cardId);
  }

  @Post("listings/:listingId/draft")
  @UseGuards(InternalTokenGuard)
  createListingDraft(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftService.createDraft(clientId, listingId);
  }

  @Get("listings/:listingId/draft")
  @UseGuards(InternalTokenGuard)
  getListingDraft(
    @Param('listingId') listingId: string,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftService.getDraft(clientId, listingId);
  }

  @Delete("drafts/:draftId")
  @UseGuards(InternalTokenGuard)
  discardDraft(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftService.discard(clientId, draftId);
  }

  @Get("drafts/:draftId/scope")
  @UseGuards(InternalTokenGuard)
  getDraftScope(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftService.getScope(clientId, draftId);
  }

  @Get("drafts/:draftId/team")
  @UseGuards(InternalTokenGuard)
  getDraftTeam(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftService.getTeam(clientId, draftId);
  }

  @Get("drafts/:draftId/pricing")
  @UseGuards(InternalTokenGuard)
  getDraftPricing(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftPricingService.getPricing(clientId, draftId);
  }

  @Get("session/:sessionId")
  @UseGuards(InternalTokenGuard)
  getDraftSession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftSessionService.getSession(clientId, sessionId);
  }

  @Get("session/:sessionId/payment-methods")
  @UseGuards(InternalTokenGuard)
  getSessionPaymentMethods(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('balanceApplied') balanceApplied: string | undefined,
    @ClientId() clientId: string,
  ) {
    return this.checkoutPaymentMethodsService.getPaymentMethods(
      clientId,
      sessionId,
      balanceApplied,
    );
  }

  @Post("drafts/:draftId/create-session")
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalTokenGuard)
  createDraftSession(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ClientId() clientId: string,
    @Body() dto: CreateDraftSessionDto,
  ) {
    return this.checkoutDraftSessionService.createSession(clientId, draftId, dto);
  }

  @Post("drafts/:draftId/phases")
  @UseGuards(InternalTokenGuard)
  addDraftPhase(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ClientId() clientId: string,
    @Body() dto: AddDraftPhaseDto,
  ) {
    return this.checkoutDraftService.addPhase(clientId, draftId, dto);
  }

  @Post("drafts/:draftId/team/replace-member")
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalTokenGuard)
  replaceDraftMember(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ClientId() clientId: string,
    @Body() dto: ReplaceDraftMemberDto,
  ) {
    return this.checkoutDraftService.replaceMember(clientId, draftId, dto);
  }

  @Post("drafts/:draftId/team/update-role")
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalTokenGuard)
  updateDraftRole(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ClientId() clientId: string,
    @Body() dto: UpdateDraftRoleDto,
  ) {
    return this.checkoutDraftService.updateRole(clientId, draftId, dto);
  }

  @Delete("drafts/:draftId/team/:userId")
  @UseGuards(InternalTokenGuard)
  removeDraftMember(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('version', ParseIntPipe) version: number,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftService.removeMember(clientId, draftId, userId, version);
  }

  @Post("drafts/:draftId/team/remove-member")
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalTokenGuard)
  removeDraftMemberAndTasks(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ClientId() clientId: string,
    @Body() dto: RemoveDraftMemberDto,
  ) {
    return this.checkoutDraftService.removeMemberAndTasks(
      clientId,
      draftId,
      dto,
    );
  }

  @Post("drafts/:draftId/apply-code")
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalTokenGuard)
  async applyDraftCode(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @ClientId() clientId: string,
    @Body() dto: ApplyDraftCodeDto,
  ) {
    await this.checkoutDraftCodeService.applyCode(clientId, draftId, dto);
    return this.checkoutDraftPricingService.getCodes(clientId, draftId);
  }

  @Post("session/:sessionId/apply-code")
  @HttpCode(HttpStatus.OK)
  @UseGuards(InternalTokenGuard)
  async applySessionCode(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @ClientId() clientId: string,
    @Body() dto: ApplyDraftCodeDto,
  ) {
    return this.checkoutDraftSessionService.applySessionCode(
      clientId,
      sessionId,
      dto,
    );
  }

  @Delete("session/:sessionId/apply-code/:code")
  @UseGuards(InternalTokenGuard)
  async removeSessionCode(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Param('code') code: string,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftSessionService.removeSessionCode(
      clientId,
      sessionId,
      code,
    );
  }

  @Delete("drafts/:draftId/apply-code/:code")
  @UseGuards(InternalTokenGuard)
  async removeDraftCode(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Param('code') code: string,
    @ClientId() clientId: string,
  ) {
    await this.checkoutDraftCodeService.removeCode(clientId, draftId, code);
    return this.checkoutDraftPricingService.getCodes(clientId, draftId);
  }

  @Post("drafts/:draftId/phases/:phaseId/duplicate")
  @UseGuards(InternalTokenGuard)
  duplicateDraftPhase(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @ClientId() clientId: string,
    @Body() dto: DuplicateDraftPhaseDto,
  ) {
    return this.checkoutDraftService.duplicatePhase(clientId, draftId, phaseId, dto);
  }

  @Patch("drafts/:draftId/phases/:phaseId")
  @UseGuards(InternalTokenGuard)
  updateDraftPhase(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @ClientId() clientId: string,
    @Body() dto: UpdateDraftPhaseDto,
  ) {
    return this.checkoutDraftService.updatePhase(clientId, draftId, phaseId, dto);
  }

  @Delete("drafts/:draftId/phases/:phaseId")
  @UseGuards(InternalTokenGuard)
  deleteDraftPhase(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @Query('version', ParseIntPipe) version: number,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftService.deletePhase(clientId, draftId, phaseId, version);
  }

  @Post("drafts/:draftId/phases/:phaseId/tasks")
  @UseGuards(InternalTokenGuard)
  addDraftTask(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Param('phaseId', ParseUUIDPipe) phaseId: string,
    @ClientId() clientId: string,
    @Body() dto: AddDraftTaskDto,
  ) {
    return this.checkoutDraftService.addTask(clientId, draftId, phaseId, dto);
  }

  @Patch("drafts/:draftId/tasks/:taskId")
  @UseGuards(InternalTokenGuard)
  updateDraftTask(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @ClientId() clientId: string,
    @Body() dto: UpdateDraftTaskDto,
  ) {
    return this.checkoutDraftService.updateTask(clientId, draftId, taskId, dto);
  }

  @Delete("drafts/:draftId/tasks/:taskId")
  @UseGuards(InternalTokenGuard)
  deleteDraftTask(
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Query('version', ParseIntPipe) version: number,
    @ClientId() clientId: string,
  ) {
    return this.checkoutDraftService.deleteTask(clientId, draftId, taskId, version);
  }

  @Get("listings/:listingId/summary")
  @UseGuards(InternalTokenGuard)
  getListingSummary(@Param('listingId') listingId: string) {
    return this.checkoutSummaryService.getSummary(listingId);
  }

  @Post("listings/:listingId/rate-estimate")
  @UseGuards(JwtAuthGuard)
  getListingRateEstimate(
    @Param('listingId') listingId: string,
    @Body() dto: CalculateRateEstimateDto,
  ) {
    return this.checkoutSummaryService.getRateEstimate(
      listingId,
      dto.selections,
    );
  }

  // ─── Existing Endpoints (now with auth + proper DTOs) ─────────────

  @Post("session")
  @UseGuards(JwtAuthGuard)
  createSession(@Body() dto: CreateCheckoutSessionDto, @Req() req: any) {
    return this.checkoutService.createSession({
      clientId: req.user.sub || dto.clientId,
      projectId: dto.projectId,
      contractId: dto.contractId,
      paymentMethod: dto.paymentMethod,
      installmentPlanOption: dto.installmentPlanOption,
      splitPaymentEnabled: dto.splitPaymentEnabled,
      initialPaymentAmount: dto.initialPaymentAmount,
      giftCardCode: dto.giftCardCode,
      walletBalanceUsed: dto.walletBalanceUsed,
      totalAmount: dto.amount,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
  }

  @Post("use-wallet")
  @UseGuards(JwtAuthGuard)
  useWallet(@Body() dto: UseWalletDto, @Req() req: any) {
    return this.checkoutService.useWallet(
      req.user.sub || dto.userId,
      dto.amount,
    );
  }

  @Post("confirm")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  confirm(@Body() dto: ConfirmPaymentDto, @Req() req: any) {
    return this.checkoutService.confirm(dto.sessionId, req.user.sub);
  }

  @Post('payment-intent')
  @UseGuards(JwtAuthGuard)
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @Req() req: any,
  ) {
    const customer = await this.savedCardsService.getOrCreateCustomer(
      req.user.sub,
      { email: req.user.email, name: req.user.name },
    );
    return this.checkoutService.createCardPaymentIntent({
      clientId: req.user.sub,
      customerId: customer.stripeCustomerId,
      email: req.user.email,
      name: req.user.name,
      amount: dto.amount,
      currency: dto.currency,
      paymentMethod: dto.paymentMethod,
      projectId: dto.projectId,
      contractId: dto.contractId,
      savePaymentMethod: dto.savePaymentMethod,
      metadata: dto.metadata,
    });
  }

  @Post('payment-intent/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  confirmPaymentIntent(
    @Body() dto: ConfirmPaymentIntentDto,
    @Req() req: any,
  ) {
    return this.checkoutService.confirmPaymentIntent({
      clientId: req.user.sub,
      paymentIntentId: dto.paymentIntentId,
    });
  }

  @Post("cancel")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancel(@Body() dto: CancelPaymentDto) {
    return this.checkoutService.cancel(dto.sessionId);
  }

  @Get("status/:sessionId")
  @UseGuards(JwtAuthGuard)
  getStatus(@Param('sessionId') sessionId: string, @Req() req: any) {
    return this.checkoutService.getStatus(sessionId, req.user.sub);
  }

  // ─── Webhook (no auth — Stripe signs it) ──────────────────────────

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    const event = this.stripeService.constructWebhookEvent(
      req.rawBody!,
      signature,
    );
    if (event.type.startsWith("payment_method.")) {
      await this.savedCardsService.handleCardEvent(event as any);
    } else {
      await this.checkoutService.handleWebhookEvent(event as any);
    }
    return { received: true };
  }

  // ─── Health (no auth) ─────────────────────────────────────────────

  @Get("health")
  health() {
    return { status: "ok", service: "checkout-service" };
  }

  // ─── New Endpoints ────────────────────────────────────────────────

  @Post("subscribe")
  @UseGuards(JwtAuthGuard)
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @Req() req: any,
  ) {
    const clientId = req.user.sub || dto.clientId;
    const customer = await this.savedCardsService.getOrCreateCustomer(
      clientId,
      { email: req.user.email, name: req.user.name },
    );
    return this.checkoutService.createSubscription({
      clientId,
      customerId: customer.stripeCustomerId,
      projectId: dto.projectId,
      contractId: dto.contractId,
      frequency: dto.installmentPlanOption,
      installmentAmount: dto.amount,
      totalPayments: dto.numberOfPayments,
    });
  }

  @Post("split-payment")
  @UseGuards(JwtAuthGuard)
  processSplitPayment(@Body() dto: SplitPaymentDto, @Req() req: any) {
    return this.checkoutService.processSplitPayment({
      clientId: req.user.sub,
      projectId: dto.projectId,
      totalAmount: dto.totalAmount,
      components: dto.payments.map((p) => ({
        type:
          p.method === "credit_card"
            ? ("card" as const)
            : p.method === "bank_transfer"
              ? ("card" as const)
              : (p.method as "wallet" | "gift_card"),
        amount: p.amount,
        giftCardCode: p.details?.giftCardCode,
        paymentMethodId: p.details?.paymentMethodId,
        customerId: p.details?.customerId,
      })),
    });
  }

  @Post("bank-link")
  @UseGuards(JwtAuthGuard)
  createBankLinkSession(@Body() dto: CreateBankLinkDto) {
    return this.checkoutService.createBankLinkSession({
      customerId: dto.customerId,
    });
  }

  @Post("attach-bank")
  @UseGuards(JwtAuthGuard)
  attachBankAccount(@Body() dto: AttachBankAccountDto, @Req() req: any) {
    return this.checkoutService.attachBankAccount({
      userId: req.user.sub,
      financialAccountId: dto.financialConnectionsAccountId,
      bankName: "Unknown",
      last4: "0000",
    });
  }

  @Post("pay-ach")
  @UseGuards(JwtAuthGuard)
  payWithACH(@Body() dto: PayACHDto, @Req() req: any) {
    return this.checkoutService.payWithACH({
      clientId: req.user.sub,
      customerId: dto.customerId,
      paymentMethodId: dto.paymentMethodId,
      projectId: dto.metadata?.projectId || "",
      contractId: dto.metadata?.contractId,
      amount: dto.amount,
    });
  }

  @Get("banks/:customerId")
  @UseGuards(JwtAuthGuard)
  listBankAccounts(@Param("customerId") customerId: string) {
    return this.checkoutService.listBankAccounts(customerId);
  }

  @Post("banks/unlink")
  @UseGuards(JwtAuthGuard)
  unlinkBankAccount(@Body("paymentMethodId") paymentMethodId: string) {
    return this.checkoutService.unlinkBankAccount(paymentMethodId);
  }

  @Post("wire-transfer")
  @UseGuards(JwtAuthGuard)
  initiateWireTransfer(
    @Body()
    body: {
      projectId: string;
      contractId?: string;
      clientId?: string;
      amount: number;
    },
    @Req() req: any,
  ) {
    return this.checkoutService.initiateWireTransfer({
      clientId: req.user.sub || body.clientId,
      projectId: body.projectId,
      contractId: body.contractId,
      amount: body.amount,
    });
  }

  @Post('confirm-wire-initiation')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  confirmWireTransferInitiation(
    @Body() body: { wireTransferId: string },
    @Req() req: any,
  ) {
    return this.checkoutService.confirmWireTransferInitiation({
      wireTransferId: body.wireTransferId,
      clientId: req.user.sub,
    });
  }

  @Post('confirm-wire')
  @UseGuards(JwtAuthGuard, RolesGuard('admin'))
  confirmWireTransfer(@Body() dto: ConfirmWireDto, @Req() req: any) {
    return this.checkoutService.confirmWireTransfer({
      wireTransferId: dto.wireTransferId,
      confirmedBy: req.user.sub || dto.wireConfirmedBy,
    });
  }

  @Post("wallet/topup")
  @UseGuards(JwtAuthGuard)
  async topUpWallet(@Body() dto: WalletTopUpDto, @Req() req: any) {
    const userId = req.user.sub || dto.userId;
    const customer = await this.savedCardsService.getOrCreateCustomer(userId, {
      email: req.user.email,
      name: req.user.name,
    });
    return this.checkoutService.topUpWallet({
      userId,
      customerId: customer.stripeCustomerId,
      amount: dto.amount,
    });
  }

  @Get("wallet/balance")
  @UseGuards(JwtAuthGuard)
  getCreditBalance(@Req() req: any) {
    return this.checkoutService.getCreditBalance(req.user.sub);
  }

  @Post("store-metadata")
  @UseGuards(JwtAuthGuard)
  storeMetadata(@Body() dto: StoreMetadataDto, @Req() req: any) {
    return this.checkoutService.storeMetadata({
      stripeSessionId: dto.sessionId,
      clientId: req.user.sub,
      projectId: dto.metadata.projectId || "",
      amount: dto.metadata.amount || 0,
      paymentMethod: dto.metadata.paymentMethod || "card",
      billingType: dto.metadata.billingType || "one_time",
      ...dto.metadata,
    });
  }

  @Get("cooldown")
  @UseGuards(JwtAuthGuard)
  checkCooldown(@Req() req: any) {
    return this.checkoutService.checkCooldown(req.user.sub);
  }
}
