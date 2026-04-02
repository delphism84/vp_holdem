#!/usr/bin/env node
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'fe', 'public', 'assets', 'cards');
const API_KEY = process.env.gemini_api_key;
const ENV_ENGINE = process.env.gemini_api_engine || '';
const MODEL = ENV_ENGINE.startsWith('imagen-') ? ENV_ENGINE : 'imagen-4.0-generate-001';

const CARD_W = 220;
const CARD_H = 308; // 2.5:3.5

const SUITS = [
  { code: 'S', symbol: '♠', color: '#111111' },
  { code: 'H', symbol: '♥', color: '#b00020' },
  { code: 'D', symbol: '♦', color: '#b00020' },
  { code: 'C', symbol: '♣', color: '#111111' },
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function generateBaseWithGemini(prompt) {
  if (!API_KEY) return null;
  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const res = await ai.models.generateImages({
      model: MODEL,
      prompt,
      config: { numberOfImages: 1, aspectRatio: '3:4' },
    });
    const imageBytes = res?.generatedImages?.[0]?.image?.imageBytes;
    if (!imageBytes) return null;
    return Buffer.from(imageBytes, 'base64');
  } catch (e) {
    console.warn('[deck-ai] gemini generate failed:', e?.message || e);
    return null;
  }
}

async function frontBasePng() {
  const prompt =
    'Clean premium poker card front background only. Vertical symmetry top and bottom halves. White ivory center, subtle ornamental border, no text, no suit symbols, no numbers.';
  const aiBuf = await generateBaseWithGemini(prompt);
  if (aiBuf) {
    return sharp(aiBuf).resize(CARD_W, CARD_H).png().toBuffer();
  }
  return sharp({
    create: {
      width: CARD_W,
      height: CARD_H,
      channels: 4,
      background: { r: 248, g: 245, b: 238, alpha: 1 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="6" width="${CARD_W - 12}" height="${CARD_H - 12}" rx="12" ry="12" fill="none" stroke="#c5a46d" stroke-width="2"/>
            <rect x="14" y="14" width="${CARD_W - 28}" height="${CARD_H - 28}" rx="10" ry="10" fill="none" stroke="#e7d3ad" stroke-width="1.5"/>
          </svg>`,
        ),
      },
    ])
    .png()
    .toBuffer();
}

async function backBasePng() {
  const prompt =
    'Classic casino card back design, vertical mirrored symmetry, deep navy and burgundy, geometric pattern, no text, no logos, premium but simple.';
  const aiBuf = await generateBaseWithGemini(prompt);
  if (aiBuf) {
    return sharp(aiBuf).resize(CARD_W, CARD_H).png().toBuffer();
  }
  return sharp({
    create: {
      width: CARD_W,
      height: CARD_H,
      channels: 4,
      background: { r: 41, g: 48, b: 92, alpha: 1 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="8" width="${CARD_W - 16}" height="${CARD_H - 16}" rx="10" ry="10" fill="none" stroke="#d5c7a2" stroke-width="2"/>
            <rect x="16" y="16" width="${CARD_W - 32}" height="${CARD_H - 32}" rx="8" ry="8" fill="none" stroke="#eee0bb" stroke-width="1.5"/>
          </svg>`,
        ),
      },
    ])
    .png()
    .toBuffer();
}

function rankText(rank) {
  if (rank === '10') return '10';
  return rank;
}

function centerSymbolScale(rank) {
  if (rank === 'A') return 62;
  if (['J', 'Q', 'K'].includes(rank)) return 56;
  if (rank === '10') return 42;
  return 46;
}

function cardFaceOverlaySvg(rank, suitSymbol, suitColor) {
  const r = rankText(rank);
  const cornerRankSize = rank === '10' ? 66 : 74;
  const cornerSuitSize = 64;
  const centerSuitSize = centerSymbolScale(rank);
  return Buffer.from(
    `<svg width="${CARD_W}" height="${CARD_H}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .idx {
          font-family: 'Times New Roman', serif;
          font-weight: 800;
          fill: ${suitColor};
          paint-order: stroke;
          stroke: rgba(255,255,255,0.45);
          stroke-width: 1.5;
        }
        .pip {
          font-family: 'Times New Roman', serif;
          fill: ${suitColor};
          opacity: 0.96;
        }
        .zen {
          font-family: 'Times New Roman', serif;
          font-weight: 700;
          letter-spacing: 3px;
        }
      </style>
      <g>
        <text class="idx" x="14" y="72" font-size="${cornerRankSize}">${r}</text>
        <text class="pip" x="${CARD_W - 70}" y="66" font-size="${cornerSuitSize}">${suitSymbol}</text>
      </g>
      <g opacity="0.16">
        <text class="zen" x="${CARD_W / 2}" y="${CARD_H / 2 - 6}" text-anchor="middle" font-size="34" fill="#6b5a44">ZENITH</text>
        <text class="zen" x="${CARD_W / 2}" y="${CARD_H / 2 + 28}" text-anchor="middle" font-size="20" fill="#8a7654">P O K E R</text>
      </g>
      <text class="pip" x="${CARD_W / 2}" y="${CARD_H / 2 + centerSuitSize / 2 + 26}" text-anchor="middle" font-size="${centerSuitSize}" opacity="0.24">
        ${suitSymbol}
      </text>
      <g transform="translate(${CARD_W}, ${CARD_H}) rotate(180)" opacity="0.18">
        <text class="idx" x="14" y="72" font-size="${Math.max(44, cornerRankSize - 16)}">${r}</text>
        <text class="pip" x="${CARD_W - 62}" y="62" font-size="${Math.max(42, cornerSuitSize - 18)}">${suitSymbol}</text>
      </g>
    </svg>`,
  );
}

async function buildDeck() {
  ensureDir(OUT_DIR);
  const faceBase = await frontBasePng();
  const backBase = await backBasePng();

  for (const s of SUITS) {
    for (const r of RANKS) {
      const name = `${s.code}${r}`;
      const out = path.join(OUT_DIR, `${name}.webp`);
      const svg = cardFaceOverlaySvg(r, s.symbol, s.color);
      await sharp(faceBase).composite([{ input: svg }]).webp({ quality: 92 }).toFile(out);
      console.log('saved', out);
    }
  }

  await sharp(backBase).webp({ quality: 92 }).toFile(path.join(OUT_DIR, 'card_back.webp'));
  await sharp(backBase).png().toFile(path.join(OUT_DIR, 'card_back.png'));
  console.log('saved card_back');
}

buildDeck().catch((e) => {
  console.error(e);
  process.exit(1);
});

