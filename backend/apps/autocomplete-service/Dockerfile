FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/autocomplete-service/package*.json ./apps/autocomplete-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/autocomplete-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/autocomplete-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3019
CMD ["node", "dist/main"]
