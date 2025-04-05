# Use official Node.js image
FROM node:18

# Create app directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your code
COPY . .

# Expose the port Cloud Run uses
EXPOSE 8080

# Start the app
CMD ["npm", "start"]
