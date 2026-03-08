import {
  Controller, Post, Get, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ModerationService } from './moderation.service';
import { ModerateContentDto, ModerateMediaDto, ReviewContentDto, LogsQueryDto, AddKeywordDto } from './dto/moderation.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('moderate')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly svc: ModerationService) {}

  @Post('content')
  moderateContent(@Body() dto: ModerateContentDto) {
    return this.svc.moderateContent(dto);
  }

  @Post('media')
  moderateMedia(@Body() dto: ModerateMediaDto) {
    return this.svc.moderateMedia(dto);
  }

  @Post('content/:id/approve')
  approve(@Param('id') id: string, @Body() dto: ReviewContentDto) {
    return this.svc.approve(id, dto);
  }

  @Post('content/:id/reject')
  reject(@Param('id') id: string, @Body() dto: ReviewContentDto) {
    return this.svc.reject(id, dto);
  }

  @Get('logs')
  getLogs(@Query() query: LogsQueryDto) {
    return this.svc.getLogs(query);
  }

  @Post('keywords')
  @HttpCode(HttpStatus.CREATED)
  addKeyword(@Body() dto: AddKeywordDto) {
    return this.svc.addKeyword(dto);
  }

  @Get('keywords')
  getKeywords() {
    return this.svc.getKeywords();
  }

  @Delete('keywords/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeKeyword(@Param('id') id: string) {
    return this.svc.removeKeyword(id);
  }

  // RabbitMQ
  @MessagePattern('moderation.content')
  handleContent(@Payload() dto: ModerateContentDto) {
    return this.svc.moderateContent(dto);
  }

  @MessagePattern('moderation.media')
  handleMedia(@Payload() dto: ModerateMediaDto) {
    return this.svc.moderateMedia(dto);
  }
}
