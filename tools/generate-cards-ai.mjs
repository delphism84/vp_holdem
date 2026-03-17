#!/usr/bin/env node
/**
 * Imagen API로 평범한 포커 카드 이미지 생성 (뒷면 + 스페이드 A~K)
 * .env: gemini_api_key, gemini_api_engine (imagen-4.0-generate-001)
 * 비율 2.5:3.5 → 3:4
 */
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'output', 'cards');
const API_KEY = process.env.gemini_api_key;
const ENV_ENGINE = process.env.gemini_api_engine || '';
const MODEL = ENV_ENGINE.startsWith('imagen-') ? ENV_ENGINE : 'imagen-4.0-generate-001';

if (!API_KEY) {
  console.error('Missing gemini_api_key in .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/** 뒷면 + 스페이드 A,2,3,4,5,6,7,8,9,10,J,Q,K (파일명, 프롬프트용 라벨) */
const CARD_SPECS = [
  { file: 'card_back', label: 'card back', prompt: 'Plain playing card back. Simple geometric or dotted pattern, single color, minimal design. Standard poker card shape, no text. Boring, generic casino style.' },
  { file: 'card_s_01', label: 'Ace of Spades', prompt: 'Plain white playing card face. Single large black spade symbol in center. Minimal design, no decorations. Standard poker card proportion 2.5:3.5. Only the spade, nothing else.' },
  { file: 'card_s_02', label: '2 of Spades', prompt: 'Plain white playing card face. Two black spade symbols, simple layout. Minimal design. Standard poker card 2.5:3.5. Nothing else.' },
  { file: 'card_s_03', label: '3 of Spades', prompt: 'Plain white playing card face. Three black spade symbols, simple layout. Minimal design. Standard poker card 2.5:3.5.' },
  { file: 'card_s_04', label: '4 of Spades', prompt: 'Plain white playing card face. Four black spade symbols in corners, minimal. Standard poker card 2.5:3.5.' },
  { file: 'card_s_05', label: '5 of Spades', prompt: 'Plain white playing card face. Five black spade symbols, one center and four corners. Minimal. Standard poker card 2.5:3.5.' },
  { file: 'card_s_06', label: '6 of Spades', prompt: 'Plain white playing card face. Six black spade symbols in two rows. Minimal. Standard poker card 2.5:3.5.' },
  { file: 'card_s_07', label: '7 of Spades', prompt: 'Plain white playing card face. Seven black spade symbols. Minimal. Standard poker card 2.5:3.5.' },
  { file: 'card_s_08', label: '8 of Spades', prompt: 'Plain white playing card face. Eight black spade symbols. Minimal. Standard poker card 2.5:3.5.' },
  { file: 'card_s_09', label: '9 of Spades', prompt: 'Plain white playing card face. Nine black spade symbols. Minimal. Standard poker card 2.5:3.5.' },
  { file: 'card_s_10', label: '10 of Spades', prompt: 'Plain white playing card face. Ten black spade symbols. Minimal. Standard poker card 2.5:3.5.' },
  { file: 'card_s_11', label: 'Jack of Spades', prompt: 'Plain white playing card face. Single black spade and letter J. Minimal design. Standard poker card 2.5:3.5.' },
  { file: 'card_s_12', label: 'Queen of Spades', prompt: 'Plain white playing card face. Single black spade and letter Q. Minimal design. Standard poker card 2.5:3.5.' },
  { file: 'card_s_13', label: 'King of Spades', prompt: 'Plain white playing card face. Single black spade and letter K. Minimal design. Standard poker card 2.5:3.5.' },
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function saveImage(imageBytes, filepath) {
  if (!imageBytes) return false;
  ensureDir(path.dirname(filepath));
  const buf = Buffer.from(imageBytes, 'base64');
  fs.writeFileSync(filepath, buf);
  console.log('  Saved:', filepath);
  return true;
}

async function generateImage(prompt) {
  try {
    const res = await ai.models.generateImages({
      model: MODEL,
      prompt,
      config: { numberOfImages: 1, aspectRatio: '3:4' },
    });
    const img = res?.generatedImages?.[0]?.image;
    if (img?.imageBytes) return img.imageBytes;
  } catch (e) {
    console.warn('  generateImages failed:', e.message);
  }
  return null;
}

async function main() {
  ensureDir(OUT_DIR);
  console.log('Card AI generator. Model:', MODEL);
  console.log('---');

  for (const spec of CARD_SPECS) {
    const filepath = path.join(OUT_DIR, `${spec.file}.png`);
    if (fs.existsSync(filepath)) {
      console.log('Skip (exists):', filepath);
      continue;
    }
    console.log('Generating', spec.label, '...');
    const data = await generateImage(spec.prompt);
    if (data) saveImage(data, filepath);
    await new Promise((r) => setTimeout(r, 700));
  }

  console.log('---');
  console.log('Done. Cards in', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
