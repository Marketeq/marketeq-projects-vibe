import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response }     from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../guards/current-user.decorator';
import { ExportService, ExportQueryDto } from './export.service';

import { Param, ParseUUIDPipe, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EarningsCache } from '../entities/earnings-cache.entity';
import { Repository } from 'typeorm';

@Controller('earnings/export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(
    private readonly exportSvc: ExportService,
    @InjectRepository(EarningsCache) private readonly ecRepo: Repository<EarningsCache>,
  ) {}

  @Get()
  async export(
    @CurrentUser() user: any, @Res() res: Response, @Query() query: ExportQueryDto,
  ): Promise<void> {
    if (query.format && !['csv','pdf'].includes(query.format)) {
      res.status(400).json({ statusCode: 400, message: 'format must be csv or pdf' });
      return;
    }
    if (!query.currency) query.currency = 'USD';
    if (!query.format) query.format = 'csv';
    await this.exportSvc.export(user.id, query, res);
  }

  @Get(':id')
  async exportById(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
    @Query('format') format?: string,
    @Query('currency') currency?: string,
  ) {
    // Find earning and check ownership
    const earning = await this.ecRepo.findOne({ where: { id } });
    if (!earning) throw new NotFoundException('Earning not found');
    if (earning.contractorId !== user.id) throw new NotFoundException('Earning not found');

    // Format checks
    const fmt = format && ['csv', 'pdf'].includes(format) ? format : 'csv';
    const curr = currency || earning.currency || 'USD';

    // Build export for just this earning
    const rows = [earning];
    const labels = new Map();
    const dispAmts = new Map([[earning.id, earning.netAmount]]);
    const exportedAt = new Date();
    const filename = `earning-${earning.id}.${fmt}`;
    let buffer: Buffer;
    if (fmt === 'pdf') {
      buffer = await (await import('./pdf.builder')).buildPdf({
        rows, labels, displayCurrency: curr, displayAmounts: dispAmts, dateRangeLabel: '', exportedAt
      });
    } else {
      buffer = (await import('./csv.builder')).buildCsv({
        rows, labels, displayCurrency: curr, displayAmounts: dispAmts, exportedAt
      });
    }
    const contentType = fmt === 'pdf' ? 'application/pdf' : 'text/csv';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-Export-Mode', 'single');
    res.status(200).end(buffer);
  }
}
