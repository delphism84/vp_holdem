#!/usr/bin/env node
/**
 * Zenith Park - Gemini API로 게임용 이미지 생성
 * .env: gemini_api_key, gemini_api_engine (예: gemini-2.5-flash-preview-image-generation)
 * 1) 카드 앞면 (표준 포커 카드 비율 2.5:3.5)
 * 2) 카드 뒷면 (Zenith Park 로고 스타일)
 * 3) 칩 이미지
 * 4) 플레이어 프로필: 여자 5명, 남자 5명
 */
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, 'output');
const API_KEY = process.env.gemini_api_key;
// 이미지 생성: Imagen 또는 Gemini 이미지 모델 (API에서 지원하는 이름으로 .env에 설정)
const MODEL = process.env.gemini_api_engine || 'imagen-3.0-generate-002';
const MODEL_CONTENT = process.env.gemini_api_engine_content || 'gemini-2.0-flash';

if (!API_KEY) {
  console.error('Missing gemini_api_key in .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function saveImage(imageBytes, filepath) {
  if (!imageBytes) return false;
  ensureDir(path.dirname(filepath));
  const buf = Buffer.from(imageBytes, 'base64');
  fs.writeFileSync(filepath, buf);
  console.log('  Saved:', filepath);
  return true;
}

/** generateContent로 이미지 생성 (Gemini 이미지 지원 모델) */
async function generateImageWithContent(prompt, aspectRatio = '3:4') {
  try {
    const res = await ai.models.generateContent({
      model: MODEL_CONTENT,
      contents: prompt,
      config: {
        responseModalities: ['text', 'image'],
        responseMimeType: 'text/plain',
        imageConfig: { aspectRatio },
      },
    });
    const parts = res?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return part.inlineData.data;
      }
    }
  } catch (e) {
    console.warn('  generateContent image failed:', e.message);
  }
  return null;
}

/** generateImages (Imagen) */
async function generateImageWithImagen(prompt, config = {}) {
  try {
    const res = await ai.models.generateImages({
      model: MODEL,
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: config.aspectRatio || '3:4',
        ...config,
      },
    });
    const img = res?.generatedImages?.[0]?.image;
    if (img?.imageBytes) return img.imageBytes;
  } catch (e) {
    console.warn('  generateImages failed:', e.message);
  }
  return null;
}

async function generateOne(prompt, filepath, aspectRatio = '3:4') {
  let data = await generateImageWithImagen(prompt, { aspectRatio });
  if (!data) data = await generateImageWithContent(prompt, aspectRatio);
  if (data) return saveImage(data, filepath);
  return false;
}

async function main() {
  ensureDir(OUT_DIR);
  const cardsDir = path.join(OUT_DIR, 'cards');
  const chipsDir = path.join(OUT_DIR, 'chips');
  const avatarsDir = path.join(OUT_DIR, 'avatars');

  console.log('Model:', MODEL);
  console.log('---');

  // 1) 카드 앞면 (표준 포커 카드 비율 ≈ 2.5:3.5 → 3:4에 가깝게)
  console.log('1) Card faces (sample: Ace of Spades, Heart, Diamond, Club)...');
  const suits = [
    { name: 'Ace of Spades', file: 'card_spades_a' },
    { name: 'Ace of Hearts', file: 'card_hearts_a' },
    { name: 'Ace of Diamonds', file: 'card_diamonds_a' },
    { name: 'Ace of Clubs', file: 'card_clubs_a' },
  ];
  for (const s of suits) {
    await generateOne(
      `Professional poker playing card face, standard design: ${s.name}. White or cream card with red and black suit symbols, corner indices, clean casino style. No text except rank and suit.`,
      path.join(cardsDir, `${s.file}.png`),
      '3:4'
    );
    await new Promise((r) => setTimeout(r, 500));
  }

  // 2) 카드 뒷면은 card-back-composite.mjs에서 ZP 로고로 합성
  console.log('2) Card back: run node card-back-composite.mjs (uses ZP logo)');
  ensureDir(cardsDir);

  // 3) 칩
  console.log('3) Poker chips...');
  await generateOne(
    'Single poker chip, casino style, red and gold edge, top view, glossy, professional. No text.',
    path.join(chipsDir, 'chip_red.png'),
    '1:1'
  );
  await new Promise((r) => setTimeout(r, 500));
  await generateOne(
    'Single poker chip, casino style, blue and silver edge, top view, glossy.',
    path.join(chipsDir, 'chip_blue.png'),
    '1:1'
  );
  await new Promise((r) => setTimeout(r, 500));
  await generateOne(
    'Single poker chip, casino style, green and gold edge, top view, glossy.',
    path.join(chipsDir, 'chip_green.png'),
    '1:1'
  );

  // 4) 플레이어 프로필: 여자 5, 남자 5
  console.log('4) Player avatars (female 5, male 5)...');
  for (let i = 1; i <= 5; i++) {
    await generateOne(
      `Portrait avatar for game profile, woman, neutral expression, shoulders and head only, simple background, cartoon or semi-realistic style, suitable for casino game. Variation ${i}.`,
      path.join(avatarsDir, 'female', `avatar_f${i}.png`),
      '1:1'
    );
    await new Promise((r) => setTimeout(r, 600));
  }
  for (let i = 1; i <= 5; i++) {
    await generateOne(
      `Portrait avatar for game profile, man, neutral expression, shoulders and head only, simple background, cartoon or semi-realistic style, suitable for casino game. Variation ${i}.`,
      path.join(avatarsDir, 'male', `avatar_m${i}.png`),
      '1:1'
    );
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log('---');
  console.log('Done. Output:', OUT_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
