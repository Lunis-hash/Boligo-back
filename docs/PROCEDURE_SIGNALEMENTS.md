# Procédure de traitement des signalements de sécurité

Document interne de BOLIGO, 7 octobre 2026. À relire par la personne
responsable de la modération avant l'ouverture au public.

## 1. Ce qui déclenche un signalement

Un signalement est créé automatiquement quand une réponse au Sondeur, ou une
relecture de l'IA, évoque un danger :

| Catégorie | Exemple | Priorité |
|---|---|---|
| Détresse | idées de mort, envie de disparaître | **Urgente** |
| Moins de 18 ans | « je suis en seconde » | **Urgente** |
| Menace | « elle saura qui je suis » | **Urgente** |
| Violence exercée | « il m'arrive de la secouer » | **Urgente** |
| Contrôle | « je vérifie son téléphone » | Haute |
| Demande d'argent | « envoie 50 000 par Orange Money » | Haute |
| Violence subie (confidence) | « mon ex me frappait » | Normale |
| Classement en attente, refus tracé | IA indisponible, insulte refusée | Normale |

Ce que le système fait seul, sans attendre l'équipe :

- la réponse en cause, et toutes celles du même membre ce jour-là, sont
  cachées à l'autre membre (« Réponse disponible plus tard. »), sauf pour une
  confidence de violence subie seule ;
- la messagerie reste fermée tant que l'équipe n'a pas tranché ;
- l'IA ne commente pas la journée ; une lecture de sécurité s'affiche ;
- l'auteur reçoit en privé les ressources d'aide de son pays ;
- pour une catégorie **urgente**, un e-mail part tout de suite vers les
  adresses `SAFETY_ALERT_EMAILS` (sans nom ni réponse, avec un lien vers le
  tableau de bord) ; le signalement apparaît en tête de liste avec la
  mention « Urgent ».

## 2. Délais cibles, de jour comme de nuit

| Priorité | Prise en charge | Décision |
|---|---|---|
| Urgente | 1 heure | 4 heures |
| Haute | 4 heures | 24 heures |
| Normale | 24 heures | 72 heures |

Ces délais supposent une astreinte : au moins deux personnes formées, dont
l'adresse figure dans `SAFETY_ALERT_EMAILS`, avec une boîte consultée sur
téléphone. Tant que l'équipe ne peut pas tenir ces délais la nuit, il faut
l'écrire dans les CGU (section sécurité) et ne pas promettre plus.

## 3. Comment décider (page Signalements du tableau de bord)

1. **Lire** la réponse et la question. Pour une menace ou un contrôle, se
   demander d'abord qui parle : la personne qui écrit peut être la victime
   qui cite son agresseur. Le tableau de bord exige de **choisir la
   catégorie** avant de confirmer une menace ou un contrôle.
2. **Fausse alerte** : la réponse redevient visible, la messagerie s'ouvre si
   rien d'autre n'attend.
3. **Confirmer** :
   - menace, contrôle, violence exercée, demande d'argent : le parcours est
     clos, le crédit est rendu au membre mis en danger ;
   - détresse : le parcours est mis en pause, les deux crédits sont rendus,
     le membre reçoit de nouveau les ressources d'aide ;
   - moins de 18 ans : le parcours est clos, les deux crédits sont rendus ;
     suspendre le compte (les CGU interdisent l'accès aux mineurs) ;
   - violence subie seule : classer, sans clore le parcours.
4. **Danger immédiat** (menace de mort datée, idées suicidaires avec un
   plan) : l'équipe n'est pas un service de secours. Elle peut contacter les
   secours du pays du membre si elle dispose d'éléments suffisants, et le
   note dans le signalement. Cette décision relève de la responsable de la
   modération.

## 4. Traçabilité

Chaque décision reste dans la description du signalement (catégorie
confirmée). Les signalements sont conservés 3 ans (politique de
confidentialité, section 6). Aucune copie des réponses n'est faite hors du
tableau de bord.

## 5. À faire avant l'ouverture

- Désigner l'astreinte et renseigner `SAFETY_ALERT_EMAILS` sur Render.
- Former l'équipe : attribution victime ou auteur, détresse, mineurs.
- Valider la liste des numéros d'aide par pays (docs/NUMEROS_AIDE.md).
- Faire relire l'analyse d'impact (docs/AIPD_SONDEUR.md).
