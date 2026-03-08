import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common'
import { InvoiceService } from '../services/invoice.service'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'
import { InvoiceFilterDto } from '../dto/filter.dto'

@Controller('v1/invoices')
@UseGuards(JwtAuthGuard)
export class InvoiceController {
  constructor(private readonly svc: InvoiceService) {}

  @Get()
  list(@Req() req: any, @Query() filter: InvoiceFilterDto) {
    return this.svc.findAll(req.user.userId, filter)
  }

  @Get(':id')
  detail(@Req() req: any, @Param('id') id: string) {
    return this.svc.findOne(req.user.userId, id)
  }
}
