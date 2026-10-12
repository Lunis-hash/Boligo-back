# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# API BOLIGO (NestJS + Prisma) — image de production, multi-étapes.
#
#   docker build -t boligo-api .
#   docker run --init --env-file .env -p 3000:3000 boligo-api
#   curl http://localhost:3000/api/health
#
# Réseau avec proxy TLS d'entreprise (facultatif) : passer le certificat racine
# en *secret* de build (il n'est jamais copié dans une couche de l'image) :
#   docker build --network host --secret id=ca,src=/chemin/ca.crt \
#     --build-arg HTTPS_PROXY=http://... -t boligo-api .
#
# Aucune commande apt : les deux étapes partagent la même version de Debian
# (bookworm) ; la bibliothèque OpenSSL dont Prisma a besoin à l'exécution est
# reprise de l'image de construction.
# ─────────────────────────────────────────────────────────────────────────────

# ── 1. Construction (image complète : openssl, outils de compilation) ───────
FROM node:22-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma

# Le package-lock.json résout une partie des paquets vers registry.npmmirror.com
# (inaccessible depuis certains réseaux) : ces adresses sont réécrites vers le
# registre officiel. Les sommes de contrôle (integrity) restent vérifiées.
RUN --mount=type=secret,id=ca,required=false \
    --mount=type=cache,target=/root/.npm \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca npm_config_cafile=/run/secrets/ca; fi; \
    npm ci --no-audit --no-fund \
      --registry=https://registry.npmjs.org/ \
      --replace-registry-host=registry.npmmirror.com

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY config ./config

# Client Prisma (moteur adapté à debian-openssl-3.0.x) puis compilation Nest.
RUN --mount=type=secret,id=ca,required=false \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    npx prisma generate \
 && npx nest build \
 && test -f dist/main.js \
 && test -f dist/ai/sondeur-router.js

# Dépendances de production seulement. `prisma` (CLI) est une dépendance
# d'exécution : `npx prisma db push` reste possible depuis le conteneur.
RUN npm prune --omit=dev --no-audit --no-fund

# Bibliothèques OpenSSL 3 pour l'image d'exécution (chemin propre à l'architecture).
RUN mkdir -p /opt/ssl \
 && cp -L /usr/lib/*-linux-gnu/libssl.so.3 /usr/lib/*-linux-gnu/libcrypto.so.3 /opt/ssl/

# ── 2. Exécution ────────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime
ARG APP_VERSION=""
ENV NODE_ENV=production \
    PORT=3000 \
    APP_VERSION=${APP_VERSION}

COPY --from=build /opt/ssl/ /usr/local/lib/
RUN ldconfig

WORKDIR /app
COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/dist ./dist
# Qualification des modèles du Sondeur : src/ai/sondeur-router.ts la lit à
# join(__dirname, '..', '..', 'config', 'sondeur-models.json') ; compilé dans
# /app/dist/ai/, cela donne /app/config/sondeur-models.json.
COPY --from=build --chown=node:node /app/config ./config

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Lancer avec `docker run --init` (ou `init: true` dans compose) pour que
# SIGTERM soit bien transmis et les processus zombies récoltés.
CMD ["node", "--max-old-space-size=512", "dist/main.js"]
