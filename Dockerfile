# --- Builder Stage ---
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build the frontend assets
RUN npm run build

# --- Production Stage ---
FROM node:20-slim

WORKDIR /app

# Install native dependencies needed for better-sqlite3 build
# Note: we install them in the final image because better-sqlite3 might need to rebuild or link
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built assets and required source files for tsx
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/src ./src

# Create data directory for persistent SQLite database
RUN mkdir -p /app/data && chown node:node /app/data

# Use the non-root node user for better security
USER node

# Set environment variable for production
ENV NODE_ENV=production
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Start the application
# We use tsx since it's in dependencies and handles TS files directly
CMD ["npx", "tsx", "server.ts"]
