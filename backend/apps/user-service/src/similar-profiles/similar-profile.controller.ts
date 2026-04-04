import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { SimilarProfileService } from './similar-profile.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('users')
export class SimilarProfileController {
  constructor(private readonly similarProfileService: SimilarProfileService) {}

  @ApiOperation({ summary: 'Get similar profiles for a user' })
  @Get(':id/similar-profiles')
  getSimilarProfiles(@Param('id') id: string) {
    return this.similarProfileService.getSimilarProfilesByUserId(id);
  }
}
