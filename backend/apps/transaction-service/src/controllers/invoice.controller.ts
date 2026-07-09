import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { InvoiceService } from '../services/invoice.service';
import { InvoiceFilterDto } from '../dto/filter.dto';
import { Request } from 'express';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  async list(
    @Query() filters: InvoiceFilterDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.invoiceService.findAll(userId, filters);
  }

  @Get(':id')
  async detail(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userId = (req.user as any).userId;
    return this.invoiceService.findOne(id, userId);
  }
}