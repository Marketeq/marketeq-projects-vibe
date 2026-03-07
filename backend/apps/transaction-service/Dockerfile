FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/transaction-service/package*.json ./apps/transaction-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/transaction-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/transaction-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3016
CMD ["node", "dist/main"]
