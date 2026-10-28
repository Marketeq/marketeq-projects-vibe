import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CheckoutDraftGatewayService } from './checkout-draft.service';
import { UserId } from './user-id.decorator';

// Both prefixes, because the frontend's base URL is not consistent about the
// `/api` segment (see ClientIpController for the same issue/fix). Registered
// ahead of ProxyController in api-gateway.module.ts so this specific route
// wins over the generic /v1/checkout/* passthrough.
@Controller(['v1/checkout', 'api/v1/checkout'])
export class CheckoutDraftController {
  constructor(private readonly checkoutDraftService: CheckoutDraftGatewayService) {}

  // Guarded so an unauthenticated request fails fast at the gateway with a
  // consistent 401. Once authenticated here, we pass req.user.userId (this
  // gateway's JwtStrategy.validate() names the sub claim "userId", not
  // "sub") down to checkout-service as an explicit clientId instead of
  // forwarding the raw Authorization header — checkout-service now trusts
  // this call via INTERNAL_SERVICE_TOKEN (InternalTokenGuard) rather than
  // re-validating a user JWT itself.
  @Post('cards/setup-intent')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  createCardSetupIntent(@UserId() clientId: string) {
    return this.checkoutDraftService.createCardSetupIntent(clientId);
  }

  @Post('cards')
  @UseGuards(JwtAuthGuard)
  saveCard(@Body() body: Record<string, unknown>, @UserId() clientId: string) {
    return this.checkoutDraftService.saveCard(body, clientId);
  }

  @Get('cards')
  @UseGuards(JwtAuthGuard)
  listCards(@UserId() clientId: string) {
    return this.checkoutDraftService.listCards(clientId);
  }

  @Get('cards/:cardId')
  @UseGuards(JwtAuthGuard)
  getCard(@Param('cardId') cardId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.getCard(cardId, clientId);
  }

  @Patch('cards/:cardId')
  @UseGuards(JwtAuthGuard)
  updateCard(
    @Param('cardId') cardId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.updateCard(cardId, body, clientId);
  }

  @Delete('cards/:cardId')
  @UseGuards(JwtAuthGuard)
  deleteCard(@Param('cardId') cardId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.deleteCard(cardId, clientId);
  }

  @Post('listings/:listingId/draft')
  @UseGuards(JwtAuthGuard)
  createDraft(@Param('listingId') listingId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.createDraft(listingId, clientId);
  }

  @Get('listings/:listingId/draft')
  @UseGuards(JwtAuthGuard)
  getDraft(@Param('listingId') listingId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.getDraft(listingId, clientId);
  }

  @Delete('drafts/:draftId')
  @UseGuards(JwtAuthGuard)
  discardDraft(@Param('draftId') draftId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.discardDraft(draftId, clientId);
  }

  @Get('drafts/:draftId/scope')
  @UseGuards(JwtAuthGuard)
  getDraftScope(@Param('draftId') draftId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.getDraftScope(draftId, clientId);
  }

  @Get('drafts/:draftId/pricing')
  @UseGuards(JwtAuthGuard)
  getDraftPricing(@Param('draftId') draftId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.getDraftPricing(draftId, clientId);
  }

  @Get('drafts/:draftId/team')
  @UseGuards(JwtAuthGuard)
  getDraftTeam(@Param('draftId') draftId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.getDraftTeam(draftId, clientId);
  }

  @Get('session/:sessionId')
  @UseGuards(JwtAuthGuard)
  getCheckoutSession(@Param('sessionId') sessionId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.getCheckoutSession(sessionId, clientId);
  }

  @Get('session/:sessionId/payment-methods')
  @UseGuards(JwtAuthGuard)
  getSessionPaymentMethods(
    @Param('sessionId') sessionId: string,
    @Query('balanceApplied') balanceApplied: string | undefined,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.getSessionPaymentMethods(sessionId, clientId, balanceApplied);
  }

  @Put('session/:sessionId/payment/selection')
  @UseGuards(JwtAuthGuard)
  setSessionPaymentSelection(
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.setSessionPaymentSelection(sessionId, body, clientId);
  }

  @Put('session/:sessionId/balance')
  @UseGuards(JwtAuthGuard)
  setSessionBalanceApplied(
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.setSessionBalanceApplied(sessionId, body, clientId);
  }

  @Post('session/:sessionId/payment/submit')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  submitSessionPayment(@Param('sessionId') sessionId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.submitSessionPayment(sessionId, clientId);
  }

