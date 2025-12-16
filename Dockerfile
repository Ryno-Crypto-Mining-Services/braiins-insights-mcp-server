# Braiins Insights MCP Server
# Multi-stage build for minimal production image

# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ============================================================================
# Stage 2: Production
# ============================================================================
FROM node:20-alpine AS production

# Add labels for GitHub Container Registry
LABEL org.opencontainers.image.source="https://github.com/Ryno-Crypto-Mining-Services/braiins-insights-mcp-server"
LABEL org.opencontainers.image.description="MCP Server for Braiins Insights Bitcoin Mining Analytics API"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.vendor="Ryno Crypto Mining Services"

# Security: Run as non-root user
RUN addgroup -g 1001 -S mcp && \
    adduser -u 1001 -S mcp -G mcp

WORKDIR /app

# Copy production dependencies and built files
COPY --from=builder --chown=mcp:mcp /app/node_modules ./node_modules
COPY --from=builder --chown=mcp:mcp /app/dist ./dist
COPY --from=builder --chown=mcp:mcp /app/package.json ./

# Switch to non-root user
USER mcp

# Environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Health check - verify the server can start
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('./dist/index.js')" || exit 1

# MCP servers use stdio transport, so we run the main entry point
ENTRYPOINT ["node", "dist/index.js"]
