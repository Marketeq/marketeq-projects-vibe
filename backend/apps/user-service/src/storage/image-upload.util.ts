import { BadRequestException } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';
import * as sharp from 'sharp';

/**
 * Shared validation for user-supplied image uploads.
 *
 * The raster detection here intentionally mirrors the private helper in
 * `user/user-self.controller.ts` rather than importing from it. That
 * controller also serves `GET /user/me`, which SOP §1.3 marks as part of the
 * fixed profile-loading path, so it is left untouched. The duplication is the
 * cheaper of the two costs.
 */

/** Raster formats that can be trusted from their magic bytes alone. */
export const RASTER_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const SVG_MIME_TYPE = 'image/svg+xml';

/** Company logos are small; well under the 5MB avatar ceiling. */
export const MAX_LOGO_BYTES = 5 * 1024 * 1024;

/**
 * Logos are normalised like avatars — same EXIF strip, same re-encode — but
 * deliberately keep no minimum dimension.
 *
 * An avatar is a square portrait, so 200x200 is a reasonable floor. A logo is
 * often a wide wordmark (600x80) or a small mark, and any floor applied here
 * would start rejecting uploads that succeed today. Passing 1 keeps the
 * privacy fix additive: metadata is dropped and oversized files are scaled
 * down, but nothing that works now begins to fail.
 */
export const MAX_LOGO_DIMENSION = 1024;
export const MIN_LOGO_DIMENSION = 1;

/**
 * Inspect the leading bytes of an uploaded buffer against the well-known image
 * signatures and return the detected mime type, or null when the buffer is not
 * a supported image. This is the server-side cross-check of the
 * client-supplied mimetype, which is attacker-controlled: a request claiming
 * `image/png` while carrying a script payload is rejected here.
 */
export function detectRasterImageMimeType(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  // GIF: "GIF87a" / "GIF89a"
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }
  // WEBP: "RIFF" .... "WEBP"
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * SVG has no magic number, it is XML, so detection is structural: the first
 * meaningful markup must be an `<svg>` root, optionally preceded by an XML
 * declaration, a doctype, comments, or a BOM. Only the head of the buffer is
 * examined so a large file cannot turn this into a slow scan.
 */
export function looksLikeSvg(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) return false;
  const head = buffer.subarray(0, 1024).toString('utf8').replace(/^﻿/, '');
  const withoutPreamble = head
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trimStart();
  return /^<svg[\s>]/i.test(withoutPreamble);
}

/**
 * SVG elements and attributes a logo legitimately needs. Everything outside
 * this list is dropped.
 *
 * Deliberately absent: `script` and event handlers (the direct XSS vector),
 * and `foreignObject`, which smuggles arbitrary HTML, `<script>` included,
 * past an SVG-shaped allowlist. `image` and `use` are absent too, since both
 * can reference an external or `data:` URL that the sanitizer would otherwise
 * have to police separately.
 */
const SVG_ALLOWED_TAGS = [
  'svg', 'g', 'defs', 'symbol', 'title', 'desc',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan', 'textPath',
  'linearGradient', 'radialGradient', 'stop', 'pattern',
  'clipPath', 'mask', 'filter',
  'feGaussianBlur', 'feOffset', 'feBlend', 'feColorMatrix', 'feMerge',
  'feMergeNode', 'feFlood', 'feComposite', 'feDropShadow',
];

const SVG_ALLOWED_ATTRS = [
  'viewBox', 'xmlns', 'xmlns:xlink', 'version', 'width', 'height',
  'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry',
  'd', 'points', 'transform', 'preserveAspectRatio',
  'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
  'stroke-dashoffset', 'stroke-opacity', 'stroke-miterlimit',
  'opacity', 'color', 'style', 'class', 'id',
  'offset', 'stop-color', 'stop-opacity', 'gradientUnits',
  'gradientTransform', 'spreadMethod', 'patternUnits',
  'clip-path', 'clip-rule', 'mask', 'filter',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'text-anchor', 'dominant-baseline', 'letter-spacing',
  'stdDeviation', 'dx', 'dy', 'result', 'in', 'in2', 'mode', 'values',
  'type', 'flood-color', 'flood-opacity', 'operator',
];

/**
 * Inline style properties a logo needs, each pinned to a literal value shape.
 * No property here accepts a `url(...)`, so a declaration cannot reach out to
 * a remote origin.
 */
const COLOR_VALUE = /^#(0x)?[0-9a-f]+$|^(rgb|hsl)a?\([^)]*\)$|^[a-z-]+$/i;
const NUMERIC_VALUE = /^[0-9.]+(px|em|rem|%)?$/;

const SVG_ALLOWED_STYLES: Record<string, RegExp[]> = {
  fill: [COLOR_VALUE],
  stroke: [COLOR_VALUE],
  color: [COLOR_VALUE],
  'stop-color': [COLOR_VALUE],
  'flood-color': [COLOR_VALUE],
  'stroke-width': [NUMERIC_VALUE],
  opacity: [NUMERIC_VALUE],
  'fill-opacity': [NUMERIC_VALUE],
  'stroke-opacity': [NUMERIC_VALUE],
  'stop-opacity': [NUMERIC_VALUE],
  'fill-rule': [/^(nonzero|evenodd|inherit)$/i],
  'stroke-linecap': [/^(butt|round|square|inherit)$/i],
  'stroke-linejoin': [/^(miter|round|bevel|inherit)$/i],
  display: [/^(none|inline|block)$/i],
};

