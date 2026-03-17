#!/usr/bin/env node
/**
 * 카드 뒷면: ZP 로고(zp.png)를 사용해 합성
 * fe/assets/logo/zp.png 를 카드 비율(3:4) 배경 위에 배치
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '..', 'fe', 'public', 'assets', 'logo', 'zp.png');
const OUT_DIR = path.join(__dirname, 'output', 'cards');
const CARD_W = 176;
const CARD_H = 248; // 2.5:3.5 비율

async function main() {
  if (!fs.existsSync(LOGO_PATH)) {
    console.error('Logo not found:', LOGO_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const logo = await sharp(LOGO_PATH).resize(120, 80).png().toBuffer();
  const cardBack = await sharp({
    create: {
      width: CARD_W,
      height: CARD_H,
      channels: 3,
      background: { r: 92, g: 36, b: 50 },
    },
  })
    .png()
    .composite([{ input: logo, top: Math.round((CARD_H - 80) / 2), left: Math.round((CARD_W - 120) / 2) }])
    .toBuffer();

  const outPath = path.join(OUT_DIR, 'card_back.png');
  fs.writeFileSync(outPath, cardBack);
  console.log('Card back (ZP logo) saved:', outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
