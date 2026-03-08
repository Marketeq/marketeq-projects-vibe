import {
  Controller, Get, Post, Patch, Query, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AutocompleteService } from './autocomplete.service';
import { SubmitAutocompleteDto } from './dto/submit-autocomplete.dto';
import { ReviewAutocompleteDto } from './dto/review-autocomplete.dto';
import { QueryAutocompleteDto } from './dto/query-autocomplete.dto';
import { EntryType } from './entities/autocomplete-entry.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('autocomplete')
export class AutocompleteController {
  constructor(private readonly svc: AutocompleteService) {}

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  submit(@Body() dto: SubmitAutocompleteDto) {
    return this.svc.submit(dto);
  }

  @Get('search')
  search(@Query() dto: QueryAutocompleteDto) {
    return this.svc.query(dto);
  }

  @Get(':type')
  getByType(@Param('type') type: EntryType) {
    return this.svc.getByType(type);
  }

  @Get('meta/category-map')
  getCategoryMap() {
    return this.svc.getCategoryMap();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('review')
  review(@Body() dto: ReviewAutocompleteDto) {
    return this.svc.review(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('review/pending')
  getPending() {
    return this.svc.getPendingReview();
  }

  // RabbitMQ message patterns for inter-service use
  @MessagePattern('autocomplete.submit')
  handleSubmit(@Payload() dto: SubmitAutocompleteDto) {
    return this.svc.submit(dto);
  }

  @MessagePattern('autocomplete.query')
  handleQuery(@Payload() dto: QueryAutocompleteDto) {
    return this.svc.query(dto);
  }
}
