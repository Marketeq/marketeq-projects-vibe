import { Injectable, Logger } from '@nestjs/common';
import { ParseException } from '../../common/errors/parse.exception';

export interface LengthGateResult {
  text: string;
  truncated: boolean;
  originalLength: number;
  isNearEmpty: boolean;
}

@Injectable()
export class LengthGateService {
  private readonly logger = new Logger(LengthGateService.name);
  private readonly maxExtractedChars: number;
  private readonly hardRejectChars: number;
  private readonly nearEmptyChars: number;

  constructor() {
    this.maxExtractedChars = parseInt(process.env.MAX_EXTRACTED_CHARS || '150000', 10);
    this.hardRejectChars = parseInt(process.env.HARD_REJECT_CHARS || '500000', 10);
    this.nearEmptyChars = parseInt(process.env.NEAR_EMPTY_TEXT_CHARS || '50', 10);
  }

  check(text: string): LengthGateResult {
    const originalLength = text.length;

    // Hard reject: too long, no model call
    if (originalLength > this.hardRejectChars) {
      throw ParseException.documentTooLong(originalLength, this.hardRejectChars);
    }

    // Near-empty: signal scanned-resume path
    if (originalLength < this.nearEmptyChars) {
      this.logger.log(`Near-empty text (${originalLength} chars), signaling scanned-resume path`);
      return {
        text,
        truncated: false,
        originalLength,
        isNearEmpty: true,
      };
    }

    // Truncate if over max, keeping the head at a paragraph boundary
    if (originalLength > this.maxExtractedChars) {
      const truncated = this.truncateAtParagraph(text, this.maxExtractedChars);
      this.logger.log(`Text truncated from ${originalLength} to ${truncated.length} chars`);
      return {
        text: truncated,
        truncated: true,
        originalLength,
        isNearEmpty: false,
      };
    }

    return {
      text,
      truncated: false,
      originalLength,
      isNearEmpty: false,
    };
  }

  private truncateAtParagraph(text: string, maxLen: number): string {
    // Find the last paragraph break before maxLen
    const slice = text.substring(0, maxLen);
    const lastParagraph = slice.lastIndexOf('\n\n');
    if (lastParagraph > maxLen * 0.8) {
      return slice.substring(0, lastParagraph);
    }
    // Fall back to last newline
    const lastNewline = slice.lastIndexOf('\n');
    if (lastNewline > maxLen * 0.8) {
      return slice.substring(0, lastNewline);
    }
    return slice;
  }
}