  @Delete('session/:sessionId/payment/selection')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  clearSessionPaymentSelection(@Param('sessionId') sessionId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.clearSessionPaymentSelection(sessionId, clientId);
  }

  @Post('session/:sessionId/apply-code')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  applySessionCode(
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.applySessionCode(sessionId, body, clientId);
  }

  @Delete('session/:sessionId/apply-code/:code')
  @UseGuards(JwtAuthGuard)
  removeSessionCode(
    @Param('sessionId') sessionId: string,
    @Param('code') code: string,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.removeSessionCode(sessionId, code, clientId);
  }

  @Post('drafts/:draftId/create-session')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  createDraftSession(
    @Param('draftId') draftId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.createDraftSession(draftId, body, clientId);
  }

  @Post('drafts/:draftId/phases')
  @UseGuards(JwtAuthGuard)
  addDraftPhase(
    @Param('draftId') draftId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.addDraftPhase(draftId, body, clientId);
  }

  @Post('drafts/:draftId/team/replace-member')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  replaceDraftMember(
    @Param('draftId') draftId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.replaceDraftMember(draftId, body, clientId);
  }

  @Post('drafts/:draftId/team/update-role')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  updateDraftRole(
    @Param('draftId') draftId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.updateDraftRole(draftId, body, clientId);
  }

  @Post('drafts/:draftId/team/remove-member')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  removeDraftMemberAndTasks(
    @Param('draftId') draftId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.removeDraftMemberAndTasks(draftId, body, clientId);
  }

  @Delete('drafts/:draftId/team/:userId')
  @UseGuards(JwtAuthGuard)
  removeDraftMember(
    @Param('draftId') draftId: string,
    @Param('userId') userId: string,
    @Query('version') version: string,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.removeDraftMember(draftId, userId, version, clientId);
  }

  @Post('drafts/:draftId/apply-code')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  applyDraftCode(
    @Param('draftId') draftId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.applyDraftCode(draftId, body, clientId);
  }

  @Delete('drafts/:draftId/apply-code/:code')
  @UseGuards(JwtAuthGuard)
  removeDraftCode(
    @Param('draftId') draftId: string,
    @Param('code') code: string,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.removeDraftCode(draftId, code, clientId);
  }

  @Post('drafts/:draftId/phases/:phaseId/duplicate')
  @UseGuards(JwtAuthGuard)
  duplicateDraftPhase(
    @Param('draftId') draftId: string,
    @Param('phaseId') phaseId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.duplicateDraftPhase(draftId, phaseId, body, clientId);
  }

  @Patch('drafts/:draftId/phases/:phaseId')
  @UseGuards(JwtAuthGuard)
  updateDraftPhase(
    @Param('draftId') draftId: string,
    @Param('phaseId') phaseId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.updateDraftPhase(draftId, phaseId, body, clientId);
  }

  @Delete('drafts/:draftId/phases/:phaseId')
  @UseGuards(JwtAuthGuard)
  deleteDraftPhase(
    @Param('draftId') draftId: string,
    @Param('phaseId') phaseId: string,
    @Query('version') version: string,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.deleteDraftPhase(draftId, phaseId, version, clientId);
  }

  @Post('drafts/:draftId/phases/:phaseId/tasks')
  @UseGuards(JwtAuthGuard)
  addDraftTask(
    @Param('draftId') draftId: string,
    @Param('phaseId') phaseId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.addDraftTask(draftId, phaseId, body, clientId);
  }

  @Patch('drafts/:draftId/tasks/:taskId')
  @UseGuards(JwtAuthGuard)
  updateDraftTask(
    @Param('draftId') draftId: string,
    @Param('taskId') taskId: string,
    @Body() body: Record<string, unknown>,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.updateDraftTask(draftId, taskId, body, clientId);
  }

  @Delete('drafts/:draftId/tasks/:taskId')
  @UseGuards(JwtAuthGuard)
  deleteDraftTask(
    @Param('draftId') draftId: string,
    @Param('taskId') taskId: string,
    @Query('version') version: string,
    @UserId() clientId: string,
  ) {
    return this.checkoutDraftService.deleteDraftTask(draftId, taskId, version, clientId);
  }

  @Get('listings/:listingId/summary')
  @UseGuards(JwtAuthGuard)
  getListingSummary(@Param('listingId') listingId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.getListingSummary(listingId, clientId);
  }
}
