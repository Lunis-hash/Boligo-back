# Modération messages BOLIGO

## Principe

BOLIGO est une app de **rencontres sérieuses** — les messages doivent rester respectueux.

## Double couche

| Étape | Où | Rôle |
|-------|-----|------|
| 1 | App (`chatModeration.ts`) | Blocage immédiat avant envoi (UX) |
| 2 | Serveur (`moderation/chat-moderation.ts`) | **Obligatoire** — non contournable |
| 3 | Groq (`AiService.moderateChatMessage`) | Sexuel explicite, harcèlement, menaces, spam |

Message refusé → HTTP **400**, rien en base.

## Contenus ciblés

- Insultes / grossièretés (liste FR + variantes leet speak)
- Demandes sexuelles explicites, nudes, OnlyFans, « plan cul »
- Harcèlement, menaces (via IA)

## Affichage

Les messages validés peuvent être **masqués** à la lecture si un terme a échappé au filtre.

## Signalement

Le schéma Prisma prévoit `Report` sur les messages — à brancher dans l’UI si besoin.
