# SIDE EYE — all-in-one deploy.
#
# Builds the client and serves it from the same Node process that runs the
# WebSocket game server, so one container is the whole product. Works on any
# host that runs containers with persistent processes (Fly.io, Railway, Render,
# Cloud Run with min-instances >= 1).

# ── build the client ──
FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
# Same-origin: the server serves these files, so no VITE_SERVER_URL needed.
RUN npm run build

# ── server runtime ──
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
# --ignore-scripts skips the postinstall that would install client deps again.
RUN npm ci --omit=dev --ignore-scripts

COPY server ./server
COPY --from=client /app/client/dist ./client/dist

ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server/index.js"]
