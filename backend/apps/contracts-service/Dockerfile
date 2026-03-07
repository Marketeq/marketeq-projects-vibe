FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/contracts-service/package*.json ./apps/contracts-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/contracts-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/contracts-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3010
CMD ["node", "dist/main"]
