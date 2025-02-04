# Use official Node.js image
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy package.json first (for caching layers)
COPY backend/package.json backend/package-lock.json ./

# Install dependencies
RUN npm install

# Copy all backend files into the container
COPY backend ./

# Expose port (Fly.io will map this automatically)
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
