FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/suggestions-service/package*.json ./apps/suggestions-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/suggestions-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/suggestions-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3020
CMD ["node", "dist/main"]
