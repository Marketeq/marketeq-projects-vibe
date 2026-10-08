import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
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
  getListingSummary(@Param('listingId') listingId: string, @Req() req: any) {
    return this.checkoutDraftService.getListingSummary(listingId, req.user.userId);
  getListingSummary(@Param('listingId') listingId: string, @Req() req: Request) {
    const clientId = (req as any).user?.userId as string;

  getListingSummary(@Param('listingId') listingId: string, @UserId() clientId: string) {
    return this.checkoutDraftService.getListingSummary(listingId, clientId);
  }
}
