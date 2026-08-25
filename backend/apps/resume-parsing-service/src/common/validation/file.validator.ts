import { Injectable, Logger } from '@nestjs/common';
import { ParseException } from '../errors/parse.exception';

export type AcceptedMimeType =
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const ACCEPTED_MIME_TYPES: AcceptedMimeType[] = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Magic byte signatures
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK.. (DOCX is ZIP-based)
const CFB_MAGIC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0]); // Legacy .doc (CFB)

@Injectable()
export class FileValidator {
  private readonly logger = new Logger(FileValidator.name);
  private readonly maxFileBytes: number;

  constructor() {
    this.maxFileBytes = parseInt(process.env.MAX_FILE_BYTES || String(5 * 1024 * 1024), 10);
  }

  validate(
    buffer: Buffer,
    mimeType: string,
    originalName: string,
  ): AcceptedMimeType {
    // 1. Empty check
    if (!buffer || buffer.length === 0) {
      throw ParseException.emptyFile();
    }

    // 2. Size check
    if (buffer.length > this.maxFileBytes) {
      throw ParseException.fileTooLarge(this.maxFileBytes);
    }

    // 3. MIME type check
    const normalizedMime = this.normalizeMimeType(mimeType, originalName);
    if (!ACCEPTED_MIME_TYPES.includes(normalizedMime as AcceptedMimeType)) {
      throw ParseException.unsupportedType(mimeType);
    }

    // 4. Magic byte signature verification
    this.verifySignature(buffer, normalizedMime as AcceptedMimeType);

    return normalizedMime as AcceptedMimeType;
  }

  private normalizeMimeType(mimeType: string, originalName: string): string {
    // Some clients send generic types; use extension as fallback
    if (mimeType === 'application/octet-stream' || !mimeType) {
      const ext = originalName.toLowerCase().split('.').pop();
      switch (ext) {
        case 'pdf':
          return 'application/pdf';
        case 'doc':
          return 'application/msword';
        case 'docx':
          return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        default:
          return mimeType || 'unknown';
      }
    }
    return mimeType;
  }

  private verifySignature(buffer: Buffer, expectedMime: AcceptedMimeType): void {
    if (buffer.length < 4) {
      throw ParseException.unsupportedType('unknown (file too short for signature check)');
    }

    const head = buffer.subarray(0, 4);

    switch (expectedMime) {
      case 'application/pdf':
        if (!head.equals(PDF_MAGIC)) {
          throw ParseException.typeMismatch(expectedMime, 'non-PDF signature');
        }
        break;
      case 'application/msword':
        if (!head.equals(CFB_MAGIC)) {
          throw ParseException.typeMismatch(expectedMime, 'non-DOC signature');
        }
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        if (!head.equals(ZIP_MAGIC)) {
          throw ParseException.typeMismatch(expectedMime, 'non-DOCX signature');
        }
        break;
    }
  }
}
