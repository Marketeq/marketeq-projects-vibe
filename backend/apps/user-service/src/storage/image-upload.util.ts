import * as sanitizeHtml from 'sanitize-html';

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
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

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
