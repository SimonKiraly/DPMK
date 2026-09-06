# MHD Košice backend — production image (Railway deploys this).
#
# It lives at the REPO ROOT on purpose: Railway auto-detects `./Dockerfile` and
# builds with the Dockerfile builder even before it reads railway.json. The repo
# root is an Expo app, but this image only ever COPYs `backend/` — no `expo
# start`, no Metro, no Railpack/Nixpacks Node runtime is involved.
#
# Build context = repo root. `.dockerignore` keeps the Expo app + every
# node_modules out of the context.

# ---------- build: install all deps, compile TypeScript -> dist/ ----------
FROM node:20-slim AS build
WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# Drop dev dependencies so only runtime deps are carried into the final image.
RUN npm prune --omit=dev

# ---------- runtime: compiled JS + production node_modules only ----------
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# NO `ENV PORT` here — Railway injects PORT at runtime and the server must honour
# it (config.ts: `PORT` env, falling back to 8080 only for local `docker run`).
# The server binds 0.0.0.0:$PORT (server.ts). EXPOSE is a hint for local use.
EXPOSE 8080

CMD ["node", "dist/server.js"]
