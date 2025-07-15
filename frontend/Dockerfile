#Use Node.js official image
FROM node:18-alpine

#Set working directory
WORKDIR /frontend

#Copy package files first (for better Docker layer caching)
COPY package*.json ./

#Install dependencies
RUN npm ci --only=production=false

#Copy source code
COPY . .

#Build the application
RUN npm run build

#Install a simple HTTP server to serve the built files
RUN npm install -g serve

#Expose port 3000
EXPOSE 3000

#Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]