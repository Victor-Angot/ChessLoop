# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build \
  && npm rebuild better-sqlite3 \
  && npm prune --omit=dev \
  && npm rebuild better-sqlite3

ENV NODE_ENV=production
ENV PORT=3001
ENV SERVE_STATIC=1

EXPOSE 3001

CMD ["npm", "run", "start"]
