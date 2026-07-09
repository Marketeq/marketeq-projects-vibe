import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
    Req,
    Post,
    Body,
    Res,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { JwtAuthGuard } from '../guards/jwt-auth.guard';
  import { TransactionService } from '../services/transaction.service';
  import { ExportService } from '../services/export.service';
  
  import { TransactionFilterDto } from '../dto/filter.dto';
  import { ReportTransactionDto } from '../dto/transaction.dto';
  import { ExportRequestDto } from '../dto/export.dto';
  
  import { Request, Response } from 'express';
  
  @Controller('transactions')
  @UseGuards(JwtAuthGuard)
  export class TransactionController {
    constructor(
      private readonly transactionService: TransactionService,
      private readonly exportService: ExportService,
    ) {}
  
    // ── 3.1 List transactions ──────────────────────────────────────────
    @Get()
    async list(
      @Query() filters: TransactionFilterDto,
      @Req() req: Request,
    ) {
      const userId = (req.user as any).userId;
      return this.transactionService.findAll(userId, filters);
    }
  
    // ── 3.2 Single transaction detail ──────────────────────────────────
    @Get(':id')
    async detail(
      @Param('id') id: string,
      @Req() req: Request,
    ) {
      const userId = (req.user as any).userId;
      return this.transactionService.findOne(id, userId);
    }
  
    // ── 3.3 Download receipt ───────────────────────────────────────────
    @Get(':id/receipt')
    async receipt(
      @Param('id') id: string,
      @Req() req: Request,
      @Res() res: Response,
    ) {
      const userId = (req.user as any).userId;
  
      const { buffer, filename } =
        await this.transactionService.getReceipt(id, userId);
  
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
  
      res.send(buffer);
    }
  
    // ── 3.6 Export ─────────────────────────────────────────────────────
    @Post('export')
    @HttpCode(HttpStatus.ACCEPTED)
    async export(
      @Body() dto: ExportRequestDto,
      @Req() req: Request,
    ) {
      const userId = (req.user as any).userId;
      return this.exportService.triggerExport(userId, dto);
    }
  
    // ── 3.7 Rate averages (consumed by pricing-service) ────────────────
    @Get('rate-averages')
    async rateAverages(
      @Query('sinceDate') sinceDate?: string,
    ) {
      return this.transactionService.getRateAverages(sinceDate);
    }

    // ── 3.8 Report a problem ───────────────────────────────────────────
    @Post(':id/report')
    @HttpCode(HttpStatus.CREATED)
    async report(
      @Param('id') id: string,
      @Body() dto: ReportTransactionDto,
      @Req() req: Request,
    ) {
      const userId = (req.user as any).userId;
      return this.transactionService.submitReport(id, userId, dto);
    }
  }