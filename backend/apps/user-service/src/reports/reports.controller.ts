import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportDto } from './dto/report.dto';

@ApiTags('reports')
@Controller('users')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({ summary: 'Report a user' })
  @ApiCreatedResponse({ type: ReportDto })
  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  report(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.report(user.sub, id, dto);
  }
}
