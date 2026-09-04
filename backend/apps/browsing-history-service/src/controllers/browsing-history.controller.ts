import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BrowsingHistoryService } from '../services/browsing-history.service';
import {
  ListBrowsingHistoryQueryDto,
  RecordViewDto,
  RemoveBrowsingHistoryParamDto,
} from '../dto/browsing-history.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { User } from '../decorators/user.decorator';

@Controller('browsing-history')
@UseGuards(JwtAuthGuard)
export class BrowsingHistoryController {
  constructor(private readonly svc: BrowsingHistoryService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  recordView(@Body() dto: RecordViewDto, @User() user: any) {
    return this.svc.recordView(user.sub ?? user.id, dto);
  }

  @Get()
  findAll(@Query() query: ListBrowsingHistoryQueryDto, @User() user: any) {
    return this.svc.listHistory(user.sub ?? user.id, query);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeOne(@Param() params: RemoveBrowsingHistoryParamDto, @User() user: any) {
    return this.svc.removeOne(user.sub ?? user.id, params.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clearAll(@User() user: any) {
    return this.svc.clearAll(user.sub ?? user.id);
  }
}
