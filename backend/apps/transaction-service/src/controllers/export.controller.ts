import { Controller, Get, Res, UseGuards, Req } from '@nestjs/common'
import { Response } from 'express'
import { ExportService } from '../services/export.service'
import { JwtAuthGuard } from '../guards/jwt-auth.guard'

@Controller('v1/export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly svc: ExportService) {}

  @Get('transactions')
  async exportTransactions(@Req() req: any, @Res() res: Response) {
    const csv = await this.svc.exportTransactionsCsv(req.user.userId)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"')
    res.send(csv)
  }

  @Get('invoices')
  async exportInvoices(@Req() req: any, @Res() res: Response) {
    const csv = await this.svc.exportInvoicesCsv(req.user.userId)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="invoices.csv"')
    res.send(csv)
  }
}
