FROM node:20
WORKDIR /app
COPY package*.json ./
COPY apps/listings-service/package.json ./apps/listings-service/
RUN npm install
COPY . .
RUN npm run build:listings-service
EXPOSE 3004
EXPOSE 50052
CMD ["node", "/app/dist/apps/listings-service/src/main.js"]
