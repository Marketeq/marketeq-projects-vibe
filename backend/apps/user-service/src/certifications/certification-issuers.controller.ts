import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { CertificationIssuersService } from './certification-issuers.service';

@Controller('certification-issuers')
export class CertificationIssuersController {
  constructor(
    private readonly issuersService: CertificationIssuersService,
  ) {}

  @ApiOperation({ summary: 'List all known certification issuers with logos' })
  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.issuersService.findAll();
  }

  @ApiOperation({ summary: 'Search certification issuers by name' })
  @Get('search')
  @HttpCode(HttpStatus.OK)
  search(@Query('q') query: string) {
    return this.issuersService.search(query || '');
  }

  @ApiOperation({ summary: 'Resolve logos for a batch of certifications' })
  @Post('resolve-logos')
  @HttpCode(HttpStatus.OK)
  resolveLogos(
    @Body() body: { certifications: Array<{ name: string; issuer?: string }> },
  ) {
    return this.issuersService.resolveLogos(body.certifications);
  }
}
