import { Controller, Get, Post, Query, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SuggestionsService } from './suggestions.service';
import { SuggestDto, AddJobTitleDto } from './dto/suggest.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('suggestions')
export class SuggestionsController {
  constructor(private readonly svc: SuggestionsService) {}

  @Get('job-titles')
  suggest(@Query() dto: SuggestDto) {
    return this.svc.suggest(dto);
  }

  @Get('job-titles/industry/:industry')
  byIndustry(@Param('industry') industry: string) {
    return this.svc.getByIndustry(industry);
  }

  @UseGuards(JwtAuthGuard)
  @Post('job-titles')
  @HttpCode(HttpStatus.CREATED)
  add(@Body() dto: AddJobTitleDto) {
    return this.svc.add(dto);
  }

  @MessagePattern('suggestions.job-titles')
  handleSuggest(@Payload() dto: SuggestDto) {
    return this.svc.suggest(dto);
  }

  @MessagePattern('suggestions.add')
  handleAdd(@Payload() dto: AddJobTitleDto) {
    return this.svc.add(dto);
  }
}
