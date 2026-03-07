FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/affiliate-referral-service/package*.json ./apps/affiliate-referral-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/affiliate-referral-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/affiliate-referral-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3021
CMD ["node", "dist/main"]
