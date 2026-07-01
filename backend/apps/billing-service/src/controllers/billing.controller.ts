import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BillingService } from '../services/billing.service';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('billing')
export class BillingController {
  constructor(private readonly svc: BillingService) {}

  // --- Subscription endpoints ---

  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
  createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.svc.createSubscription(dto);
  }

  @Get('subscriptions/:id')
  @UseGuards(JwtAuthGuard)
  getSubscription(@Param('id') id: string) {
    return this.svc.getSubscription(id);
  }

  @Get('subscriptions/group/:groupId')
  @UseGuards(JwtAuthGuard)
  getSubscriptionsByGroup(@Param('groupId') groupId: string) {
    return this.svc.getSubscriptionsByGroup(groupId);
  }

  @Get('subscriptions/client/:clientId')
  @UseGuards(JwtAuthGuard)
  getSubscriptionsByClient(@Param('clientId') clientId: string) {
    return this.svc.getSubscriptionsByClient(clientId);
  }

  @Post('subscriptions/cancel/:groupId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancelSubscription(@Param('groupId') groupId: string) {
    return this.svc.cancelSubscription(groupId);
  }

  @Post('subscriptions/pause/:groupId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  pauseSubscription(
    @Param('groupId') groupId: string,
    @Body('reason') reason: string,
  ) {
    return this.svc.pauseSubscription(groupId, reason || 'manual_pause');
  }

  @Post('subscriptions/resume/:groupId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  resumeSubscription(@Param('groupId') groupId: string) {
    return this.svc.resumeSubscription(groupId);
  }

  // --- Invoice endpoints ---

  @Get('invoices/:id')
  @UseGuards(JwtAuthGuard)
  getInvoice(@Param('id') id: string) {
    return this.svc.getInvoice(id);
  }

  @Get('invoices/contract/:contractId')
  @UseGuards(JwtAuthGuard)
  getInvoicesByContract(@Param('contractId') contractId: string) {
    return this.svc.getInvoicesByContract(contractId);
  }

  @Get('invoices/group/:groupId')
  @UseGuards(JwtAuthGuard)
  getInvoicesByGroup(@Param('groupId') groupId: string) {
    return this.svc.getInvoicesByGroup(groupId);
  }

  // --- Refund ---

  @Post('invoices/:id/refund')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  refundInvoice(
    @Param('id') id: string,
    @Body('amountCents') amountCents?: number,
  ) {
    return this.svc.refundInvoice(id, amountCents);
  }

  // --- Retry logs ---

  @Get('invoices/:id/retries')
  @UseGuards(JwtAuthGuard)
  getRetryLogs(@Param('id') id: string) {
    return this.svc.getRetryLogs(id);
  }

  // --- Health ---

  @Get('/health')
  health() {
    return { status: 'ok', service: 'billing-service', timestamp: new Date().toISOString() };
  }

  // --- RabbitMQ consumers ---

  @MessagePattern('contract.group.activated')
  handleGroupActivated(@Payload() data: { data: { groupId: string; clientId: string } }) {
    return this.svc.handleGroupActivated(data.data);
  }

  @MessagePattern('contract.ended')
  handleContractEnded(@Payload() data: { data: { contractId: string; groupId: string; clientId: string; talentId: string } }) {
    return this.svc.handleContractEnded(data.data);
  }

  @MessagePattern('billing.cancel')
  handleCancelSubscription(@Payload() data: { data: { groupId: string } }) {
    return this.svc.cancelSubscription(data.data.groupId);
  }

  @MessagePattern('billing.pause')
  handlePauseSubscription(@Payload() data: { data: { groupId: string; reason: string } }) {
    return this.svc.pauseSubscription(data.data.groupId, data.data.reason);
  }

  @MessagePattern('billing.resume')
  handleResumeSubscription(@Payload() data: { data: { groupId: string } }) {
    return this.svc.resumeSubscription(data.data.groupId);
  }
}
