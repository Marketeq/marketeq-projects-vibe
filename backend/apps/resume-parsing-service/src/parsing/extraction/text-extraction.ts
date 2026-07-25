import { Injectable, Logger } from '@nestjs/common';
import { ParseException } from '../../common/errors/parse.exception';

@Injectable()
export class TextExtractionService {
  private readonly logger = new Logger(TextExtractionService.name);

  async extract(buffer: Buffer, mimeType: string): Promise<string> {
    switch (mimeType) {
      case 'application/pdf':
        return this.extractPdf(buffer);
      case 'application/msword':
        return this.extractDoc(buffer);
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractDocx(buffer);
      default:
        throw ParseException.unsupportedType(mimeType);
    }
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    try {
      // pdf-parse v2 class-based API
      const { PDFParse } = require('pdf-parse');
      const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const parser = new PDFParse(uint8);
      await parser.load();
      const result = await parser.getText();
      return result.text || '';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('encrypted') ||
        message.includes('password') ||
        message.includes('Password')
      ) {
        throw ParseException.passwordProtected();
      }
      this.logger.error(`PDF extraction failed: ${message}`);
      throw ParseException.unreadableDocument();
    }
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`DOCX extraction failed: ${message}`);
      throw ParseException.unreadableDocument();
    }
  }

  private async extractDoc(buffer: Buffer): Promise<string> {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`DOC extraction failed: ${message}`);
      throw ParseException.unreadableDocument();
    }
  }
}
