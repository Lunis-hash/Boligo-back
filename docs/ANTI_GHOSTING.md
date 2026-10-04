# Pacte anti-ghosting — fonctionnement

> Objectif : dans un Parcours Harmonie, personne ne reste sans réponse. Chacun s'engage à aller au bout ou à partir poliment ; si l'un disparaît, le parcours se termine et la personne qui attendait récupère son crédit.

## Ce que voit le membre

| Moment | Ce qui se passe | Où dans l'app |
|---|---|---|
| Avant d'inviter ou d'accepter | Case obligatoire « Je m'engage à respecter ce pacte ». Sans elle, le bouton « Confirmer » reste inactif. | Découverte, fenêtre de confirmation |
| Pendant le parcours | Bandeau « Nadia attend votre réponse » avec l'échéance, ou « Vous attendez la réponse de Nadia » avec ce qui se passera à l'échéance. | Onglet Matchs et conversation |
| Envie d'arrêter | « Mettre fin poliment » : on choisit l'un des trois messages de courtoisie, ou « sans message » en cas de comportement déplacé. L'autre est prévenu et récupère son crédit. | Conversation, menu « ⋮ » ou lien du bandeau |
| Échéance dépassée | Le parcours se termine. La personne qui attendait récupère son crédit ; celle qui n'a pas répondu est prévenue que le parcours s'est terminé. | Notifications |

Les trois messages de courtoisie (liste fermée, pas de texte libre) :
- « Merci pour ces échanges. Je préfère m'arrêter ici, je vous souhaite le meilleur. »
- « Je ne pense pas que nous soyons faits pour avancer ensemble. Merci pour votre sincérité. »
- « Je ne suis plus disponible pour poursuivre ce parcours. Merci, et bonne continuation. »

## Les délais

| Étape | Qui est « attendu » | Rappel | Dernier avertissement | Échéance | Crédit rendu à celui qui attend |
|---|---|---|---|---|---|
| Sondeur (3 jours) | Celui qui a répondu à moins de questions | 48 h après le début | 72 h | 96 h après le début | Oui |
| Chat libre (3 jours) | Celui qui n'a pas répondu au dernier message | 24 h après le message | 36 h | 48 h après le message (au moins 48 h dans l'étape) | Oui |
| Vidéo | Celui qui n'a pas rejoint l'appel lancé par l'autre | 12 h après l'appel | 12 h avant l'échéance | Le plus tardif de : 48 h après l'ouverture de l'étape, 24 h après l'appel | Oui |
| Échange de coordonnées | Celui qui n'a pas répondu | 24 h | 48 h | 72 h après l'ouverture de l'étape | Non (le parcours a eu lieu) |
| Tous | Personne ne bouge des deux côtés | — | — | 7 jours sans activité | Non |

Au-delà de 72 h, le chat passe automatiquement à l'étape vidéo : une attente qui dépasserait cette limite n'a pas d'échéance dans le chat.

## Côté serveur

- Règles : `src/journey/ghosting.rules.ts` (fonctions pures, testées dans `ghosting.rules.spec.ts`).
- Exécution : `src/journey/ghosting.service.ts`.
  - **À l'ouverture de l'app** (tous modes) : la Règle de Justice historique s'applique aux parcours du membre (clôture + crédit rendu quand l'un attend l'autre au-delà de l'échéance).
  - **Moniteur** (toutes les heures, premier passage 2 min après le démarrage) : rappels, derniers avertissements et toutes les clôtures, y compris l'échange de coordonnées et l'inactivité de 7 jours.
- Crédit rendu une seule fois, même si une sortie et une clôture arrivent en même temps (`CreditService.refundJourneyOnce`, verrou par parcours et par membre).
- Compte à rebours renvoyé à l'app dans `GET /journey/:id/status` (champ `ghosting`).
- Sortie polie : `POST /journey/:id/leave` avec `{ "farewell": "merci" | "pas_compatible" | "pas_disponible" }` (facultatif).

## Activer le moniteur

Variable d'environnement `GHOSTING_MONITOR` sur le service Render de l'API :

| Valeur | Effet |
|---|---|
| `observe` (par défaut) | Aucune action. Le journal indique ce que le moniteur ferait : « Mode observation, aucune action. Actions prévues : … ». |
| `on` | Rappels, derniers avertissements et clôtures automatiques. |
| `off` | Moniteur arrêté. |

Le moniteur est livré en mode **observation** : il n'envoie rien et ne modifie aucun parcours tant que le propriétaire ne l'a pas validé. Pour l'activer : Render → service de l'API → Environment → `GHOSTING_MONITOR=on`, puis redéployer.

Sur l'instance gratuite, le serveur s'endort sans visite. Le moniteur ne tourne que lorsqu'il est réveillé (par exemple par la surveillance UptimeRobot). La règle appliquée à l'ouverture de l'app couvre le reste.

## Textes légaux

La clause « Pacte anti-ghosting et règle de justice » des CGU (section 5) décrit ces délais. Version des textes : 2026-10-04.
