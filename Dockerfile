# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and install root dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy server package files
COPY server/package.json server/package-lock.json server/

# Copy client package files
COPY client-svelte/package.json client-svelte/package-lock.json client-svelte/

# Install dependencies for all packages
RUN npm ci --prefix server && npm ci --prefix client-svelte

# Copy source code
COPY server/ server/
COPY client-svelte/ client-svelte/

# Build the application
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS runner

WORKDIR /app

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts from builder
COPY --from=builder /app/server/dist ./server/dist/
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/server/package-lock.json ./server/package-lock.json

# Copy the Svelte build
COPY --from=builder /app/client-svelte/build ./client-svelte/build/

# Install only production dependencies for the server
RUN npm ci --prefix server --omit=dev

RUN mkdir -p /app/data && chown nodejs:nodejs /app/data

# Create a volume for the SQLite database
VOLUME ["/app/data"]

EXPOSE 3010

ENV NODE_ENV=production
ENV PORT=3010

USER nodejs

CMD ["node", "server/dist/index.js"]
