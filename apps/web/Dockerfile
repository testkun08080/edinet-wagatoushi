FROM node:22-slim

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# Copy lockfile + workspace metadata from monorepo root for layer caching.
# Compose mounts the full repo on top at runtime, so this just primes the store.
COPY package.json ./

EXPOSE 3000
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
