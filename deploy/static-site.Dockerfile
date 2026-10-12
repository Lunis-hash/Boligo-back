# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# Sites statiques BOLIGO, servis par nginx (non-root) :
#  - application web (export Expo de mobile-steve/) :
#      docker build -f deploy/static-site.Dockerfile \
#        --build-context nginxconf=deploy/nginx \
#        --build-arg API_URL=https://api.exemple.fr/api mobile-steve
#  - tableau de bord admin (export Next.js de admin/) :
#      docker build -f deploy/static-site.Dockerfile \
#        --build-context nginxconf=deploy/nginx --build-arg API_URL=... \
#        --build-arg BUILD_CMD="npm run build" --build-arg OUT_DIR=out \
#        --build-arg NGINX_CONF=admin.conf admin
# L'adresse de l'API est figée dans les fichiers JS au moment du build
# (EXPO_PUBLIC_* / NEXT_PUBLIC_*) : reconstruire l'image si elle change.
# Ne JAMAIS passer de secret ici : tout ce qui est construit est public.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-bookworm AS build
WORKDIR /site
ARG API_URL=http://localhost:3000/api
ARG WEB_URL=""
ARG STRIPE_PUBLISHABLE_KEY=""
ARG BUILD_CMD="npx expo export --platform web && cp dist/index.html dist/404.html"
ENV EXPO_PUBLIC_API_URL=${API_URL} \
    NEXT_PUBLIC_API_URL=${API_URL} \
    NEXT_PUBLIC_WEB_URL=${WEB_URL} \
    EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY} \
    EXPO_NO_TELEMETRY=1 \
    NEXT_TELEMETRY_DISABLED=1 \
    CI=1

COPY package.json package-lock.json ./
RUN --mount=type=secret,id=ca,required=false \
    --mount=type=cache,target=/root/.npm \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca npm_config_cafile=/run/secrets/ca; fi; \
    npm ci --no-audit --no-fund \
      --registry=https://registry.npmjs.org/ \
      --replace-registry-host=registry.npmmirror.com
COPY . .
RUN --mount=type=secret,id=ca,required=false \
    if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; \
    sh -c "$BUILD_CMD"

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
ARG OUT_DIR=dist
ARG NGINX_CONF=web.conf
COPY --from=build /site/${OUT_DIR}/ /usr/share/nginx/html/
COPY --from=nginxconf ${NGINX_CONF} /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
