/**
 * Rasterizes the email footer social icons from @blend-metrics/icons.
 *
 * The transactional emails (rendered by the backend notification-service,
 * see email-primitives.ts `socialRow()`) reference hosted PNG glyphs at
 * /email/social/<name>.png because Gmail and Outlook do not render SVG in
 * <img> tags. These PNGs used to be hand-made; this script instead derives
 * them from the app's icon pack so the glyphs always match the design system.
 *
 * It reads the compiled `social-solid` icon set (single-color `currentColor`
 * paths) and rasterizes each icon at the email `ICON` design token (#98A2B3),
 * matching the previous monochrome look.
 *
 * Run from frontend/:
 *   node scripts/rasterize-email-social-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../public/email/social');
const GLYPH_COLOR = '#98A2B3';
const SIZE = 42; // 3x the email's 14px SOCIAL_GLYPH for retina

/** Icons keyed the same as frontend/public/email/social/*.png. */
const ICONS = {
  facebook: 'FacebookSolid',
  instagram: 'InstagramSolid',
  linkedin: 'LinkedInSolid',
  telegram: 'TelegramSolid',
};

/** Pulls the glyph path `d` values out of a compiled icon component. The
 *  clipPath def ("M0 0h24v24H0z") is the whole 24x24 viewBox and is dropped. */
function extractPaths(source, fnName) {
  const start = source.indexOf(`function ${fnName}(props)`);
  const end = source.indexOf('\n}\n', start);
  if (start < 0 || end < 0) {
    throw new Error(`Icon ${fnName} not found in compiled pack`);
  }
  const body = source.slice(start, end);
  const ds = [...body.matchAll(/d:\s*"([^"]*)"/g)].map((m) => m[1]);
  return ds.filter((d) => d !== 'M0 0h24v24H0z');
}

async function main() {
  const packPath = path.resolve(
    __dirname,
    '../node_modules/@blend-metrics/icons/dist/social-solid.mjs',
  );
  if (!fs.existsSync(packPath)) {
    throw new Error(
      `Icon pack not found at ${packPath}. Run \`npm install\` first.`,
    );
  }
  const source = fs.readFileSync(packPath, 'utf8');

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const [name, fnName] of Object.entries(ICONS)) {
    const paths = extractPaths(source, fnName);
    if (paths.length === 0) {
      throw new Error(`No glyph paths found for ${fnName}`);
    }

    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
      paths.map((d) => `<path fill="${GLYPH_COLOR}" d="${d}" />`).join('') +
      `</svg>`;

    const png = await sharp(Buffer.from(svg)).resize(SIZE, SIZE).png().toBuffer();
    const outPath = path.join(OUT_DIR, `${name}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`rasterized ${name}.png (${SIZE}x${SIZE})`);
  }

  console.log(`\nDone. Wrote ${Object.keys(ICONS).length} icons to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});