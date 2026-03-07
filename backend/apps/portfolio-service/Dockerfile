FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/portfolio-service/package*.json ./apps/portfolio-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/portfolio-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/portfolio-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3015
CMD ["node", "dist/main"]
