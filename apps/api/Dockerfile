FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

COPY package.json ./

EXPOSE 8787
CMD ["pnpm", "dev"]
