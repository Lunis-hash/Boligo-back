# Appels vidéo BOLIGO (Daily.co)

## Configuration (gratuit)

1. Créer un compte sur [https://dashboard.daily.co](https://dashboard.daily.co)
2. **Developers** → copier la **API key**
3. Dans `backend/.env` :
   ```env
   DAILY_API_KEY=votre_cle_api
   ```
4. Redémarrer le backend NestJS

Le plan gratuit Daily offre environ **10 000 participant-minutes / mois** — largement suffisant au lancement (un appel de 2 min × 2 personnes = 4 minutes).

## API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/journey/:id/video/session` | Statut, `canJoin`, config Daily |
| POST | `/api/journey/:id/video/join` | Crée/récupère la room + token → `meetingUrl` |
| POST | `/api/journey/:id/video/end` | Fin d'appel + passage `echange_contacts` |

## App mobile

L'écran `video-call` charge l'URL Daily Prebuilt dans une **WebView** (compatible Expo, pas de dev build natif obligatoire).

Les deux partenaires doivent ouvrir l'appel **chacun de leur côté** (même `journeyId`, tokens distincts).

## Durée

- **2 minutes** max (`VIDEO_CALL_MAX_SECONDS` dans `video-call.service.ts`)
- Expulsion automatique côté Daily (`eject_after_elapsed`)
- Timer + bouton Raccrocher côté app
