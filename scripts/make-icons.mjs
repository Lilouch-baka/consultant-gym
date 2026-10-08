// Generates the PWA icons (navy square with three white rising bars) as PNGs, no dependencies.
// Run with: npm run icons
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(out, { recursive: true });

const NAVY = [11, 45, 92];
const WHITE = [255, 255, 255];
const GREEN = [92, 198, 144];

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, art) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = art(x / size, y / size);
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Art in unit coordinates, kept inside the central 60% so it survives maskable cropping.
function art(scale) {
  const s = scale; // 1 = full size, smaller = more padding
  const bars = [
    { x0: 0.5 - 0.27 * s, x1: 0.5 - 0.13 * s, top: 0.5 + 0.05 * s },
    { x0: 0.5 - 0.07 * s, x1: 0.5 + 0.07 * s, top: 0.5 - 0.1 * s },
    { x0: 0.5 + 0.13 * s, x1: 0.5 + 0.27 * s, top: 0.5 - 0.25 * s },
  ];
  const bottom = 0.5 + 0.25 * s;
  return (x, y) => {
    for (const b of bars) if (x >= b.x0 && x <= b.x1 && y >= b.top && y <= bottom) return WHITE;
    // green baseline
    if (y >= bottom + 0.03 * s && y <= bottom + 0.06 * s && x >= 0.5 - 0.3 * s && x <= 0.5 + 0.3 * s) return GREEN;
    return NAVY;
  };
}

writeFileSync(join(out, 'icon-192.png'), png(192, art(1)));
writeFileSync(join(out, 'icon-512.png'), png(512, art(1)));
writeFileSync(join(out, 'icon-512-maskable.png'), png(512, art(0.8)));
writeFileSync(join(out, 'apple-touch-icon.png'), png(180, art(1)));
writeFileSync(
  join(out, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0B2D5C"/><rect x="15" y="35" width="9" height="16" fill="#fff"/><rect x="28" y="26" width="9" height="25" fill="#fff"/><rect x="41" y="16" width="9" height="35" fill="#fff"/><rect x="13" y="53" width="38" height="2" fill="#5CC690"/></svg>`,
);
console.log('Icons written to public/');
