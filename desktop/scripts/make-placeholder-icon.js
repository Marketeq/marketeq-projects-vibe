#!/usr/bin/env node
// scripts/make-placeholder-icon.js
// Writes a 1024x1024 solid-color PNG to resources/icon.png so electron-builder
// can derive .icns / .ico from it. Zero dependencies — emits a valid minimal
// PNG using Node's zlib.
//
// resources/icon.png is the real Marketeq logo and is committed. This only
// fills in a placeholder when that file is missing — it must never overwrite
// the logo, or the installer, taskbar and tray all show a plain blue square.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUT = path.join(__dirname, '..', 'resources', 'icon.png');
const SIZE = 1024;

if (fs.existsSync(OUT)) {
  console.log(`${OUT} already exists — keeping the app logo`);
  process.exit(0);
}

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// Build raw RGBA scanlines: each row starts with filter byte 0.
const row = Buffer.alloc(1 + SIZE * 4);
row[0] = 0;
for (let x = 0; x < SIZE; x++) {
  // Solid brand color #4f46e5 (indigo) with full alpha.
  row[1 + x * 4 + 0] = 0x4f;
  row[1 + x * 4 + 1] = 0x46;
  row[1 + x * 4 + 2] = 0xe5;
  row[1 + x * 4 + 3] = 0xff;
}
const raw = Buffer.alloc((1 + SIZE * 4) * SIZE);
for (let y = 0; y < SIZE; y++) {
  row.copy(raw, y * row.length);
}
const idat = zlib.deflateSync(raw);

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, png);
console.log(`wrote ${OUT} (${png.length} bytes, ${SIZE}x${SIZE})`);
