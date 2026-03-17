# Zenith Park Tools

Gemini API로 게임용 이미지 생성 (카드, 칩, 프로필 아바타).

## 설정

- `.env`: `gemini_api_key`, `gemini_api_engine` (이미지 생성 모델)
- **이미지 생성**: Gemini API 기준 `imagen-4.0-generate-001` 사용 (Imagen 4).  
  `imagen-3.0-generate-002`는 v1beta에서 404 발생.

## 스크립트

- `npm run card-back` — 카드 뒷면 생성 (fe/assets/logo/zp.png 로고 합성)
- `npm run chips` — Sharp로 칩 아이콘 생성 (chip_red, chip_blue, …)
- `npm run chips:ai` — Gemini로 실제 칩처럼 10/100/1k/10k 등 액면별 AI 칩 이미지 생성 (output/chips/chip_10.png 등)
- `npm run generate` — Gemini로 카드 앞면 샘플, 칩(AI), 여/남 프로필 각 5장 생성
- `npm run copy-assets` — `output/` → `fe/public/assets/` 복사
- `npm run all` — card-back + generate + copy-assets 순서 실행

## 결과물

- `output/cards/` — 카드 앞면 샘플, card_back.png (ZP 로고)
- `output/chips/` — 칩 이미지
- `output/avatars/female|male/` — 프로필 아바타

이미지 생성 모델이 404일 경우 `.env`의 `gemini_api_engine`을 Google AI Studio에서 지원하는 이미지 모델명으로 바꾼 뒤 다시 실행하세요.
