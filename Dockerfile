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
RUN pnpm --filter @trendmarga/api build

# Stage 2: Runtime
FROM node:20-slim
WORKDIR /app

# Copy everything from build stage (preserves pnpm workspace symlinks + compiled output)
COPY --from=build /app .

EXPOSE 4001
CMD ["node", "apps/api/server/main.js"]
