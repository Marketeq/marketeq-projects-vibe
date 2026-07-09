import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WireTransfer } from '../entities/wire-transfer.entity';
import { CreateWireTransferDto } from '../dto/create-wire-transfer.dto';
import { InvoiceService } from '../services/invoice.service';


@Injectable()
export class WireTransferService {
  constructor(
    @InjectRepository(WireTransfer)
    private readonly wireTransferRepo: Repository<WireTransfer>,
    private readonly invoiceService: InvoiceService,
  ) {}

  async createWireTransferIntent(dto: CreateWireTransferDto): Promise<WireTransfer> {

    // Prevent duplicate wire transfers for same invoice
    const existing = await this.wireTransferRepo.findOne({
      where: { invoiceId: dto.invoiceId },
    });
    if (existing) {
      throw new BadRequestException('Wire transfer already exists for this invoice.');
    }

    if(dto.expectedAmount <= 0){
      throw new BadRequestException('Expected amount must be greater than zero.');
    }


    const invoice = await this.invoiceService.create({
      clientId: dto.clientId,
      amount: dto.expectedAmount,
      paymentMethod: 'wire',
      status: 'PENDING_WIRE',
    });

    const newTransfer = this.wireTransferRepo.create({
      invoiceId: invoice.id,
      clientId: dto.clientId,
      expectedAmount: dto.expectedAmount,
      currency: dto.currency,
      status: 'pending',
      qbInvoiceId: invoice.qbInvoiceId,
    });

    return await this.wireTransferRepo.save(newTransfer);
  }
}