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

### Méthode

Neuf profils fictifs mais complets ont été créés, avec des réponses réalistes à
tout le Grand Entretien :
- une femme de 25 ans musulmane qui veut des enfants ;
- un homme de 52 ans divorcé, père, qui n'en veut plus ;
- une femme de 34 ans tournée vers sa carrière ;
- un homme de 41 ans qui consomme (alcool, tabac) ;
- un « quasi-jumeau » de la première ;
- une femme de 30 ans aux réponses vagues ;
- un homme de 29 ans dont la saisie contient des fautes ;
- une étudiante de 19 ans ;
- un profil à moitié rempli.

Ils sont passés dans le vrai code de rédaction des fiches, de calcul de
compatibilité et de la Découverte. Toutes les paires ont été comparées dans les
deux sens (72 paires orientées).

### Ce qui fonctionnait déjà

- **Score symétrique :** A→B = B→A sur les 72 paires orientées.
- **Classement juste :** le quasi-jumeau sort premier à 98 %.
- **Lignes rouges reconnues :** les 4 règles critiques se déclenchent (désir
  d'enfants, même foi exigée, polygamie, fidélité).
- **Sujets à aborder pertinents :** ils sont classés par gravité.
- **Français correct :** grammaire et accords de genre justes.

### Constats et corrections

| Gravité | Constat (mesuré) | Correction |
|---|---|---|
| Critique | Une **incompatibilité déclarée** (par exemple : enfants oui / enfants jamais) s'affichait « Compatibilité à explorer » à 60 %, quel que soit le nombre de lignes rouges, et le profil restait proposé et invitable. | Score ramené sous 55 % avec le libellé « Incompatibilité déclarée » ; profil masqué en Découverte et invitation refusée. |
| Critique | Les critères **non négociables** du Module 0 (tranche d'âge, ville ou pays) ne s'appliquaient que dans un sens, et pas du tout à l'invitation. L'homme de 52 ans voyait et pouvait inviter la femme de 25 ans qui avait demandé « ± 5 ans, même ville ». | Critères appliqués dans les deux sens, en Découverte et à l'invitation. Mesure : 7 expositions à sens unique avant, 0 après. |
| Majeur | Une divergence majeure ne coûtait qu'environ 4 points. Un fumeur face à « rédhibitoire » restait à 94 % « Très forte compatibilité » ; le pire profil sans ligne rouge restait à 56 %. Médiane de deux inconnus : 71 %. | Plafond selon le nombre de divergences majeures. Le tabac « rédhibitoire » devient une incompatibilité ; ajout de la place de la foi et de la ligne rouge « enfants ou religion ». Médiane de deux inconnus : 59 %. |
| Majeur | La Découverte chargeait 500 comptes avant de filtrer : un bon profil pouvait disparaître derrière 500 comptes hors périmètre. | L'âge et le périmètre sont filtrés dans la requête elle-même. |
| Majeur | Bios interchangeables : construites sur 3 réponses seulement, 3 des 4 hommes avaient **exactement** la même bio. | Bio construite sur des réponses distinctives (tempérament, humour, façon d'aimer, ce que la personne recherche) : 9 bios différentes sur 9. |
| Majeur | Contradiction pour un parent : « Il est déjà parent de deux enfants. Il ne souhaite pas d'enfants ». | « Il ne souhaite pas d'autres enfants. » |
| Majeur | Une bio saisie avec un numéro de téléphone, un compte Instagram ou une grossièreté était publiée telle quelle. | Refusée, la bio rédigée par BOLIGO s'affiche à la place. |
| Majeur | La bio rédigée par l'IA n'était jamais vérifiée (enfants ou religion inventés possibles). | La bio de l'IA est écartée si elle contredit les réponses. |
| Mineur | « Congo » confondu avec « Congo RDC » ; Découverte servie avant la fin du Grand Entretien (72 % inventé pour tous) ; prénom tout en minuscules ; « product Manager ». | Corrigés. |

Résultat sur les 16 paires homme–femme :

| | Avant | Après |
|---|---|---|
| Incompatibilités affichées « à explorer » | 6 | 0 |
| Incompatibilités proposées en Découverte | 6 | 0 |
| Expositions à sens unique | 7 | 0 |
| Bios distinctes | 7 sur 9 | 9 sur 9 |

Tests : `src/matching/compatibility-scale.spec.ts`,
`src/matching/dealbreaker-rules.spec.ts`, `src/matching/discover-filters.spec.ts`,
`src/portrait/portrait.quality.spec.ts`, `src/ai/ai-bio-guard.spec.ts`.

### Décisions prises (5 octobre 2026)

- **Écart d'âge : 5 ans au plus**, quelle que soit la préférence (« plus jeune »,
  « plus âgé(e) », « peu importe »), dans la Découverte comme à l'invitation. Les
  libellés de la question l'indiquent désormais.
- **Tabac : question scindée.**
  - « Vous-même, fumez-vous ? » (nouvelle) s'ajoute à « Le tabac, l'alcool ou
    d'autres substances chez votre partenaire ».
  - Un fumeur est repéré même s'il a répondu « sans importance » pour l'autre :
    face à « rédhibitoire », c'est une incompatibilité déclarée.
  - La fiche affiche « Non-fumeur / Fumeur occasionnel / Fumeur ».
  - Les entretiens déjà terminés ne sont pas rouverts : l'ancienne réponse
    « je consomme moi-même » reste prise en compte.

### Points encore ouverts

- **Ouverture des analyses :** elles commencent souvent de la même façon. Une
  vraie lecture croisée des réponses, faite par l'IA, est la prochaine étape.
- **« Passer » non mémorisé côté serveur :** un profil passé revient plus tard.

## 2 bis. L'IA : ce qui est indispensable, et ce qui ne l'est pas

Le produit **fonctionne entièrement sans IA**. Le score, les fiches, le Sondeur et la
modération de premier niveau sont calculés par des règles écrites et testées.
L'IA apporte un supplément, sans jamais être un point de passage obligé :

| Usage | Sans IA | Avec IA | Fréquence d'appel |
|---|---|---|---|
| Sondeur | 21 questions tirées d'une réserve, ciblées sur les écarts réels | Formulations inédites pour chaque couple | 1 appel par parcours |
| Bio et synthèse du profil | Bio rédigée par règles | Texte plus personnel (vérifié contre les réponses) | 1 appel par membre, en fin d'entretien |
| Modération du chat | Filtre local (insultes, coordonnées) | Second avis sur les messages ambigus | Rare (messages suspects seulement) |

Besoin réel : **une seule clé d'API de modèle de langage, propre à BOLIGO**.
Groq est déjà configuré sur Render ; avec la correction du choix de modèle, la
clé existante redevient utilisable. Coût estimé : de l'ordre de 1 à 4 € pour
1 000 parcours.

## 3. Présentation sur ordinateur et finition

| Gravité | Constat | Solution |
|---|---|---|
| Majeur | Sur grand écran, les écrans de l'app s'étiraient sur toute la largeur (formulaire d'inscription de 1 900 px). | Colonne centrée de 600 px et panneau de marque à gauche, avec un texte adapté à chaque étape (inscription, Grand Entretien, parcours, profil). La page d'accueil et les textes légaux gardent leur mise en page. |
| Majeur | La ligature « fi » de la police Plus Jakarta Sans s'affichait vide : « profl », « modifer », « Appuyez pour modifer ». | Copie locale de la police sans ligatures (`mobile-steve/assets/fonts`). La correction vaut pour le web et pour le mobile. |
| Majeur | Les messages de l'app (erreurs, confirmations) utilisaient les boîtes grises du navigateur, avec « [OK] … · [Annuler] … ». | Fenêtre de dialogue aux couleurs de BOLIGO, avec Échap et Entrée gérés et l'action destructive en rouge. |
| Mineur | Cadre noir du navigateur autour des champs de saisie. | Contour lavande de la marque. |
| Mineur | Calendrier de naissance calculé sur la largeur de la fenêtre (cases démesurées sur ordinateur). | Cases calculées sur la largeur réelle. |

Captures : `mobile-steve/docs/screenshots/60-*.png` (ordinateur, 1440 × 900).
