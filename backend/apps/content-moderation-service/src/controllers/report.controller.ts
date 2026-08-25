import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ModerationReportService } from '../services/report.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@Controller('api/reports')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ReportController {
  constructor(private readonly reportService: ModerationReportService) {}

  @Get('violation-summary')
  async getViolationSummary(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.generateViolationSummary(startDate, endDate);
  }

  @Get('efficiency')
  async getEfficiencyReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.generateEfficiencyReport(startDate, endDate);
  }

  @Get('content-type-breakdown')
  async getContentTypeBreakdown(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportService.getContentTypBreakdown(startDate, endDate);
  }
}
