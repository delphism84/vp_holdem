#!/usr/bin/env node
/**
 * tools/output → fe/public/assets 로 복사 (게임에서 사용)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'output');
const FE_PUBLIC = path.join(__dirname, '..', 'fe', 'public', 'assets');
const FE_ASSETS = path.join(__dirname, '..', 'fe', 'assets');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(OUT)) {
  console.log('No output folder. Run: npm run generate');
  process.exit(0);
}

copyRecursive(path.join(OUT, 'cards'), path.join(FE_PUBLIC, 'cards'));
copyRecursive(path.join(OUT, 'chips'), path.join(FE_PUBLIC, 'chips'));
copyRecursive(path.join(OUT, 'avatars'), path.join(FE_PUBLIC, 'avatars'));
console.log('Copied to', FE_PUBLIC);
if (fs.existsSync(path.join(__dirname, '..', 'fe', 'assets'))) {
  copyRecursive(path.join(OUT, 'cards'), path.join(FE_ASSETS, 'cards'));
  copyRecursive(path.join(OUT, 'chips'), path.join(FE_ASSETS, 'chips'));
  copyRecursive(path.join(OUT, 'avatars'), path.join(FE_ASSETS, 'avatars'));
  console.log('Copied to', FE_ASSETS);
}
