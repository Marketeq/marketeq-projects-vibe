import { Body, Controller, Post } from '@nestjs/common';
import { WireTransferService } from '../services/wire-transfer.service';
import { CreateWireTransferDto } from '../dto/create-wire-transfer.dto';

@Controller('wire-transfer')
export class WireTransferController {
  constructor(private readonly wireTransferService: WireTransferService) {}

  @Post()
  async initiateWireTransfer(@Body() dto: CreateWireTransferDto) {
    const record = await this.wireTransferService.createWireTransferIntent(dto);
    return {
      transferId: record.id,
      status: record.status,
      invoiceId: record.invoiceId,
      message: 'Wire transfer record created and pending confirmation.',
    };
  }
} 

/* import { Body, Controller, Post } from '@nestjs/common';
import { WireTransferService } from '../services/wire-transfer.service';
import { CreateWireTransferDto } from '../dto/create-wire-transfer.dto';
import { NotificationService } from '../../services/notification.service';

@Controller('wire-transfer')
export class WireTransferController {
  constructor(
    private readonly wireTransferService: WireTransferService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post()
  async initiateWireTransfer(@Body() dto: CreateWireTransferDto) {
    const record = await this.wireTransferService.createWireTransferIntent(dto);

    // Send client wire instructions
    await this.notificationService.sendEmail({
      to: dto.clientId, // assumed to be email-resolvable via service
      subject: 'Wire Transfer Instructions for Your Marketeq Payment',
      template: 'wire-transfer-instructions', // use template ID if applicable
      context: {
        amount: dto.expectedAmount,
        currency: dto.currency,
        reference: dto.invoiceId,
        bankName: 'Mercury',
        routingNumber: process.env.MERCURY_ROUTING_NUMBER,
        accountNumber: process.env.MERCURY_ACCOUNT_NUMBER,
        accountName: 'Marketeq Digital LLC'
      },
    });

    return {
      transferId: record.id,
      status: record.status,
      invoiceId: record.invoiceId,
      message: 'Wire transfer record created and pending confirmation.',
    };
  }
} */
