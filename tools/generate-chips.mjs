#!/usr/bin/env node
/**
 * 온라인 카지노용 화려한 칩 아이콘 (Sharp + SVG)
 * - 금속감 엣지, 다중 링, 그라데이션, 반짝임 패턴
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'output', 'chips');
const SIZE = 96;

const CHIPS = [
  { name: 'chip_red', fill: '#c41e3a', fillLight: '#e84a5f', edge: '#8b0000', value: '10', accent: '#ffd700' },
  { name: 'chip_blue', fill: '#1e3a8a', fillLight: '#3b5bb5', edge: '#0d1b4a', value: '20', accent: '#87ceeb' },
  { name: 'chip_green', fill: '#166534', fillLight: '#22c55e', edge: '#0a3d1a', value: '50', accent: '#fbbf24' },
  { name: 'chip_gold', fill: '#b45309', fillLight: '#f59e0b', edge: '#78350f', value: '100', accent: '#fef3c7' },
  { name: 'chip_purple', fill: '#581c87', fillLight: '#7e22ce', edge: '#3b0764', value: '200', accent: '#e9d5ff' },
  { name: 'chip_black', fill: '#1f2937', fillLight: '#4b5563', edge: '#111827', value: '500', accent: '#fbbf24' },
];

function createChipSvg(chip) {
  const { fill, fillLight, edge, value, accent } = chip;
  const r = SIZE / 2 - 2;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const id = chip.name.replace(/_/g, '');
  return `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg${id}" cx="35%" cy="35%" r="70%">
      <stop offset="0%" style="stop-color:${fillLight};stop-opacity:1"/>
      <stop offset="60%" style="stop-color:${fill};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${edge};stop-opacity:1"/>
    </radialGradient>
    <linearGradient id="edge${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#fff;stop-opacity:0.7"/>
      <stop offset="50%" style="stop-color:${edge};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#000;stop-opacity:0.5"/>
    </linearGradient>
    <filter id="glow${id}">
      <feGaussianBlur stdDeviation="0.8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <pattern id="sparkle${id}" patternUnits="userSpaceOnUse" width="12" height="12">
      <circle cx="2" cy="2" r="0.6" fill="white" opacity="0.6"/>
      <circle cx="8" cy="8" r="0.5" fill="white" opacity="0.4"/>
    </pattern>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#bg${id})"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="url(#edge${id})" stroke-width="3"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 8}" fill="none" stroke="${accent}" stroke-width="2" opacity="0.8"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 14}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
  <circle cx="${cx}" cy="${cy}" r="${r - 18}" fill="url(#sparkle${id})" opacity="0.2"/>
  <text x="${cx}" y="${cy + 2}" text-anchor="middle" fill="rgba(0,0,0,0.5)" font-size="20" font-weight="bold" font-family="Arial">${value}</text>
  <text x="${cx}" y="${cy}" text-anchor="middle" fill="white" font-size="20" font-weight="bold" font-family="Arial" filter="url(#glow${id})">${value}</text>
</svg>`;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const chip of CHIPS) {
    const svg = createChipSvg(chip);
    const buf = Buffer.from(svg);
    const outPath = path.join(OUT_DIR, `${chip.name}.png`);
    await sharp(buf)
      .resize(SIZE, SIZE)
      .png()
      .toFile(outPath);
    console.log('Created:', outPath);
  }

  console.log('Chips saved to', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
