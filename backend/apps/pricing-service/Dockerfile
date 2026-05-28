FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE $PORT
CMD ["node", "dist/apps/pricing-service/src/main.js"]
