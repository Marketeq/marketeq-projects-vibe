FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/algolia-service/package*.json ./apps/algolia-service/
COPY shared/ ./shared/
RUN npm ci
COPY . .
RUN npx nest build algolia-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/algolia-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3008
CMD ["node", "dist/main"]
