# Étape de build
FROM node:20-alpine AS builder

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY prisma ./prisma/

# Installer les dépendances (y compris les devDependencies nécessaires pour le build)
RUN npm ci

# Copier tout le code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Construire l'application NestJS
RUN npm run build

# Étape de production
FROM node:20-alpine

WORKDIR /app

# Copier seulement les éléments nécessaires depuis l'étape de build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Exposer le port (Render définit par défaut la variable d'environnement PORT, NestJS l'utilisera)
EXPOSE 3000

# Commande de démarrage
CMD [ "npm", "run", "start:prod" ]
