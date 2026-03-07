FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/invitations-service/package*.json ./apps/invitations-service/
COPY shared/ ./shared/
RUN npm install
COPY . .
RUN npm run build -w apps/invitations-service

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist/apps/invitations-service ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3013
CMD ["node", "dist/main"]
