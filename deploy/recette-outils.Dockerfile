# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Outils de RECETTE LOCALE (jamais en production) : création du schéma sur la
# base locale VIDE (prisma db push + prisma/sql/*.sql) et seed des membres
# fictifs (npm run seed:recette). Utilisé par docker-compose.recette.yml.
#
# Image distincte de l'API : elle garde les dépendances de développement
# (ts-node) que l'image de production retire.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm
WORKDIR /app
ENV CI=1 NODE_ENV=development

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN --mount=type=secret,id=ca,required=false \
    --mount=type=cache,target=/root/.npm \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca npm_config_cafile=/run/secrets/ca; fi; \
    npm ci --no-audit --no-fund \
      --registry=https://registry.npmjs.org/ \
      --replace-registry-host=registry.npmmirror.com

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY config ./config
COPY deploy/recette-init.js ./deploy/recette-init.js
# Jeu de données du seed des partenaires fictifs (seed:recette:partenaires).
COPY mobile-steve/e2e/recette-partenaires-data.js ./mobile-steve/e2e/recette-partenaires-data.js
RUN --mount=type=secret,id=ca,required=false \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    ./node_modules/.bin/prisma generate

CMD ["node", "deploy/recette-init.js"]
