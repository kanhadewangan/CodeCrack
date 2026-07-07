FROM oven/bun:latest AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune backend --docker

FROM oven/bun:latest AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN bun install --frozen-lockfile
COPY --from=pruner /app/out/full/ .
RUN bunx turbo run build --filter=backend

FROM oven/bun:latest AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
WORKDIR /app/apps/backend
CMD ["bun", "run", "dist/index.js"]