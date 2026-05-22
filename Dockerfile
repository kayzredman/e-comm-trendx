# Stage 1: Build
FROM node:20-slim AS build
WORKDIR /app

RUN npm install -g pnpm@9.4.0

# Copy manifests for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/nest-cli.json apps/api/tsconfig.json ./apps/api/
COPY packages/db/package.json packages/db/tsconfig.json ./packages/db/
COPY packages/types/package.json packages/types/tsconfig.json ./packages/types/
COPY packages/config/package.json packages/config/tsconfig.json ./packages/config/

# Install all deps (including devDependencies for build tools like @nestjs/cli)
RUN NODE_ENV=development pnpm install --frozen-lockfile

# Copy source files
COPY apps/api/src ./apps/api/src
COPY packages/db/src ./packages/db/src
COPY packages/types/src ./packages/types/src
COPY packages/config/src ./packages/config/src

# Build packages first, then the API
RUN pnpm --filter @trendmarga/db --filter @trendmarga/types --filter @trendmarga/config build

# Build API with full debug output
RUN echo "=== API src files ===" && find /app/apps/api/src -name "*.ts" | head -20
RUN echo "=== Running nest build ===" && \
    pnpm --filter @trendmarga/api build 2>&1 || true && \
    echo "=== dist after nest build ===" && \
    find /app/apps/api/dist -type f 2>/dev/null | head -20 || echo "(no dist files)"
RUN if [ ! -f /app/apps/api/dist/main.js ]; then \
      echo "nest build did not produce dist/main.js — running tsc directly" && \
      cd /app/apps/api && \
      ../../node_modules/.bin/tsc -p tsconfig.json 2>&1 || true && \
      echo "=== dist after tsc ===" && \
      find /app/apps/api/dist -type f 2>/dev/null | head -20 || echo "(no dist files)"; \
    fi
RUN ls /app/apps/api/dist/main.js

# Stage 2: Runtime
FROM node:20-slim
WORKDIR /app

# Copy everything from build stage (preserves pnpm workspace symlinks + compiled output)
COPY --from=build /app .

EXPOSE 4001
CMD ["node", "apps/api/dist/main.js"]
