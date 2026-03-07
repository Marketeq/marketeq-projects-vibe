FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/admin-service/package*.json ./apps/admin-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/admin-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/admin-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3022
CMD ["node", "dist/main"]
