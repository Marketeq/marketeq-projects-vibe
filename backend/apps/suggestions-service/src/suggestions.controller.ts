import { Controller, Get, Post, Query, Body, Param, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SuggestionsService } from './suggestions.service';
import { SuggestDto, AddJobTitleDto } from './dto/suggest.dto';

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

  @Post('job-titles')
  @HttpCode(HttpStatus.CREATED)
  async add(@Body() dto: AddJobTitleDto) {
    try {
      return await this.svc.add(dto);
    } catch {
      throw new BadRequestException('Invalid job title');
    }
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
