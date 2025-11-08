# Stage 1: Development build
FROM node:20-bullseye-slim as development

# Set environment
ENV NODE_ENV=development

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Install NestJS CLI globally
RUN npm install -g @nestjs/cli

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production build
FROM node:20-alpine as production

# Set environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Create app directory
WORKDIR /usr/src/app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy built application from development stage
COPY --from=development --chown=nestjs:nodejs /usr/src/app/dist ./dist
COPY --from=development --chown=nestjs:nodejs /usr/src/app/node_modules ./node_modules

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/main"]