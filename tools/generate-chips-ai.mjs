#!/usr/bin/env node
/**
 * 칩 이미지 생성: 1) Gemini/Imagen API 시도 → 2) 실패 시 Sharp SVG 폴백 (10, 100, 1k, 10k 등)
 * .env: gemini_api_key 필수. gemini_api_engine은 Imagen 모델일 때만 사용 (예: imagen-3.0-generate-002).
 *       gemini-2.5-flash-preview-image-generation 등 비지원 모델은 자동으로 Imagen 기본값 사용.
 */
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'output', 'chips');
const API_KEY = process.env.gemini_api_key;
const ENV_ENGINE = process.env.gemini_api_engine || '';
const USE_IMAGEN = ENV_ENGINE.startsWith('imagen-');
const MODEL_IMAGEN = USE_IMAGEN ? ENV_ENGINE : 'imagen-4.0-generate-001';

/** 액면별 칩: API용 라벨/색 + Sharp 폴백용 색상 */
const CHIP_SPECS = [
  { value: '10', label: '10', color: 'red and white edge', fill: '#c41e3a', fillLight: '#e84a5f', edge: '#8b0000', accent: '#ffd700' },
  { value: '100', label: '100', color: 'black and gold edge', fill: '#1f2937', fillLight: '#4b5563', edge: '#111827', accent: '#fbbf24' },
  { value: '500', label: '500', color: 'green and gold edge', fill: '#166534', fillLight: '#22c55e', edge: '#0a3d1a', accent: '#fbbf24' },
  { value: '1k', label: '1000', color: 'blue and silver edge', fill: '#1e3a8a', fillLight: '#3b5bb5', edge: '#0d1b4a', accent: '#c0c0c0' },
  { value: '5k', label: '5000', color: 'purple and gold edge', fill: '#581c87', fillLight: '#7e22ce', edge: '#3b0764', accent: '#e9d5ff' },
  { value: '10k', label: '10000', color: 'yellow and red edge', fill: '#eab308', fillLight: '#fde047', edge: '#a16207', accent: '#c41e3a' },
  { value: '50k', label: '50000', color: 'orange and black edge', fill: '#ea580c', fillLight: '#fdba74', edge: '#9a3412', accent: '#1f2937' },
];

const SIZE = 96;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function saveImage(imageBytes, filepath) {
  if (!imageBytes) return false;
  ensureDir(path.dirname(filepath));
  const buf = Buffer.from(imageBytes, 'base64');
  fs.writeFileSync(filepath, buf);
  console.log('  Saved (AI):', filepath);
  return true;
}

async function generateImageWithImagen(ai, prompt) {
  try {
    const res = await ai.models.generateImages({
      model: MODEL_IMAGEN,
      prompt,
      config: { numberOfImages: 1, aspectRatio: '1:1' },
    });
    const img = res?.generatedImages?.[0]?.image;
    if (img?.imageBytes) return img.imageBytes;
  } catch (e) {
    console.warn('  generateImages failed:', e.message);
  }
  return null;
}

function createChipSvg(spec) {
  const { fill, fillLight, edge, accent, label } = spec;
  const id = `chip${spec.value.replace(/[^a-z0-9]/gi, '')}`;
  const r = SIZE / 2 - 2;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const fontSize = label.length <= 2 ? 20 : label.length <= 3 ? 16 : 14;
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
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
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
  <text x="${cx}" y="${cy + 2}" text-anchor="middle" fill="rgba(0,0,0,0.5)" font-size="${fontSize}" font-weight="bold" font-family="Arial">${label}</text>
  <text x="${cx}" y="${cy}" text-anchor="middle" fill="white" font-size="${fontSize}" font-weight="bold" font-family="Arial" filter="url(#glow${id})">${label}</text>
</svg>`;
}

async function generateChipSharp(spec, filepath) {
  const svg = createChipSvg(spec);
  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(filepath);
  console.log('  Saved (Sharp):', filepath);
}

async function generateOneChip(ai, spec) {
  const prompt = `Single realistic casino poker chip, top-down view only. 
The chip must look like a real clay/composite poker chip: round, slight bevel at the edge, subtle grooves on the rim. 
Center shows the value "${spec.label}" clearly. 
Color style: ${spec.color}. 
Glossy, professional, no background, no other objects.`;
  return await generateImageWithImagen(ai, prompt);
}

async function main() {
  ensureDir(OUT_DIR);
  console.log('Chip generator. Image model:', MODEL_IMAGEN, USE_IMAGEN ? '(from .env)' : '(default, .env is not Imagen)');
  console.log('---');

  const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

  for (const spec of CHIP_SPECS) {
    const filepath = path.join(OUT_DIR, `chip_${spec.value}.png`);
    if (fs.existsSync(filepath)) {
      console.log('Skip (exists):', filepath);
      continue;
    }
    console.log('Generating chip', spec.value, '...');

    let data = null;
    if (ai) {
      data = await generateOneChip(ai, spec);
      if (data) saveImage(data, filepath);
    }
    if (!data) {
      await generateChipSharp(spec, filepath);
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log('---');
  console.log('Done. Chips in', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
