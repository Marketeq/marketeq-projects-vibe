FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/favorites-service/package*.json ./apps/favorites-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/favorites-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/favorites-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3012
CMD ["node", "dist/main"]
