FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/time-tracking-service/package*.json ./apps/time-tracking-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/time-tracking-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/time-tracking-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3017
CMD ["node", "dist/main"]
