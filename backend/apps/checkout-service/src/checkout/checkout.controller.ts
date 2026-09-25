import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Headers,
  UseGuards,
} from "@nestjs/common";
import { CheckoutService } from "./checkout.service";
import { CheckoutDraftService } from "./checkout-draft.service";
import { StripeService } from "../stripe/stripe.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Request } from "express";

import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { FindOrCreateDraftDto } from './dto/find-or-create-draft.dto';
import { ApplyGiftCardDto } from './dto/apply-gift-card.dto';
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

@Controller("v1/checkout")
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly stripeService: StripeService,
    private readonly checkoutDraftService: CheckoutDraftService,
  ) {}

  // ─── Checkout draft (read-only for now — seeded once, never edited) ──

  @Post("drafts/find-or-create")
  @UseGuards(JwtAuthGuard)
  findOrCreateDraft(@Body() dto: FindOrCreateDraftDto, @Req() req: any) {
    return this.checkoutDraftService.findOrCreate(req.user.sub, dto.listingId, {
      phases: dto.phases,
      projectCost: dto.projectCost,
    });
  }

  // Internal gateway-to-service call — the gateway already authenticated
  // the user via JwtAuthGuard and passes clientId in the body.
  @Post("drafts/find-or-create-internal")
  findOrCreateDraftInternal(@Body() dto: FindOrCreateDraftDto & { clientId: string }) {
    return this.checkoutDraftService.findOrCreate(dto.clientId, dto.listingId, {
      phases: dto.phases,
      projectCost: dto.projectCost,
    });
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

  @Post("apply-giftcard")
  @UseGuards(JwtAuthGuard)
  applyGiftCard(@Body() dto: ApplyGiftCardDto) {
    return this.checkoutService.applyGiftCard(dto.code);
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
  createPaymentIntent(@Body() dto: CreatePaymentIntentDto, @Req() req: any) {
    return this.checkoutService.createCardPaymentIntent({
      clientId: req.user.sub,
      customerId: req.user.stripeCustomerId,
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
    await this.checkoutService.handleWebhookEvent(event as any);
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
  createSubscription(@Body() dto: CreateSubscriptionDto, @Req() req: any) {
    return this.checkoutService.createSubscription({
      clientId: req.user.sub || dto.clientId,
      customerId: req.user.stripeCustomerId || dto.clientId,
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
  topUpWallet(@Body() dto: WalletTopUpDto, @Req() req: any) {
    return this.checkoutService.topUpWallet({
      userId: req.user.sub || dto.userId,
      customerId: req.user.stripeCustomerId || req.user.sub,
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
