FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/browsing-history-service/package*.json ./apps/browsing-history-service/
COPY shared/ ./shared/
RUN npm ci
COPY . .
RUN npx nest build browsing-history-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/browsing-history-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3034
CMD ["node", "dist/main"]
