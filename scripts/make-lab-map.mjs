import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const lat = 41.8990849;
const lon = 12.517722;
const zoom = 18;
const tileSize = 256;

const n = 2 ** zoom;
const worldX = ((lon + 180) / 360) * n * tileSize;
const latRad = (lat * Math.PI) / 180;
const worldY =
  ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * tileSize;

const centerTileX = Math.floor(worldX / tileSize);
const centerTileY = Math.floor(worldY / tileSize);

const grid = [-1, 0, 1];
const tiles = [];
for (const dy of grid) {
  for (const dx of grid) {
    const x = centerTileX + dx;
    const y = centerTileY + dy;
    const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'navindoor-website-dev/1.0 (student project asset build)' },
    });
    if (!res.ok) throw new Error(`tile fetch failed: ${url} -> ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    tiles.push({ dx, dy, buf });
    await new Promise((r) => setTimeout(r, 120));
  }
}

const compositeSize = tileSize * 3;
const composite = sharp({
  create: {
    width: compositeSize,
    height: compositeSize,
    channels: 3,
    background: '#f2efe9',
  },
})
  .composite(
    tiles.map(({ dx, dy, buf }) => ({
      input: buf,
      left: (dx + 1) * tileSize,
      top: (dy + 1) * tileSize,
    })),
  )
  .png();

const compositeBuf = await composite.toBuffer();

const pointXInComposite = worldX - (centerTileX - 1) * tileSize;
const pointYInComposite = worldY - (centerTileY - 1) * tileSize;

const cropSize = 420;
const left = Math.round(pointXInComposite - cropSize / 2);
const top = Math.round(pointYInComposite - cropSize / 2);

const markerSvg = Buffer.from(`
<svg width="${cropSize}" height="${cropSize}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${cropSize / 2}" cy="${cropSize / 2}" r="10" fill="#0063da" stroke="white" stroke-width="4" />
  <circle cx="${cropSize / 2}" cy="${cropSize / 2}" r="26" fill="#0063da" fill-opacity="0.18" />
</svg>
`);

const final = await sharp(compositeBuf)
  .extract({ left, top, width: cropSize, height: cropSize })
  .composite([{ input: markerSvg }])
  .png()
  .toBuffer();

writeFileSync(new URL('../src/assets/lab-map.png', import.meta.url), final);
console.log('wrote src/assets/lab-map.png', final.length, 'bytes');
