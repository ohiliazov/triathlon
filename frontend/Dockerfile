# Use Node.js for building
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy the frontend code
COPY frontend/ ./frontend/

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
# Executing npm run frontend:build which translates to "next build frontend"
RUN npm run frontend:build

# Runner stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy package.json to have access to scripts
COPY package.json ./

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy the build artifacts and frontend source
COPY --from=builder /app/frontend ./frontend

# Expose the port
EXPOSE 3000

# Start the application
# Executing npm run frontend:start which translates to "next start frontend"
CMD ["npm", "run", "frontend:start"]
