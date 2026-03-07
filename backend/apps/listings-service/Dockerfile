FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/listings-service/package*.json ./apps/listings-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/listings-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/listings-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3003
CMD ["node", "dist/main"]
