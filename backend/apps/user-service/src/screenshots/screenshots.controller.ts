import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Req,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { ScreenshotsService } from './screenshots.service';
import { Request } from 'express';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

class ListQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsString()
  app?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

class BlurDto {
  @IsBoolean()
  blurred!: boolean;
}

class DeleteDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) ?? '';
}

@Controller('screenshots')
export class ScreenshotsController {
  // Explicit injection + assignment prevents svc being undefined in bundled builds
  private readonly svc: ScreenshotsService;
  constructor(@Inject(ScreenshotsService) svc: ScreenshotsService) {
    this.svc = svc;
  }

  @Get('ping')
  ping() {
    return { ok: true };
  }

  @Get()
  async list(@Req() req: Request, @Query() query: ListQueryDto) {
    const userId = getUserId(req);
    if (!userId) throw new BadRequestException('x-user-id header required');

    const opts: any = { limit: query.limit ?? 50 };
    if (query.app) opts.app = query.app;
    if (query.dateFrom) opts.dateFrom = new Date(query.dateFrom);
    if (query.dateTo) opts.dateTo = new Date(query.dateTo);

    return this.svc.list(userId, opts);
  }

  @Put(':id/blur')
  async setBlur(@Req() req: Request, @Param('id') id: string, @Body() body: BlurDto) {
    const userId = getUserId(req);
    if (!userId) throw new BadRequestException('x-user-id header required');
    if (typeof body.blurred !== 'boolean') {
      throw new BadRequestException('blurred must be true or false');
    }
    return this.svc.blur(id, userId, body.blurred);
  }

  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string, @Body() body: DeleteDto) {
    const userId = getUserId(req);
    if (!userId) throw new BadRequestException('x-user-id header required');
    if (!body?.reason) {
      throw new BadRequestException('Reason is required');
    }
    return this.svc.remove(id, userId, body.reason);
  }
}
