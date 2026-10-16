import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import sharp = require('sharp');
import { R2Service } from '../storage/r2.service';
import { Screenshot } from './screenshots.entity';

// Dev uploads are written by ScreenshotsService.confirm() to
// <cwd>/screenshot-uploads and served at /api/screenshot-files (main.ts).
const LOCAL_FILES_ROUTE = '/api/screenshot-files/';
const BLUR_SIGMA = 30;

/**
 * Resolves the image URL a viewer may load, and produces the blurred copy.
 *
 * A blurred screenshot only ever resolves to its blurred copy, so the original
 * is never handed out while the blur stands — blurring is not a CSS effect.
 */
@Injectable()
export class ScreenshotImageService {
  private readonly logger = new Logger(ScreenshotImageService.name);

  constructor(private readonly r2: R2Service) {}

  private localFilename(s: Screenshot): string | null {
    if (!s.url) return null;
    const i = s.url.indexOf(LOCAL_FILES_ROUTE);
    if (i < 0) return null;
    return decodeURIComponent(s.url.slice(i + LOCAL_FILES_ROUTE.length));
  }

  private localPath(filename: string): string {
    const root = path.join(process.cwd(), 'screenshot-uploads');
    const full = path.resolve(root, filename);
    if (!full.startsWith(root + path.sep)) throw new InternalServerErrorException('Invalid screenshot path');
    return full;
  }

  private blurredKey(s: Screenshot): string {
    return `blurred/${s.key}`;
  }

  /** Writes the blurred copy. Throws if the original can't be read, so a blur never "succeeds" without one. */
  async createBlurredCopy(s: Screenshot): Promise<void> {
    try {
      const local = this.localFilename(s);
      if (local) {
        const original = await fs.promises.readFile(this.localPath(local));
        const blurred = await sharp(original).blur(BLUR_SIGMA).jpeg({ quality: 70 }).toBuffer();
        const out = this.localPath(path.join('blurred', local));
        await fs.promises.mkdir(path.dirname(out), { recursive: true });
        await fs.promises.writeFile(out, blurred);
        return;
      }
      const original = await this.r2.getObject(s.key);
      const blurred = await sharp(original).blur(BLUR_SIGMA).jpeg({ quality: 70 }).toBuffer();
      await this.r2.putObject(this.blurredKey(s), blurred, 'image/jpeg');
    } catch (err) {
      this.logger.error(`Could not create blurred copy of ${s.id}: ${(err as Error).message}`);
      throw new InternalServerErrorException('Could not blur this screenshot. Please try again.');
    }
  }

  /** URL the viewer may load: the blurred copy while blurred, otherwise the original. */
  async imageUrl(s: Screenshot): Promise<string> {
    const local = this.localFilename(s);
    if (s.isBlurred) {
      if (local) return s.url!.replace(LOCAL_FILES_ROUTE, `${LOCAL_FILES_ROUTE}blurred/`);
      try {
        return (await this.r2.presignGet(this.blurredKey(s))).url;
      } catch {
        return '';
      }
    }
    if (s.url) return s.url;
    try {
      return (await this.r2.presignGet(s.key)).url;
    } catch {
      return '';
    }
  }
}
