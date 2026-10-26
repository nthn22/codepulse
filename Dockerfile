# ============================================================
# CodePulse -- single-service Dockerfile
# Mirrors the existing Render/Railway deployment model:
# Express serves the built React app + the API, one process,
# one port. This is why there's only ONE image, not two.
#
# Path math verified against server/src/index.js:
#   __dirname (= /app/server/src) + '../../client/dist'
#   = /app/client/dist  <-- matches where this Dockerfile puts it
# ============================================================

# --- Stage 1: build the React frontend ---
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build
# Output lands in /app/client/dist (Vite's default build output folder)

# --- Stage 2: install server deps + generate Prisma client ---
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
RUN npx prisma generate

# --- Stage 3: final runtime image ---
FROM node:20-alpine
WORKDIR /app

# Server code + production node_modules
COPY --from=server-build /app/server ./server

# Built frontend -- must land at /app/client/dist to match
# the express.static() path math above
COPY --from=client-build /app/client/dist ./client/dist

WORKDIR /app/server

# NODE_ENV=production is what flips isProd to true in index.js,
# which is what makes it serve the static frontend at all.
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "src/index.js"]
