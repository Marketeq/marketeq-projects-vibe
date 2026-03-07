FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/user-service/package*.json ./apps/user-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/user-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/user-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/main"]
