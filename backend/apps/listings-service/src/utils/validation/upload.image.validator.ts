import { FileValidator, Injectable } from '@nestjs/common';

@Injectable()
export class ImageValidator extends FileValidator<{
  maxSize: number;
  allowedMimeTypes: string[];
}> {
  constructor(validationOptions: {
    maxSize: number;
    allowedMimeTypes: string[];
  }) {
    super(validationOptions);
  }

  isValid(file: Express.Multer.File | Express.Multer.File[]): boolean {
    if (!file) {
      return false;
    }

    const { maxSize, allowedMimeTypes } = this.validationOptions;

    if (Array.isArray(file)) {
      return file.every((f) => this.validateFile(f, maxSize, allowedMimeTypes));
    }

    return this.validateFile(file, maxSize, allowedMimeTypes);
  }

  buildErrorMessage(file: Express.Multer.File | Express.Multer.File[]): string {
    if (!file) {
      return 'No file uploaded';
    }

    const { maxSize, allowedMimeTypes } = this.validationOptions;

    if (Array.isArray(file)) {
      const errors = file
        .map((f) => this.getFileError(f, maxSize, allowedMimeTypes))
        .filter(Boolean);
      return errors.length > 0 ? errors.join(', ') : 'Unknown validation error';
    }

    return (
      this.getFileError(file, maxSize, allowedMimeTypes) ||
      'Unknown validation error'
    );
  }

  private validateFile(
    file: Express.Multer.File,
    maxSize: number,
    allowedMimeTypes: string[],
  ): boolean {
    return file.size <= maxSize && allowedMimeTypes.includes(file.mimetype);
  }

  private getFileError(
    file: Express.Multer.File,
    maxSize: number,
    allowedMimeTypes: string[],
  ): string | null {
    if (file.size > maxSize) {
      return `File "${file.originalname}" exceeds ${maxSize} bytes`;
    }

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return `File "${file.originalname}" has invalid type. Allowed: ${allowedMimeTypes.join(', ')}`;
    }

    return null;
  }
}
