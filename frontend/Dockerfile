FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application (no VITE_* env needed — resolved at runtime from /config.js)
RUN npm run build

# Production stage - use Vite preview or serve
FROM node:20-alpine

WORKDIR /app

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install serve for production or use vite preview
RUN npm install -g serve

# Entrypoint writes /app/dist/config.js from runtime env vars before serve starts
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 5173

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Serve the built static files
CMD ["serve", "-s", "dist", "-l", "5173"]
