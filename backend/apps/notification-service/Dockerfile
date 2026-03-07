FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/notification-service/package*.json ./apps/notification-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/notification-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/notification-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3006
CMD ["node", "dist/main"]
