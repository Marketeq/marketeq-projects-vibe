import { Injectable } from '@nestjs/common';
@Injectable()
export class FileValidationService {
  async validateFile(file: Express.Multer.File): Promise<{ valid: boolean, reason?: string }> {
    const allowedFileTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic',
      'video/mp4',
      'video/quicktime',
      'video/webm',
    ];
    const maxSize = 10 * 1024 * 1024;

    if (!allowedFileTypes.includes(file.mimetype)) {
      return { valid: false, reason: 'Invalid file type' };
    }
    if (file.size > maxSize) {
      return { valid: false, reason: 'File size exceeds limit' };
    }
    return { valid: true };
  }
}
