FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/earnings-service/package*.json ./apps/earnings-service/
COPY shared/ ./shared/
RUN npm ci
COPY . .
RUN npx nest build earnings-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/earnings-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3011
CMD ["node", "dist/main"]
