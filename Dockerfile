# Stage 1: Build
FROM node:20-slim AS build
WORKDIR /app

RUN npm install -g pnpm@9.4.0

# Copy entire monorepo (no .gitignore filtering inside Docker)
COPY . .

# Install all deps (including devDeps for build tools like @nestjs/cli)
RUN NODE_ENV=development pnpm install --frozen-lockfile

# Build shared packages first, then the API
RUN pnpm --filter @trendmarga/db --filter @trendmarga/types --filter @trendmarga/config build
RUN pnpm --filter @trendmarga/api build

# Stage 2: Runtime — copy everything from build (includes apps/api/dist/)
FROM node:20-slim
WORKDIR /app
COPY --from=build /app .

CMD ["node", "apps/api/dist/main.js"]
