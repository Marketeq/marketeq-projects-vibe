FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/search-service/package*.json ./apps/search-service/
COPY shared/ ./shared/
RUN npm ci
COPY . .
RUN npx nest build search-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/search-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3007
CMD ["node", "dist/main"]
