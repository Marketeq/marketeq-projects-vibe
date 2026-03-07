FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/content-moderation-service/package*.json ./apps/content-moderation-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/content-moderation-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/content-moderation-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3018
CMD ["node", "dist/main"]
