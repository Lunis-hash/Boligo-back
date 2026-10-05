# Audit : intelligence de BOLIGO et présentation sur ordinateur

Date : 5 octobre 2026. Périmètre : génération des fiches après le Grand Entretien,
critères de compatibilité, Sondeur (questions des 3 jours), IA, affichage sur
ordinateur. Chaque constat est appuyé par un test reproductible.

## 1. Sondeur : les questions se répétaient d'un parcours à l'autre

### Comment il fonctionne

Le Sondeur pose 21 questions : 3 jours × 7 thèmes (famille, argent, religion,
intimité, communication, projet de vie, lieu de vie). Pour chaque case, dans cet ordre :

1. **Divergence réelle** : si les deux Grands Entretiens se contredisent sur ce
   thème, la question cite les deux réponses (« l'un de vous a répondu…, l'autre… »).
2. **Question de l'IA** (Groq), si elle respecte la grille.
3. **Point d'accord réel** (nouveau) : la question creuse ce que le couple partage.
4. **Question du thème**, tirée d'une réserve.

### Constats

| Gravité | Constat | Preuve |
|---|---|---|
| Critique | L'IA du Sondeur ne fonctionnait plus en production : le modèle Groq configuré (`llama-3.1-8b-instant`) n'est plus disponible pour le compte (« model_not_found »). Seules les questions fixes étaient servies. | Journaux Render du 2 octobre : « Génération ciblée indisponible, gabarits déterministes utilisés : 404 model_not_found ». |
| Majeur | La mémoire anti-répétition ne couvrait que **le même couple**. Un membre qui recommençait avec un autre partenaire retrouvait les mêmes questions. | Simulation sur 5 parcours d'un même membre (105 questions) : **66 questions identiques reposées**. |
| Majeur | Réserve trop petite : 2 formulations par case et 2 gabarits ciblés par jour. | `sondeur.generator.ts` avant correction. |

### Solutions mises en place

- **Mémoire par membre** : les questions déjà posées à l'un *ou* l'autre membre
  (12 derniers parcours, tous partenaires confondus) sont écartées. La comparaison
  se fait par « signature » : une question construite sur le même modèle avec
  d'autres réponses citées compte comme déjà vue.
- **Réserve élargie** : 5 formulations par case (105 questions de thème), 4 gabarits
  ciblés par jour, 9 gabarits « points d'accord » (au plus 2 par jour).
- **Tirage propre à chaque parcours** : deux couples ne reçoivent pas la même série.
  Le tirage est reproductible, donc une série régénérée ne change pas.
- **IA réparée et durable** : le modèle Groq est maintenant choisi dans la liste
  des modèles réellement ouverts au compte (préférence au moins cher). Si Groq retire
  un modèle, le système en change automatiquement. Le modèle retenu apparaît dans les
  journaux au démarrage. L'IA reçoit aussi l'historique des membres pour proposer
  des angles nouveaux.

**Résultat mesuré** (même simulation) : **0 question reposée sur 5 parcours**,
et 0 formulation réutilisée. Sans IA, la réserve permet au moins 5 parcours sans
redite ; avec l'IA, chaque parcours reçoit en plus des questions inédites.

Tests : `src/journey/sondeur.generator.spec.ts` (variété sur 5 parcours,
reproductibilité, points d'accord), `src/ai/groq-model.spec.ts`,
`src/ai/ai.groq-fallback.spec.ts` (bascule de modèle).

## 2. Fiches et compatibilité

<!-- complété après l'audit par personas -->

## 3. Présentation sur ordinateur et finition

| Gravité | Constat | Solution |
|---|---|---|
| Majeur | Sur grand écran, les écrans de l'app s'étiraient sur toute la largeur (formulaire d'inscription de 1 900 px). | Colonne centrée de 600 px et panneau de marque à gauche, avec un texte adapté à chaque étape (inscription, Grand Entretien, parcours, profil). La page d'accueil et les textes légaux gardent leur mise en page. |
| Majeur | La ligature « fi » de la police Plus Jakarta Sans s'affichait vide : « profl », « modifer », « Appuyez pour modifer ». | Copie locale de la police sans ligatures (`mobile-steve/assets/fonts`). La correction vaut pour le web et pour le mobile. |
| Majeur | Les messages de l'app (erreurs, confirmations) utilisaient les boîtes grises du navigateur, avec « [OK] … · [Annuler] … ». | Fenêtre de dialogue aux couleurs de BOLIGO, avec Échap et Entrée gérés et l'action destructive en rouge. |
| Mineur | Cadre noir du navigateur autour des champs de saisie. | Contour lavande de la marque. |
| Mineur | Calendrier de naissance calculé sur la largeur de la fenêtre (cases démesurées sur ordinateur). | Cases calculées sur la largeur réelle. |

Captures : `mobile-steve/docs/screenshots/60-*.png` (ordinateur, 1440 × 900).
