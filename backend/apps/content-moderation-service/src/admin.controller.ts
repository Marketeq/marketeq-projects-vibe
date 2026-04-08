// apps/content-moderation-service/src/admin.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AutocompleteService } from './autocomplete.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private autocompleteService: AutocompleteService) {}

  @Post('autocomplete')
  async addAutocompleteEntry(
    @Body() entry: { type: string; value: string }
  ) {
    await this.autocompleteService.add(entry.type, entry.value);
    return { status: 'success', message: 'Entry added successfully' };
  }
}
