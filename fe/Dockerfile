# ZenithPark FE — 빌드 후 nginx 정적 서빙 이미지 (호스트 nginx는 /var/zenithpark/fe/dist 를 그대로 사용)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.25-alpine
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
