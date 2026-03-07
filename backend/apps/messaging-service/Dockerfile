FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/messaging-service/package*.json ./apps/messaging-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/messaging-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/messaging-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3005
CMD ["node", "dist/main"]
