import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { RecentlyViewedService } from './recently-viewed.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';

@Controller('v1/recently-viewed')
export class RecentlyViewedController {
  constructor(private readonly service: RecentlyViewedService) {}

  @Post(':projectId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  trackView(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.service.trackView(userId, projectId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getRecentlyViewed(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.service.getRecentlyViewed(userId, limit ? parseInt(limit, 10) : 9);
  }

  @Get('recommended')
  @UseGuards(JwtAuthGuard)
  getRecommended(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user?.sub ?? req.user?.id ?? req.user?.userId;
    return this.service.getRecommended(userId, limit ? parseInt(limit, 10) : 8);
  }
}
