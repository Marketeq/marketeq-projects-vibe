import type { Request } from 'express';

export const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: any,
) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
    return callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};

export const mediaFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: any,
) => {
  if (file.fieldname === 'featuredImage' || file.fieldname === 'additionalImages') {
    // PMCM-256: webp dropped from new project-media uploads — this only
    // gates the upload filename at the multer layer, so it doesn't touch
    // already-stored webp URLs (nothing re-validates mimetype on read).
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
      return callback(new Error('Only image files are allowed!'), false);
    }
    return callback(null, true);
  }

  if (file.fieldname === 'featuredVideo' || file.fieldname === 'videoUrl') {
    if (!file.originalname.match(/\.(mp4|mov|webm|mkv)$/i)) {
      return callback(new Error('Only video files are allowed!'), false);
    }
    return callback(null, true);
  }

  return callback(new Error(`Unsupported upload field: ${file.fieldname}`), false);
};

export const editFileName = (
  req: any,
  file: Express.Multer.File,
  callback: any,
) => {
  const lastDotIndex = file.originalname.lastIndexOf('.');
  const rawName =
    lastDotIndex > 0
      ? file.originalname.slice(0, lastDotIndex)
      : file.originalname;
  const rawExtension =
    lastDotIndex > 0 ? file.originalname.slice(lastDotIndex + 1) : 'png';
  const extension = rawExtension.toLowerCase();
  const name = rawName
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  const randomName = Array(4)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString())
    .join('');
  callback(
    null,
    `${name || 'upload'}-${randomName}-${new Date().getTime()}.${extension}`,
  );
};
