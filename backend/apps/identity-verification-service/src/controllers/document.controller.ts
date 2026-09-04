import { Controller, Post, Get, Delete, Body, Param, Logger } from '@nestjs/common';
import { DocumentService } from '../services/document.service';
import { SubmitDocumentDto, DocumentResponseDto, DocumentHistoryResponseDto } from '../dto/document.dto';

@Controller('identity-verification/documents')
export class DocumentController {
  private readonly logger = new Logger(DocumentController.name);

  constructor(private documentService: DocumentService) {}

  @Post('submit/:userId')
  async submitDocument(
    @Param('userId') userId: string,
    @Body() dto: SubmitDocumentDto,
  ): Promise<DocumentResponseDto> {
    this.logger.log(`Submitting document for user ${userId}: ${dto.documentType}`);
    return this.documentService.submitDocument(userId, dto);
  }

  @Get('history/:userId')
  async getDocumentHistory(@Param('userId') userId: string): Promise<DocumentHistoryResponseDto> {
    this.logger.log(`Getting document history for user ${userId}`);
    return this.documentService.getDocumentHistory(userId);
  }

  @Get(':documentId')
  async getDocument(@Param('documentId') documentId: string) {
    this.logger.log(`Getting document ${documentId}`);
    return this.documentService.getDocument(documentId);
  }

  @Delete(':documentId')
  async deleteDocument(@Param('documentId') documentId: string) {
    this.logger.log(`Deleting document ${documentId}`);
    return this.documentService.deleteDocument(documentId);
  }
}
