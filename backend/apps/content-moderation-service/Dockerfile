FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:content-moderation-service
EXPOSE 3014
CMD ["node", "apps/content-moderation-service/dist/main.js"]
