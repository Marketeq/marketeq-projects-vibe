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

  @Get('meta/category-map')
  getCategoryMap() {
    return this.svc.getCategoryMap();
  }

  @Get('categories')
  getCategorySuggestions(@Query('q') query: string) {
    return this.svc.getCategoryMatches(query);
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

  // Wildcard :type route MUST come after all specific routes to avoid shadowing them
  @Get(':type')
  async getByType(
    @Param('type') type: string,
    @Query('q') q?: string,
    @Query('limit') limitParam?: string,
  ) {
    const parsedLimit = Number(limitParam);
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 500)
        : 10;
    // If a JSON data file exists for this type, serve from it with Fuse.js fuzzy search
    if (this.svc.hasJsonData(type)) {
      try {
        return await this.svc.queryFromJson(type, q, limit);
      } catch (err) {
        console.error(`[Autocomplete] queryFromJson error for type="${type}":`, err);
        throw err;
      }
    }
    // Otherwise fall back to the DB-based query
    return this.svc.getByType(type as EntryType);
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
