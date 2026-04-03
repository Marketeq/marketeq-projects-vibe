# Use Node.js base image
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy .env file first

# Copy all source code
COPY . .

# Build the application
RUN npm run build:api-gateway

# Expose port
EXPOSE 3002

# Start the application
CMD ["node","dist/apps/api-gateway/src/main.js"]
