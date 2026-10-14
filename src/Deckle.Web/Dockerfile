# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies without running lifecycle scripts. None are needed:
# the remaining install scripts (esbuild, core-js, protobufjs) only verify or
# print messages, and `vite build` runs `svelte-kit sync` (the `prepare` step).
RUN npm ci --ignore-scripts

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Set production environment
ENV NODE_ENV=production
ENV PORT=5173

# Expose the application port
EXPOSE 5173

# Run as the image's built-in non-root user. Copied files stay root-owned
# (world-readable) so the app can read but not modify them.
USER node

# Start the application
CMD ["node", "build"]
