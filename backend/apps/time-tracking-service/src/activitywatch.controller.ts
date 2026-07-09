import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ActivityWatchService } from './activitywatch.service';
import { IngestActivityWatchEventsDto } from './dtos/ingest-activitywatch-events.dto';
import { QueryActivityWatchEventsDto } from './dtos/query-activitywatch-events.dto';
import { IdParamDto } from './dtos/id-param.dto';
import { ScanActivityDto } from './dtos/scan-activity.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('activitywatch')
export class ActivityWatchController {
  constructor(private readonly svc: ActivityWatchService) {}

  @UseGuards(JwtAuthGuard)
  @Get('info')       info()                                               { return this.svc.info(); }

  @Get('healthz')    health()                                             { return this.svc.getHealth(); }

  @UseGuards(JwtAuthGuard)
  @Post('events')    ingest(@Body() body: IngestActivityWatchEventsDto, @Req() req: any) { return this.svc.ingest(body, req.user.sub); }

  @UseGuards(JwtAuthGuard)
  @Get('events')     list(@Query() q: QueryActivityWatchEventsDto, @Req() req: any)      { return this.svc.findMany(q, req.user.sub, req.user.role === 'admin'); }

  @UseGuards(JwtAuthGuard)
  @Get('events/:id') getById(@Param() params: IdParamDto)                                { return this.svc.findById(params.id); }

  @UseGuards(JwtAuthGuard)
  @Get('fraud/scan') scan(@Query() q: ScanActivityDto, @Req() req: any)                  { return this.svc.scanForAnomalies(q, req.user.sub, req.user.role === 'admin'); }
}
