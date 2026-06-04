FROM node:20-alpine AS deps
# Isolated install — no parent package.json, no workspace context
WORKDIR /svc
COPY apps/legal-service/package.json ./
RUN npm install --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app

# Root devDeps (NestJS CLI) only
COPY package.json nest-cli.json tsconfig.json ./
RUN npm install --legacy-peer-deps --ignore-scripts

# Service source + isolated node_modules from deps stage
COPY apps/legal-service/ ./apps/legal-service/
COPY --from=deps /svc/node_modules ./apps/legal-service/node_modules
COPY shared/ ./shared/

RUN npx nest build legal-service

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /svc/node_modules ./node_modules
COPY --from=builder /app/dist/apps/legal-service ./dist
EXPOSE 3015
CMD ["node", "dist/main"]
