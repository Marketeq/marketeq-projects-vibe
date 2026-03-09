import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ActivityWatchService } from './activitywatch.service';
import { IngestActivityWatchEventsDto } from './dto/ingest-activitywatch-events.dto';
import { QueryActivityWatchEventsDto } from './dto/query-activitywatch-events.dto';
import { IdParamDto } from './dto/id-param.dto';
import { ScanActivityDto } from './dto/scan-activity.dto';

@Controller('activitywatch')
export class ActivityWatchController {
  constructor(private readonly svc: ActivityWatchService) {}

  @Get('info')       info()                                               { return this.svc.info(); }
  @Get('healthz')    health()                                             { return this.svc.getHealth(); }
  @Post('events')    ingest(@Body() body: IngestActivityWatchEventsDto)   { return this.svc.ingest(body); }
  @Get('events')     list(@Query() q: QueryActivityWatchEventsDto)        { return this.svc.findMany(q); }
  @Get('events/:id') getById(@Param() params: IdParamDto)                 { return this.svc.findById(params.id); }
  @Get('fraud/scan') scan(@Query() q: ScanActivityDto)                    { return this.svc.scanForAnomalies(q); }
}
