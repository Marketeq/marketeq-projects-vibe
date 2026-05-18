import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';

import { LegalDocumentsService } from '../services/legal-documents.service';
import { ListLegalDocumentsQueryDto } from '../dto/list-legal-documents-query.dto';

/**
 * Lets authenticated users browse and download their own signed legal documents.
 * Both routes are protected by the global JwtAuthGuard.
 */
@Controller('v1/legal-documents')
export class LegalDocumentsController {
  constructor(
    private readonly legalDocumentsService: LegalDocumentsService,
  ) {}

  /** GET /v1/legal-documents?type=nda&page=1&limit=20 */
  @Get()
  findAll(@Req() req: Request, @Query() query: ListLegalDocumentsQueryDto): Promise<unknown> {
    const userId = (req as any).user?.sub as string;
    return this.legalDocumentsService.findAll(userId, query);
  }

  /** GET /v1/legal-documents/:id */
  @Get(':id')
  findOne(@Req() req: Request, @Param('id') id: string) {
    const userId = (req as any).user?.sub as string;
    return this.legalDocumentsService.findOne(userId, id);
  }
}