/**
 * Strip anything executable from an SVG and return the cleaned bytes.
 *
 * Rendering a logo through an `<img>` tag never runs its scripts, so the app's
 * own views are not the exposure. Opening the stored file directly on the CDN
 * origin does run them, and that origin can share a cookie scope with the
 * app, so the file is sanitized once, on the way in, rather than relying on
 * every future consumer to render it safely.
 *
 * Returns null when nothing renderable survives, which means the upload was
 * markup rather than a drawing.
 */
export function sanitizeSvg(buffer: Buffer): Buffer | null {
  const source = buffer.toString('utf8');
  const cleaned = sanitizeHtml(source, {
    allowedTags: SVG_ALLOWED_TAGS,
    allowedAttributes: { '*': SVG_ALLOWED_ATTRS },
    // SVG attribute and tag names are case-sensitive: lowercasing turns
    // `viewBox` into `viewbox` and `linearGradient` into `lineargradient`,
    // both of which silently stop rendering.
    parser: { lowerCaseTags: false, lowerCaseAttributeNames: false },
    // Inline styles are kept for per-element paint, but only these
    // properties and only literal values. Anything able to express a
    // `url(...)` reference is excluded, so no declaration can fetch a remote
    // resource.
    allowedStyles: { '*': SVG_ALLOWED_STYLES },
    disallowedTagsMode: 'discard',
  });

  if (!/<svg[\s>]/i.test(cleaned)) return null;
  return Buffer.from(cleaned, 'utf8');
}

// ---------------------------------------------------------------------------
// Raster normalisation
// ---------------------------------------------------------------------------

/** Smallest usable profile photo. Below this the avatar is visibly degraded. */
export const MIN_AVATAR_DIMENSION = 200;

/**
 * Largest dimension kept. An avatar is never displayed above a few hundred
 * pixels, so anything beyond this is bytes nobody sees — and a modern phone
 * photo is routinely 4000px wide.
 */
export const MAX_AVATAR_DIMENSION = 1024;

export interface NormalisedImage {
  buffer: Buffer;
  width: number;
  height: number;
}

/**
 * Re-encodes an uploaded raster image so that what we store is what we intend
 * to store.
 *
 * **Why this exists:** phone photographs carry EXIF, and EXIF routinely carries
 * GPS coordinates. An avatar is a public-facing image, so storing the file as
 * uploaded means publishing the location where the photo was taken — often
 * somebody's home. Sharp does not copy metadata unless asked to, so re-encoding
 * through it drops EXIF, ICC and every other ancillary chunk.
 *
 * **`.rotate()` is not optional.** Orientation lives *in* the EXIF we are about
 * to discard. Stripping metadata without first applying it leaves portrait
 * photographs stored sideways — the classic version of this bug. Called with no
 * argument, `rotate()` means "apply the EXIF orientation now"; the tag is then
 * gone and the pixels are already correct.
 *
 * Animated GIF and WebP are decoded with `animated: true` so re-encoding does
 * not silently flatten them to a single frame.
 *
 * Throws `BadRequestException` for an image below the minimum dimension, or one
 * sharp cannot decode — both are caller errors, not server faults.
 */
export async function normaliseRasterImage(
  buffer: Buffer,
  mimeType: string,
  maxDimension: number = MAX_AVATAR_DIMENSION,
  minDimension: number = MIN_AVATAR_DIMENSION,
): Promise<NormalisedImage> {
  const animated = mimeType === 'image/gif' || mimeType === 'image/webp';

  let pipeline: sharp.Sharp;
  let meta: sharp.Metadata;
  try {
    pipeline = sharp(buffer, { animated });
    meta = await pipeline.metadata();
  } catch {
    throw new BadRequestException('That image could not be read.');
  }

  // For an animated image `height` is the height of the whole filmstrip;
  // pageHeight is one frame. Compare the frame, not the strip.
  const width = meta.width ?? 0;
  const height = meta.pageHeight ?? meta.height ?? 0;

  if (width < minDimension || height < minDimension) {
    throw new BadRequestException(
      `Image must be at least ${minDimension}x${minDimension} pixels. This one is ${width}x${height}.`,
    );
  }

  // rotate() before resize so the orientation tag is honoured while it still
  // exists. No withMetadata() call anywhere below — that is what drops EXIF.
  let out = sharp(buffer, { animated }).rotate();

  if (width > maxDimension || height > maxDimension) {
    out = out.resize({
      width: maxDimension,
      height: maxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  // Re-encode in the format it arrived as. Changing container here would
  // invalidate the extension the storage layer derives from the mime type.
  switch (mimeType) {
    case 'image/jpeg':
      out = out.jpeg({ quality: 88 });
      break;
    case 'image/png':
      out = out.png({ compressionLevel: 9 });
      break;
    case 'image/webp':
      out = out.webp({ quality: 88 });
      break;
    case 'image/gif':
      out = out.gif();
      break;
    default:
      throw new BadRequestException('Unsupported image format.');
  }

  const normalised = await out.toBuffer();
  const finalMeta = await sharp(normalised, { animated }).metadata();

  return {
    buffer: normalised,
    width: finalMeta.width ?? width,
    height: finalMeta.pageHeight ?? finalMeta.height ?? height,
  };
}
