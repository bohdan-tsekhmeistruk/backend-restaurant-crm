# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate && npm run build

# ---------- Runtime stage ----------
FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Full node_modules (incl. the prisma CLI) so the container can apply
# migrations on startup via `prisma migrate deploy`.
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./

USER node
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/index.js"]
