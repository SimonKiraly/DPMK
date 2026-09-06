# MHD Košice backend — production image for Railway.
#
# Railway builds this via the repo-root railway.json:
#   build.builder        = "DOCKERFILE"
#   build.dockerfilePath = "backend/Dockerfile"
# The build context is the repository root, so every COPY path is `backend/...`.
# The root .dockerignore trims the context to `backend/` (minus node_modules/dist).
#
# This image builds and runs ONLY the Fastify backend. It never touches the Expo
# / React Native app at the repo root — no `expo start`, no Metro, no dev server.

# ---------- build: install all deps, compile TypeScript -> dist/ ----------
FROM node:20-slim AS build
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# Strip dev dependencies so only the runtime deps are carried forward.
RUN npm prune --omit=dev

# ---------- runtime: compiled JS + production node_modules only ----------
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Railway injects $PORT at runtime; server.ts reads it (config.ts) and binds
# 0.0.0.0:$PORT. 8080 is only the local default and a documentation hint.
ENV PORT=8080
EXPOSE 8080

# Compiled entrypoint — the production start command. Not `npm`, not `tsx`.
CMD ["node", "dist/server.js"]
