import { Controller, Get, Post, Put, Delete, Param, Body, Query, Req, Inject } from '@nestjs/common';
import { Request } from 'express';
import { Type } from 'class-transformer';
import { IsDate, IsISO8601, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ManualTimeService } from './manual-time.service';

function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) ?? '';
}

/** ---------- DTOs ---------- */
export class ListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}

export class CreateManualDto {
  @Type(() => Date)
  @IsISO8601()
  startAt!: Date;

  @Type(() => Date)
  @IsISO8601()
  endAt!: Date;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsUUID()
  taskId?: string | null;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateManualDto {
  @IsOptional()
  @Type(() => Date)
  @IsISO8601()
  startAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsISO8601()
  endAt?: Date;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsUUID()
  taskId?: string | null;

  @IsOptional()
  @IsString()
  note?: string;
}

export class DeleteManualDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

/** ---------- Controller ---------- */
@Controller('manual-time')
export class ManualTimeController {
  constructor(@Inject(ManualTimeService) private readonly svc: ManualTimeService) {}

  @Get('ping')
  ping() {
    return { ok: true };
  }

  @Get()
  async list(@Req() req: Request, @Query() query: ListQueryDto) {
    const userId = getUserId(req);
    return this.svc.list(userId, {
      limit: query.limit ?? 50,
      dateFrom: query.from,
      dateTo: query.to,
    });
  }

  @Post()
  async create(@Req() req: Request, @Body() body: CreateManualDto) {
    const userId = getUserId(req);
    return this.svc.create(userId, body);
  }

  @Put(':id')
  async update(@Req() req: Request, @Param('id') id: string, @Body() body: UpdateManualDto) {
    const userId = getUserId(req);
    return this.svc.update(id, userId, body);
  }

  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string, @Body() body: DeleteManualDto) {
    const userId = getUserId(req);
    return this.svc.remove(id, userId, body?.reason);
  }
}
