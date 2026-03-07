FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/payout-service/package*.json ./apps/payout-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/payout-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/payout-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3014
CMD ["node", "dist/main"]
