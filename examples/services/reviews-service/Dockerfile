FROM node:18-alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM node:18-alpine AS development

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 4002

# Start the application in development mode
CMD ["npm", "run", "start:dev"]

# Production stage
FROM base AS production

# Copy built application from development stage
COPY --from=development /usr/src/app/dist ./dist

# Copy source for any runtime requirements
COPY --from=development /usr/src/app/src ./src

# Expose port
EXPOSE 4002

# Start the application
CMD ["npm", "run", "start:prod"]