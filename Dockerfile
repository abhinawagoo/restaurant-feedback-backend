# Use official Node.js image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of your code
COPY . .

# Set environment variable for production
ENV NODE_ENV=production

# Expose the port expected by Cloud Run
EXPOSE 8080

# Start the app
CMD ["node", "src/server.js"]
