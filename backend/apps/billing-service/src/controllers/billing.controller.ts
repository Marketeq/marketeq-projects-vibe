import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BillingService } from '../services/billing.service';
import { CreateSubscriptionDto } from '../dtos/create-subscription.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly svc: BillingService) {}

  @Post('subscriptions')
  createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.svc.createSubscription(dto);
  }

  @Get('subscriptions/:id')
  getSubscription(@Param('id') id: string) {
    return this.svc.getSubscription(id);
  }

  @Get('invoices/contract/:contractId')
  getInvoicesByContract(@Param('contractId') contractId: string) {
    return this.svc.getInvoicesByContract(contractId);
  }

  @Get('invoices/group/:groupId')
  getInvoicesByGroup(@Param('groupId') groupId: string) {
    return this.svc.getInvoicesByGroup(groupId);
  }

  // RabbitMQ consumers
  @MessagePattern('contract.group.activated')
  handleGroupActivated(@Payload() data: { data: { groupId: string; clientId: string } }) {
    return this.svc.handleGroupActivated(data.data);
  }

  @MessagePattern('contract.ended')
  handleContractEnded(@Payload() data: { data: { contractId: string; groupId: string; clientId: string; talentId: string } }) {
    return this.svc.handleContractEnded(data.data);
  }
}
