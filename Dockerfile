# 로컬 PoC 검증용 웹: 빌드한 화면을 nginx 로 내보내고 /api, /mcp 는 백엔드로 넘긴다
FROM node:20-alpine AS build
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
