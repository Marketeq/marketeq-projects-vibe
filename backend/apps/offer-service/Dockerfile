FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:offer-service
EXPOSE 3023
CMD ["node", "/app/dist/apps/offer-service/apps/offer-service/src/main.js"]