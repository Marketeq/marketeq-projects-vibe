export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function validateFile(file: Express.Multer.File): void {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxFileSizeMB = 10;
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Unsupported file type.');
  }
  if (file.size / 1024 / 1024 > maxFileSizeMB) {
    throw new Error('File exceeds max size of 10MB.');
  }
}
