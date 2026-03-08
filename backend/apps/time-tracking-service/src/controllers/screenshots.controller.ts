import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MachineAuthGuard } from '../guards/machine-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ScreenshotsService } from '../services/screenshots.service';
import { EventsService } from '../services/events.service';
import { CreateScreenshotDto } from '../dtos/create-screenshot.dto';
import { ScreenshotQueryDto } from '../dtos/screenshot-query.dto';
import {
  BatchUpdateScreenshotDto,
  DeleteScreenshotDto,
  UpdateScreenshotMetaDto,
} from '../dtos/update-screenshot.dto';

@Controller('screenshots')
export class ScreenshotsController {
  constructor(
    private readonly screenshotsService: ScreenshotsService,
    private readonly eventsService: EventsService,
  ) {}

  /** Desktop agent uploads screenshot metadata (machine-to-machine) */
  @Post()
  @UseGuards(MachineAuthGuard)
  async create(@Body() dto: CreateScreenshotDto) {
    return this.screenshotsService.create(dto);
  }

  /** Paginated screenshot cards for authenticated user */
  @Get('cards')
  @UseGuards(JwtAuthGuard)
  async getCards(@Req() req: any, @Query() query: ScreenshotQueryDto) {
    return this.screenshotsService.findCards(req.user.sub, query);
  }

  /** Detail view for a single screenshot */
  @Get(':id/detail')
  @UseGuards(JwtAuthGuard)
  async getDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.screenshotsService.findDetail(id, req.user.sub, req.user.role);
  }

  /** Get all screenshots in a multi-monitor group */
  @Get('group/:groupKey')
  @UseGuards(JwtAuthGuard)
  async getGroup(
    @Param('groupKey') groupKey: string,
    @Req() req: any,
  ) {
    return this.screenshotsService.findGrouped(groupKey, req.user.sub, req.user.role);
  }

  /** Update project/task on a single screenshot */
  @Patch(':id/meta')
  @UseGuards(JwtAuthGuard)
  async updateMeta(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: UpdateScreenshotMetaDto,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.screenshotsService.updateMeta(id, req.user.sub, req.user.role, dto, scopeId);
  }

  /** Batch update project/task on multiple screenshots */
  @Patch('batch/meta')
  @UseGuards(JwtAuthGuard)
  async batchUpdateMeta(
    @Req() req: any,
    @Body() dto: BatchUpdateScreenshotDto,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.screenshotsService.batchUpdateMeta(req.user.sub, req.user.role, dto, scopeId);
  }

  /** Soft-delete a screenshot */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: DeleteScreenshotDto,
    @Query('scopeId') scopeId?: string,
  ) {
    const screenshot = await this.screenshotsService.softDelete(
      id,
      req.user.sub,
      req.user.role,
      dto,
      scopeId,
    );
    this.eventsService.screenshotDeleted(screenshot.id, req.user.sub, dto.reason ?? null);
    return screenshot;
  }

  /** Blur a screenshot */
  @Patch(':id/blur')
  @UseGuards(JwtAuthGuard)
  async blur(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Query('scopeId') scopeId?: string,
  ) {
    return this.screenshotsService.blur(id, req.user.sub, req.user.role, scopeId);
  }

  /** Admin: list all screenshots across all users */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard('admin'))
  async adminListAll(@Query() query: ScreenshotQueryDto) {
    return this.screenshotsService.adminFindCards(query);
  }
}
