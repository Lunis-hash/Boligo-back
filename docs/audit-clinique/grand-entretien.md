> État au 6 octobre 2026, avant les corrections de sécurité du même jour (voir `docs/AUDIT_CLINIQUE.md`).

# Audit clinique du Grand Entretien BOLIGO

Version auditée : questionnaire V6.2, 139 questions (dépôt Boligo-back, 6 octobre 2026).
Audit en lecture seule : aucun fichier du dépôt n'a été modifié.

Fichiers lus :
- `src/interview/questions.data.ts`, en entier ;
- `src/psychometrics/psychometrics.ts` ;
- `src/matching/divergence.engine.ts` ;
- `src/portrait/module-affinity.ts`, qui agrège les scores par module et le score global ;
- `docs/QUESTIONNAIRE_V6.md`.

| Module | Questions | dont affirmations d'échelle |
|---|---|---|
| M0 Filtres | 10 | 0 |
| M1 Identité & culture | 12 | 0 |
| M2 Attachement & régulation | 20 | 11 |
| M3 Vécu & contexte | 8 | 0 |
| M4 Vision économique | 12 | 0 |
| M5 Dynamique sociale & familiale | 7 | 0 |
| M6 Quotidien, communication & limites | 14 | 4 |
| M7 Trajectoire & personnalité | 16 | 10 |
| M8 Projet de couple | 10 | 0 |
| M9 Pouvoir, effort & capacité à aimer | 18 | 11 |
| M10 Alchimie, vibe & désir | 12 | 0 |
| **Total** | **139** | **36** (103 questions à choix) |

---

## 1. Verdict global : 5,5 / 10

Le Grand Entretien est un bon questionnaire de compatibilité. Il est culturellement juste, prudent sur le plan éthique et construit sur de vrais concepts de recherche. **Il n'est pas « ultra clinique ».** Un clinicien du couple y reconnaîtrait les bons thèmes, mais il n'y trouverait ni la précision de mesure ni la couverture d'une évaluation clinique.

La moyenne des onze modules est de 5,2. J'ajoute 0,3 point pour l'architecture de lecture croisée (questions miroir, risques partagés, signaux d'alerte croisés avec les habitudes de l'autre), rare dans ce type d'outil.

### Ce qui tire la note vers le haut

- **Des concepts reconnus et bien choisis :**
  - anxiété et évitement d'attachement ;
  - réévaluation et suppression des émotions ;
  - les quatre cavaliers de Gottman ;
  - les cinq grands traits de personnalité ;
  - la croyance que « l'autre doit deviner » ;
  - la vitesse de réparation après une dispute.
- **De bonnes idées de méthode :**
  - des affirmations inversées ;
  - des questions miroir (ce qu'on vous a reproché, face à ce que vous déclarez) ;
  - un contrôle de sincérité ;
  - les « risques partagés » (deux silences, deux réparations lentes) ;
  - des signaux d'alerte croisés avec les habitudes déclarées par l'autre.
- **Un ancrage culturel précieux :** dot, envois d'argent à la famille, polygamie, rôle des anciens, cohabitation avec la belle-famille.
- **Une éthique tenue :** aucun diagnostic, aucun antécédent de suivi psychologique demandé, aucun critère physique.

### Ce qui la tire vers le bas

1. **Une mesure trop mince pour les décisions qu'elle déclenche.**
   - Une seule affirmation pour la réévaluation, une pour la suppression, une pour chacun des quatre cavaliers ; trois par dimension d'attachement.
   - Deux réponses « Souvent » (M6_Q12, critique ; M6_Q15, repli) suffisent à déclencher une divergence **majeure**.
   - Une divergence majeure plafonne le module à 64 % et le score global à 79 %.
2. **Le score pénalise la franchise, contrairement à ce qu'affirme la documentation** (`QUESTIONNAIRE_V6.md`, l. 162-164 : « Ce que le score ne pénalise pas : une réponse franche sur soi »).
   - `psychometricSimilarities` (`psychometrics.ts`, l. 640-720) fait baisser l'affinité des modules 2, 6 et 7, quel que soit le partenaire, dès qu'un membre déclare de l'anxiété, des réflexes de dispute ou du stress.
   - La désirabilité sociale n'étant pas corrigée, celui qui embellit son portrait est avantagé.
3. **De fausses incompatibilités et des doubles comptes :**
   - M6_Q10 : « Je suis humain(e) — les tentations existent » face à « Absolue et non négociable » donne une divergence **critique** (« Incompatibilité déclarée »). Reconnaître une tentation n'est pas accepter l'infidélité.
   - M0_Q08 mêle tabac, alcool et autres substances. « Je consomme moi-même occasionnellement » (un verre lors des fêtes) face à « Rédhibitoire » donne aussi une divergence **critique**.
   - M1_Q10 et M5_Q01 ont **les mêmes quatre options, mot pour mot**. Un seul désaccord sur le poids de la famille produit deux divergences majeures, et le score global est plafonné à 69 %.
4. **Des domaines cliniques entiers sont absents :**
   - la famille d'origine (comment on se disputait à la maison) ;
   - la hiérarchie des valeurs de vie ;
   - le versant positif de Gottman (attention au quotidien, admiration, désaccords permanents) ;
   - l'intimité avant le mariage ;
   - l'intensité de la pratique religieuse ;
   - le partage des tâches domestiques ;
   - la consommation d'alcool du membre lui-même ;
   - ce que chacun appelle « tromper ».
5. **Environ 25 des 103 questions à choix ont une « bonne réponse » visible** (liste en 4.4). Le seul contrôle est constitué de deux affirmations de sincérité, qui ne corrigent aucun score.

**À faire vérifier hors clinique.** La documentation affirme qu'« aucun item protégé n'est reproduit ». Pourtant :
- les dix affirmations de personnalité (M7_Q09 à M7_Q18) sont des traductions quasi littérales des dix items du BFI-10 ;
- quatre affirmations d'attachement (M2_Q13 à M2_Q16) sont très proches d'items de l'ECR-R, et M2_Q11 s'en approche ;
- M2_Q18 est proche d'un item de l'ERQ.

Ces points sont détaillés en section 7.

---

## 2. Analyse par module

### Vue d'ensemble

| Module | Note | En une phrase |
|---|---|---|
| M0 Filtres | 5 | Filtres utiles ; une question triple (M0_Q08) crée de fausses incompatibilités ; la consommation d'alcool du membre n'est pas demandée |
| M1 Identité & culture | 5 | Très bon ancrage culturel ; religion mal mesurée (pas de croyant non pratiquant, pas d'intensité de pratique) |
| M2 Attachement & régulation | 6,5 | Le module le plus clinique ; échelles trop courtes, seuil placé au point neutre, items trop proches des originaux |
| M3 Vécu & contexte | 4 | Famille d'origine absente ; options sans « sans objet » ; donnée de violence collectée sans usage |
| M4 Vision économique | 6 | Riche et culturel ; manquent le tempérament financier et les tâches domestiques |
| M5 Dynamique sociale & familiale | 4,5 | La meilleure question de loyauté (M5_Q02) n'a aucune règle ; doublon avec M1_Q10 |
| M6 Communication & limites | 6 | Les quatre cavaliers sont présents, mais un item chacun ; sexualité incomplète ; fidélité mal posée |
| M7 Trajectoire & personnalité | 5,5 | Cinq traits en dix items quasi traduits ; valeurs absentes |
| M8 Projet de couple | 5 | Bons signaux d'alerte ; doublons M8_Q05 / M8_Q08 ; divorce et éducation des enfants absents |
| M9 Pouvoir, effort & capacité à aimer | 5,5 | Bons concepts (comptabilité affective, « l'autre doit deviner ») ; les aveux pénalisent la franchise |
| M10 Alchimie, vibe & désir | 4 | Attirance intelligemment posée ; le « désir » du titre est quasi absent ; questions miroir mal alignées |

Types de défauts utilisés ci-dessous :
- **orientée** : désirabilité sociale, la bonne réponse saute aux yeux ;
- **double** : deux idées dans la même question ou la même option ;
- **recoupement** : options qui se chevauchent ;
- **couverture** : options qui ne couvrent pas tous les cas ;
- **nuance** : absence d'option nuancée ;
- **jargon** ;
- **abstraite** : pas de situation concrète.

### M0 — Filtres non négociables (10 questions) — 5/10

**Solide**
- Des filtres clairs : âge, périmètre, enfants, désir d'enfants, langues.
- La séparation du tabac « chez moi » (M0_Q09) et « chez l'autre » (M0_Q08) est bien pensée : la règle croisée repère le fumeur qui se dit indifférent.

**Manque**
- La consommation d'alcool du membre lui-même (seul le tabac est demandé pour soi), ainsi que les jeux d'argent et les paris.
- Le temps écoulé depuis la dernière séparation : une séparation de trois mois n'a pas le même sens qu'un divorce vieux de cinq ans (risque de relation de consolation).
- Le mode de garde des enfants (principale, alternée, un week-end sur deux), qui change toute la vie de couple.

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M0_Q01 | « Même génération (±5 ans) » contient déjà « plus jeune (5 ans au plus) » et « plus âgé(e) (5 ans au plus) ». Une fourchette chiffrée (âge minimum, âge maximum) serait plus précise. | recoupement |
| M0_Q04 | « En transition relationnelle » est flou (encore en couple ? séparé(e) sans être divorcé(e) ?), alors que c'est un point sensible pour des rencontres sérieuses. Le cas « marié(e), en instance de divorce » manque. | couverture, abstraite |
| M0_Q05 | Un parent d'un enfant mineur et d'un enfant majeur peut cocher B, C ou D. | recoupement |
| M0_Q07 | Diplômes français (CAP-BEP, Bac) peu lisibles pour un public international. Point non clinique. | couverture |
| M0_Q08 | Question triple (tabac, alcool, autres substances). L'option C décrit le membre lui-même et non ce qu'il accepte chez l'autre : deux axes dans la même liste. Elle produit une critique trompeuse (voir 4.6). | double |

### M1 — Identité & culture (12 questions) — 5/10

**Solide**
- La transmission aux enfants (M1_Q13).
- La désapprobation familiale (M1_Q15), avec une bonne gradation.
- La polygamie, posée franchement.
- La règle croisée « religion différente » face à « même foi obligatoire ».

**Manque**
- **L'intensité de la pratique religieuse.** La recherche sur les couples de religions différentes indique que l'écart de pratique pèse davantage sur les conflits que l'appartenance elle-même.
- L'attente de conversion : « souhaiteriez-vous que votre partenaire adopte votre religion ? ».
- Le mariage coutumier : M8_Q03 ne propose que civil et religieux.

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M1_Q05 | Le croyant **non pratiquant** n'a pas de réponse : un musulman ou un chrétien non pratiquant doit choisir entre « pratiquant(e) », « agnostique / athée » et « spirituel(le) sans religion ». Ni catholique, protestant ou évangélique, ni religions traditionnelles, ni « autre ». La question mêle appartenance et pratique. | couverture, double |
| M1_Q06 | « Votre religion aura-t-elle un impact sur votre partenaire ? » est maladroit, et peu adapté à un non-croyant. | abstraite |
| M1_Q09 | L'option A regroupe halal, casher et végétarien. Deux membres « A » reçoivent la convergence « Vous respectez tous les deux des interdits alimentaires », même s'ils ne peuvent pas partager un repas. | double |
| M1_Q10 / M5_Q01 | Options identiques mot pour mot : redondance et double compte (voir 4.5). « Patriarches » est connoté. | recoupement, jargon |
| M1_Q04 | Les traditions sont rangées par continent : redondant avec M1_Q01, stéréotypé (« Asie : feu sacré, cérémonie du thé, rubans ») et inutilisé dans le calcul. | abstraite |
| M1_Q11 | L'option D, « Je préfère en parler en personne », neutralise entièrement la règle (critique sinon). Un membre qui envisage la polygamie peut éviter le signal. | nuance mal placée |
| M1_Q08 | « Français ou langue du pays de résidence » est centré sur la France. | couverture |
| M1_Q02 | Dans « Une culture différente mais ouverte », qui est « ouvert » : la culture ou la personne ? | abstraite |

### M2 — Attachement & régulation émotionnelle (20 questions) — 6,5/10

C'est le module le plus clinique du questionnaire.

**Solide**
- Les deux dimensions de l'attachement (anxiété, évitement), avec une affirmation inversée chacune, sont complétées par trois scénarios concrets (M2_Q01 à M2_Q03).
- La question miroir M2_Q05.
- La vitesse de réparation (M2_Q07 : « vous revenez à la douceur en… », bien trouvé).
- L'ouverture à l'aide professionnelle (M2_Q10), reformulée sans donnée de santé.
- Le piège « besoin d'être rassuré(e) d'un côté, besoin d'espace de l'autre » est repéré entre deux membres.

**Manque**
- Le nombre d'affirmations : trois par dimension d'attachement, une par stratégie de régulation (voir 4.1).
- **Une consigne de référence.** Un célibataire ne sait pas s'il répond pour sa dernière relation ou « en général ».
- La jalousie comme trait (seule la vérification du téléphone est mesurée, en M9_Q11) et le sentiment de valoir quelque chose sans l'autre.
- La montée émotionnelle en dispute (cœur qui s'emballe, ne plus pouvoir écouter) et la capacité à s'apaiser seul(e).
- Le pôle « poursuite » du cycle poursuite-retrait (insister, relancer, suivre l'autre) n'est mesuré directement nulle part.

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M2_Q01 | Options non exclusives : on peut s'inquiéter légèrement (B) **et** renvoyer un message (C). D est double (« angoisse **ou** colère », deux réactions différentes). Pas d'option pour le pôle évitant (« ce temps pour moi me convient »). | recoupement, double, couverture |
| M2_Q02 | Pas d'option « cela me fait plaisir ». D (« J'ignore la demande ») est trop visiblement indésirable. | couverture, orientée |
| M2_Q03 | La bonne réponse est évidente (C : « un équilibre entre intimité et liberté »). A est double (sécurité **et** amour inconditionnel). | orientée, double, abstraite |
| M2_Q04 | Un seul choix pour « votre peur la plus profonde », alors qu'on en a souvent deux. D est double (trahi(e) **ou** manipulé(e)). C'est un très bon point de départ pour les schémas précoces, mais la question n'est ni comparée ni utilisée. | nuance, double |
| M2_Q05 | Devrait être à choix multiple : on peut avoir reçu plusieurs reproches. L'option C (« mal à exprimer ce que je ressentais ») n'est pas exploitée. | couverture |
| M2_Q06 | « Silence punitif » : un jargon qui contient un jugement (personne ne se reconnaît « punitif »). C est double (garder pour soi **puis** exploser). La question recoupe M9_Q04 presque mot pour mot. | jargon, orientée, double |
| M2_Q08 | Question double (« en premier » **et** « même si vous pensez avoir raison »). L'option B (« si je me rends compte que j'ai commis une erreur ») contredit la prémisse. A et D, qui parlent d'« ego », sont orientées. | double, orientée |
| M2_Q11 | Mélange fréquence et accord (« J'ai souvent peur… », noté de « pas du tout d'accord » à « tout à fait d'accord »). | double |
| M2_Q12 | Double : le besoin d'être rassuré(e) **et** « très vite ». | double |
| M2_Q18 | Recoupe l'affirmation d'évitement M2_Q15 : suppression des émotions et évitement se contaminent. | recoupement |
| M2_Q19 | Double : « intimidé(e) » **et** « du mal à me montrer tel(le) que je suis ». | double |
| M2_Q21 | Autre concept. « Les gens se confient facilement à moi » mesure la capacité à faire parler les autres, pas l'absence de timidité. L'inverser dans l'échelle de timidité est une erreur de construction : une personne timide peut être une excellente confidente. | construction |

Problème de calcul : le seuil des styles d'attachement est placé au point neutre (voir 4.6).

### M3 — Vécu & contexte (8 questions) — 4/10

**Solide**
- Les situations qui se répètent d'une relation à l'autre (M3_Q10).
- Les conflits non résolus avec l'ex (M3_Q07) et la place de l'ex (M3_Q05).

**Manque** (c'est le module le plus lacunaire pour un clinicien)
- **La famille d'origine :**
  - le modèle de couple des parents ;
  - leur éventuelle séparation ;
  - la façon dont on se disputait à la maison ;
  - l'enfant qui a dû s'occuper de ses parents.
- La disponibilité émotionnelle actuelle et le temps écoulé depuis la dernière relation. M3_Q03 A (« je m'en remets encore ») n'est utilisé nulle part.
- Le nombre et la durée des relations sérieuses passées, sans jugement.

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M3_Q01 | Toutes les options sont désirables et la question reste abstraite. Elle est pourtant comparée telle quelle : deux leçons différentes font baisser l'affinité du module, sans fondement. | orientée, abstraite |
| M3_Q02 | Manquent « je n'ai pas encore eu de relation sérieuse », « décès » pour les veufs et veuves (M0_Q04 C) et « autre ». « Violence ou manque de respect » mêle deux réalités de gravité très différente. C et E se recoupent (trahison, manque de respect). | couverture, double, recoupement |
| M3_Q03 | D est double (« c'est moi qui ai décidé » **et** « je me sens libéré(e) »). | double |
| M3_Q04 | La question est posée selon l'âge (35 ans et plus) au lieu de la présence d'enfants (M0_Q05) chez l'un ou l'autre. Un parent de 28 ans ne la voit pas ; une personne de 40 ans sans enfant la reçoit. | règle d'affichage |
| M3_Q05, M3_Q07 | Pas d'option « sans objet ». M3_Q07 devrait être à choix multiple. | couverture |
| M3_Q08 | A est double (victime **et** « j'ai travaillé là-dessus »). B (témoin dans la famille) sort du cadre d'une « relation passée ». Pas d'option « victime, et c'est encore lourd ». La donnée, très sensible, est collectée sans usage clair ni orientation vers une aide : il faut soit l'exploiter pour proposer des ressources, soit la retirer. | double, couverture |
| M3_Q10 | « Schémas » est un léger jargon ; « les mêmes situations » suffirait. | jargon |

### M4 — Vision économique (12 questions) — 6/10

**Solide**
- Un bon ancrage culturel : envois d'argent, dot, addition du premier rendez-vous.
- Le soutien quand l'argent manque (M4_Q11).
- La place de l'argent dans le choix du partenaire (M4_Q12).
- Le territoire personnel (M4_Q13) et l'organisation des comptes (M4_Q01).

**Manque**
- **Le tempérament financier** (dépensier ou économe). Les dépensiers et les économes se mettent volontiers en couple ensemble, et ces couples se disputent davantage sur l'argent.
- La transparence sur **sa propre** situation : M4_Q09 ne demande que l'attitude face aux dettes de l'autre.
- Qui gère l'argent au quotidien, les dépenses cachées, les jeux d'argent.
- **Le partage des tâches domestiques**, absent de tout le questionnaire alors que c'est l'un des sujets de dispute les plus fréquents.

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M4_Q03 / M4_Q04 | Les deux questions ne sont pas construites en parallèle : celle sur la femme mêle rôle économique et rôle domestique (« Elle gère le foyer et l'éducation »), et le rôle domestique de l'homme n'est jamais demandé. « Pourvoyeur » est d'un registre soutenu. | double, jargon |
| M4_Q08 | Recoupe M4_Q01 (commun ou séparé) : la même préférence est comptée deux fois. | recoupement |
| M4_Q06 | Mélange le projet (seul(e) ou à deux) et le calendrier (location pour l'instant, pas une priorité). | double |
| M4_Q11 | B (« avec un plan pour nous en sortir ensemble ») est la bonne réponse visible. | orientée |
| M4_Q12 | D (« seul le cœur compte ») est une réponse idéalisante. | orientée |

### M5 — Dynamique sociale & familiale (7 questions) — 4,5/10

**Solide**
- Le scénario M5_Q02 (votre mère ou votre père manque de respect à votre partenaire) est la meilleure question de loyauté du questionnaire.
- La cohabitation avec la belle-famille et la fréquence des visites sont très pertinentes pour le public.

**Manque**
- **M5_Q02 n'a aucune règle de divergence.** Un membre qui dirait à son partenaire « ne le prends pas trop à cœur », face à un membre qui attend d'être défendu, n'est jamais signalé.
- La capacité à garder sa position face aux siens, les devoirs envers des parents âgés, les frères et sœurs à charge.
- Les amis et la vie sociale du couple (temps avec les amis, sorties séparées).

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M5_Q01 | Doublon de M1_Q10. | recoupement |
| M5_Q02 | Il manque la réponse que retiendrait un clinicien : « Je soutiens mon partenaire sur le moment, puis j'en parle seul(e) avec mon parent ». B (« Cherchez à comprendre avant d'agir ») est la bonne réponse visible. | couverture, orientée |
| M5_Q03 | A est double (temporaire **et** règles claires). Les options se placent sur deux axes : accepter ou non, sous condition ou par culture. | double |
| M5_Q04 | Mélange ce que je fais et ce que j'accepte de l'autre. La vraie question de compatibilité (« accepteriez-vous que votre partenaire ait des amis proches de l'autre sexe ? ») n'est pas posée. A (« non négociable ») ajoute un axe d'importance. | double |
| M5_Q08 | B (« Confiance sans contrôle ») est la bonne réponse visible. | orientée |

### M6 — Quotidien, communication & limites (14 questions) — 6/10

**Solide**
- Les quatre cavaliers, notés en fréquence et formulés en comportements concrets (« tu es toujours… », lever les yeux au ciel).
- Les limites face à la violence physique et aux insultes.
- Savoir refuser l'intimité (M6_Q08) et la forme de la réconciliation (M6_Q11).

**Manque**
- **Le versant positif de Gottman :**
  - les « antidotes » (aborder un reproche en douceur, reconnaître sa part) ;
  - répondre aux petites demandes d'attention ;
  - l'admiration.
- Le pôle « escalade » : M6_Q01 n'a aucune option du type « je hausse le ton » ou « j'insiste ».
- **L'intimité avant le mariage**, la contraception, l'écart de désir, la capacité à parler de sexualité, ce que chacun appelle « tromper ».
- Le rythme de vie au quotidien : sommeil, ordre, écrans.

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M6_Q01 | Le pôle « attaque » (hausser le ton, insister) manque. A (« je confronte directement ») est valorisée. | couverture, orientée |
| M6_Q02 | Devrait être à choix multiple. A (« parler trop fort ou trop vite ») n'est pas exploitée. | couverture |
| M6_Q03 | B (« je m'emporte ») mesure autre chose que le besoin de gagner. D (« j'assume totalement ») est évidente. | double, orientée |
| M6_Q06 | Les options se placent sur trois axes : importance, construction dans le temps, refus de répondre. D (« j'aborderai en temps voulu ») est un refus déguisé. | recoupement |
| M6_Q07 | Un trou entre « plusieurs fois par semaine » et « quelques fois par mois ». Pas d'option « peu ou pas important pour moi », ni « après le mariage seulement ». D neutralise la règle. | couverture |
| M6_Q08 | B et D se recoupent (accepter pour faire plaisir, avoir du mal à refuser). | recoupement |
| M6_Q10 | Abstraite (« votre conception »). Effet plafond : presque tout le monde répond A, d'où une convergence sans information. C est ambiguë (une tentation n'est pas une infidélité), mais classée critique face à A. | abstraite, orientée |
| M6_Q12 à M6_Q15 | Une affirmation par comportement, toutes formulées dans le sens du problème (aucune inversée). Forte désirabilité sociale : on avoue rarement le mépris. Le cadre temporel est flou pour un célibataire. | mesure |

### M7 — Trajectoire de vie & personnalité (16 questions) — 5,5/10

**Solide**
- Cinq traits mesurés, avec une affirmation inversée chacun.
- Le temps passé ensemble (M7_Q08), bon indicateur de l'équilibre proximité / autonomie.
- Le lieu de vie dans cinq ans.

**Manque**
- **Les valeurs de vie** (sécurité, tradition, réussite, liberté, bienveillance…). M7_Q01, à choix unique, n'en est qu'une approximation.
- L'irritabilité comme trait : c'est l'aspect de l'instabilité émotionnelle le plus lié à l'insatisfaction de couple.
- Le goût de la nouveauté.

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M7_Q02 | « Faible » est péjoratif : personne ne se dit d'une ambition faible. D (« Accompli — je suis dans une phase de transmission ») relève d'un autre axe, l'étape de vie. | orientée, recoupement |
| M7_Q03 | Jargon (introverti, ambiverti, extraverti). B et D se recoupent. La question doublonne M7_Q09 / M7_Q10 sans servir de contrôle de cohérence. | jargon, recoupement |
| M7_Q01 | Options non exclusives : on peut vouloir une vie stable **et** en progression. | recoupement |
| M7_Q11 | Double : confiance **et** bienveillance. | double |
| M7_Q13 | Double : aller au bout **et** avec soin. | double |
| M7_Q09 à M7_Q18 | Deux affirmations par trait : suffisant pour des moyennes de groupe, pas pour juger un individu. Traduction quasi littérale du BFI-10 (voir section 7). | mesure |

### M8 — Projet de couple (10 questions) — 5/10

**Solide**
- L'objectif et le délai d'engagement.
- Les signaux d'alerte croisés avec les habitudes de l'autre : une excellente idée.
- La maladie ou le handicap d'un partenaire (M8_Q11).
- M8_Q09 oppose la croyance « l'amour trouvera une solution » à « j'en parle tôt ».

**Manque**
- L'attitude face au divorce (acceptable ou non), l'un des meilleurs indicateurs d'engagement.
- Le nombre d'enfants souhaité, le calendrier, l'éducation des enfants (autorité, punitions, partage des rôles).
- Le poids relatif de la passion, de la complicité et de l'engagement.

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M8_Q02 | C et D se recoupent (« à notre rythme naturel », « quand les conditions seront mûres »). Pas d'option « je ne cherche pas d'engagement officiel ». | recoupement, couverture |
| M8_Q03 | Pas de mariage coutumier, pourtant très pertinent pour le public. | couverture |
| M8_Q04 | Les « langages de l'amour » sont une notion de vulgarisation dont l'appui scientifique est faible. Le choix est unique alors que chacun en a plusieurs, et la question ne distingue pas donner et recevoir. « Mots d'affirmation » et « Actes de service » sont du jargon traduit. | jargon, couverture |
| M8_Q05 / M8_Q08 | Doublons : le mensonge et l'infidélité apparaissent dans les deux. Le choix est unique alors qu'on a plusieurs limites. M8_Q05 B est double (violence **ou** manque de respect). | recoupement, double |
| M8_Q01 | C est ambiguë : « me connaître », moi-même ou l'autre ? | abstraite |
| M8_Q09 | A est double (en parler tôt **et** trancher vite). C est extrême (« quel qu'en soit le prix »). | double |
| M8_Q10 | A est double (rapides **et** envahissantes). Les signaux F, G et I ne sont croisés avec rien, en particulier I (« ne pas respecter un non »), le plus important pour la sécurité. | double, exploitation |

### M9 — Pouvoir, effort & capacité à aimer (18 questions) — 5,5/10

**Solide**
- La comptabilité affective (donner sans compter ou tenir les comptes).
- La croyance que l'autre doit deviner (M9_Q17).
- La patience face à la bouderie (M9_Q19).
- Les habitudes croisées avec les signaux d'alerte, et le contrôle de sincérité.

**Manque**
- La capacité à recevoir, l'empathie, la gratitude, le pardon.
- La jalousie comme trait : seule la vérification est mesurée.

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M9_Q01 | A (« égalité totale ») est la bonne réponse visible. | orientée |
| M9_Q02 | C et D se recoupent (deux variantes de la réciprocité). Mélange une croyance (A, B) et une condition (C, D). | recoupement |
| M9_Q03 | « Comptabilité mentale » est un léger jargon. A est désirable. | jargon, orientée |
| M9_Q04 | Doublon de M2_Q06 (options C et D). | recoupement |
| M9_Q07 | B est double (importance **et** peu démonstratif). A recoupe M8_Q04 E. | double |
| M9_Q08, M9_Q09 | Deux affirmations seulement. « Je n'ai jamais dit le moindre petit mensonge » peut être approuvée comme un idéal religieux plutôt que comme une description : risque de faux « portraits idéalisés » chez les croyants. | mesure |
| M9_Q10 à M9_Q15 | Des aveux de comportements indésirables : seuls les membres francs sont signalés (voir 4.6). | orientée |
| M9_Q16 à M9_Q18 | Le « caractère exigeant » regroupe trois concepts différents (bouderie, attente que l'autre devine, impatience). Le score est difficile à interpréter. | construction |

### M10 — Alchimie, vibe & désir (12 questions) — 4/10

**Solide**
- L'attirance est demandée à partir de l'expérience passée (M10_Q11) plutôt qu'en critères idéaux.
- Aucune question sur le corps.
- Le rythme de l'attirance (M10_Q15).
- Le miroir entre l'énergie recherchée par l'un et la façon dont les amis de l'autre le décrivent.

**Manque**
- Le « désir » du titre est à peine exploré : curiosité, jeu, nouveauté partagée, loisirs communs.
- L'humour partagé : seul l'humour du membre est demandé.

**Défauts de formulation**

| Question | Défaut | Type |
|---|---|---|
| M10_Q01 | D est obscur (« Avoir du mal à vous définir clairement après coup »). Peu de valeur, et la question n'est pas utilisée. | abstraite |
| M10_Q02 / M10_Q03 | Options non alignées alors qu'elles sont comparées clé à clé : « stable » est en C dans M10_Q03 et en D dans M10_Q02. | recoupement |
| M10_Q04, M10_Q09, M10_Q10 | Auto-descriptions flatteuses. M10_Q10 (« en un mot ») est abstraite. | orientée, abstraite |
| Titre du module | « Vibe » est un anglicisme. | jargon |

---

## 3. Couverture des cadres cliniques

| Cadre | Ce qui est couvert | Ce qui manque | Note |
|---|---|---|---|
| **Attachement** (anxiété, évitement, type ECR-R) | M2_Q11 à M2_Q16 (3 + 3, une inversée chacune) ; scénarios M2_Q01 à M2_Q03 (30 % du score) ; miroir M2_Q05 ; peur M2_Q04 | Six affirmations au moins par dimension (la version courte de référence en compte six) ; une consigne de référence ; les comportements de protestation (relancer, provoquer une réaction) ; un seuil de style placé ailleurs qu'au point neutre | 6/10 |
| **Gottman : quatre cavaliers** | M6_Q12 à M6_Q15 (un item chacun) ; M6_Q01, M6_Q03 ; miroir M6_Q02 | Les antidotes ; plusieurs items par cavalier ; un contrôle de la désirabilité | 5/10 |
| **Gottman : réparation** | M2_Q07 (vitesse), M6_Q11 (forme), M2_Q08 (excuses) | Accepter la tentative de réparation de l'autre | 6/10 |
| **Gottman : carte d'amour** | Rien | La curiosité pour le monde intérieur de l'autre, ses soucis, ses projets | 0/10 |
| **Gottman : problèmes perpétuels** | M8_Q09, indirectement | Accepter qu'un désaccord ne se règle jamais | 1/10 |
| **Gottman : autres piliers** | M9_Q01 en partie (accepter l'influence de l'autre) | Répondre aux demandes d'attention, l'admiration, la montée émotionnelle en dispute | 1,5/10 |
| **Thérapie centrée sur les émotions** (cycle poursuite et retrait) | Déduit, pas mesuré : critique × repli (règle 2 de `psychometricDivergences`), anxiété × évitement (règle 1), M6_Q01 | Le pôle « poursuite » mesuré directement ; besoin de pause contre besoin de régler tout de suite ; l'émotion sous-jacente (peur d'être abandonné(e) contre peur de mal faire) | 4/10 |
| **Différenciation de soi** (Bowen) | Fusion avec la famille : M1_Q10, M5_Q01, M1_Q15, M5_Q02, M5_Q03 ; fusion avec le partenaire : M7_Q08, M9_Q06 | Garder sa position sous pression ; la réactivité émotionnelle ; la coupure. « Nos décisions ne concernent que notre couple » peut traduire une autonomie saine ou une coupure : les deux ne sont pas distinguées | 3,5/10 |
| **Schémas précoces** (Young) | M2_Q04 (abandon, méfiance, sentiment de ne pas être à la hauteur, perte d'indépendance) ; M9_Q06 (sacrifice de soi) ; M9_Q16 et M9_Q17 (en partie : se sentir en droit d'exiger) | La privation affective, la soumission, les exigences élevées envers soi, le besoin d'approbation ; M2_Q04 n'admet qu'un choix | 2,5/10 |
| **Régulation émotionnelle** | M2_Q17 (1 item), M2_Q18 (1 item), M2_Q06, M9_Q04, M2_Q07 | Trois items par stratégie au moins ; l'impulsivité sous la colère, la rumination, la capacité à s'apaiser, la clarté sur ce que l'on ressent | 4/10 |
| **Cinq grands traits** (Big Five) | Deux items par trait, un inversé | Une fiabilité suffisante pour un individu ; la facette irritabilité ; des textes non traduits de l'original | 5,5/10 |
| **Valeurs** (Schwartz) | Indirect : M7_Q01, M7_Q02, M1_Q03, M4_Q12 | Toute hiérarchie de valeurs | 2/10 |
| **Triangle de Sternberg** | Passion (M6_Q06, M10_Q15), intimité (M8_Q06), engagement (M8_Q01, M8_Q02, M8_Q11) | Le poids relatif des trois ; l'engagement face aux difficultés (divorce) | 3,5/10 |
| **Styles d'amour** | Dispersés : passion immédiate (M10_Q15 A), amitié (M10_Q15 C), amour pragmatique (M3_Q01 D, M4_Q12), amour possessif (anxiété, M9_Q10, M9_Q11), don de soi (M9_Q06 A, M4_Q11 A), amour ludique (M9_Q13) | Une conception d'ensemble : en l'état, aucun profil de style n'est interprétable | 3/10 |
| **Famille d'origine** | M3_Q08 B (violence vue dans la famille) | Le modèle parental, la séparation des parents, le climat des disputes, le rôle de l'enfant | 1,5/10 |
| **Désir & sexualité** | M6_Q06, M6_Q07, M6_Q08, M6_Q10, M9_Q07, M10 | L'intimité avant le mariage, l'écart de désir, la capacité à parler de sexualité, la contraception, ce que chacun appelle « tromper » | 4/10 |
| **Argent** | M4 (12 questions) | Le tempérament dépensier ou économe, la transparence sur sa propre situation, qui gère, les jeux d'argent, les tâches domestiques | 6,5/10 |
| **Religion** | M1_Q05, M1_Q06, M1_Q09, M1_Q11, M1_Q13, M8_Q03 | Le croyant non pratiquant, l'intensité de pratique, la conversion, le mariage coutumier, l'éducation religieuse des enfants | 5/10 |

---

## 4. Rigueur de mesure

### 4.1 Une seule question par dimension, ou plusieurs ?

| Dimension | Items | Inversés | Conséquence |
|---|---|---|---|
| Anxiété d'attachement | 3 (+ 3 scénarios comptant pour 30 %) | 1 | Limite basse ; la version courte de référence en compte 6 |
| Évitement | 3 (+ 2 scénarios) | 1 | Idem |
| Réévaluation | 1 | 0 | Fiabilité impossible à mesurer |
| Suppression | 1 | 0 | Idem |
| Critique, mépris, défense, repli | 1 chacun | 0 | Un seul « Souvent » peut déclencher une divergence majeure |
| Cinq grands traits | 2 chacun | 1 chacun | Acceptable pour des moyennes de groupe, fragile pour un individu |
| Timidité | 3 | 1 (qui relève d'un autre concept) | Échelle hétérogène |
| Caractère exigeant | 3 | 0 | Échelle hétérogène |
| Sincérité | 2 | 0 | Trop court pour corriger quoi que ce soit |
| Habitudes (M9_Q10 à M9_Q15) | 1 chacune | 0 | Aveu isolé |
| Toutes les autres questions (environ 100) | 1 question = 1 thème | — | Décision sur un item unique, sans redondance voulue |

**Conclusion.** Hors attachement, presque tout le questionnaire mesure chaque dimension par une seule question. C'est normal pour une préférence (lieu de vie, épargne), pas pour un trait ou un comportement.

### 4.2 Questions inversées

Huit en tout : M2_Q13, M2_Q16, M2_Q21, M7_Q10, M7_Q12, M7_Q14, M7_Q15 et M7_Q18.

Aucune dans les quatre cavaliers, la régulation, le caractère exigeant, les habitudes ou la sincérité. Ces 19 affirmations vont toutes dans le sens « problème ». Le biais d'acquiescement n'est donc pas contrôlé : un membre qui répond « d'accord » par politesse ou par fatigue paraît plus en difficulté qu'il ne l'est.

### 4.3 Contrôle de cohérence entre réponses

**Ce qui existe :** quatre écarts « miroir » (M2_Q05 A ou B face aux échelles d'attachement, M6_Q02 B ou C face au mépris et au repli), visibles du seul membre.

**Ce qui manque**, alors que les paires de questions existent déjà :
- M7_Q03 (introverti / extraverti) face à M7_Q09 et M7_Q10 (extraversion) ;
- M2_Q06 D et M6_Q01 D (silence) face à M6_Q15 (repli) ;
- M2_Q01 D (angoisse sans réponse) face à l'anxiété (M2_Q11 à M2_Q13) ;
- M5_Q08 B (« confiance sans contrôle ») face à M9_Q11 (« je regarde son téléphone ») ;
- M8_Q04 E (toucher physique) face à M9_Q07 D (mal à l'aise avec le contact) ;
- M1_Q10 face à M5_Q01, aux options identiques : la paire idéale de test-retest, aujourd'hui comptée deux fois au lieu de servir de contrôle.

Il n'existe aucune détection des réponses « en ligne droite » (tout « C » sur les échelles), ni de la durée de réponse. Hors M0_Q10, aucune question ne propose « Aucune ne me correspond » ou « Autre » : le choix forcé ajoute du bruit.

### 4.4 Contrôle de la désirabilité sociale

**Le contrôle existant**
- Deux affirmations (M9_Q08, M9_Q09).
- Le signal « portrait idéalisé » est montré au seul membre ; il n'a aucun effet sur les scores ni sur la confiance accordée aux échelles.
- L'item sur le mensonge expose à un biais chez les membres croyants (voir M9).

**Les 25 questions à choix où la bonne réponse est visible**
- M2 : M2_Q02, M2_Q03, M2_Q06, M2_Q08, M2_Q10 ;
- M3 : M3_Q01, M3_Q10 ;
- M4 : M4_Q11 ;
- M5 : M5_Q02, M5_Q08 ;
- M6 : M6_Q01, M6_Q03, M6_Q04, M6_Q05, M6_Q08, M6_Q10, M6_Q11 ;
- M7 : M7_Q02 ;
- M8 : M8_Q09 ;
- M9 : M9_Q01, M9_Q02, M9_Q03, M9_Q04, M9_Q06, M9_Q19.

S'y ajoutent **13 affirmations d'aveu** : quatre cavaliers, six habitudes, trois items de caractère exigeant.

**Conséquences**
- **Effets plafond.** M6_Q10 A, M6_Q04 A et M6_Q05 A sont choisies par presque tout le monde. Elles produisent des convergences sans information dans « Ce qui vous rassemble », comme « La fidélité est absolue et non négociable pour vous deux ».
- **Une incitation à embellir.** Combiné au point 2 de la section 4.6 (le score pénalise la franchise), le système avantage le membre qui embellit.

### 4.5 Une vraie divergence se distingue-t-elle d'une simple nuance ?

**Ce qui marche**
- Les tables de gravité par paire de réponses sont pensées question par question ; une divergence « mineure » ne coûte aucune pénalité.
- Les « risques partagés » : deux silences, deux réparations lentes.
- M8_Q05 C transforme un désaccord majeur sur les enfants ou la religion en incompatibilité : c'est une première forme d'importance déclarée par le membre.

**Ce qui ne marche pas**
1. **Le membre ne déclare ni importance ni souplesse** (sauf M8_Q05 C, M0_Q08 A et M1_Q06 A). La gravité est celle fixée par le concepteur, pas celle du couple : deux membres en désaccord sur les visites familiales, mais qui s'en accommodent tous deux, reçoivent quand même une « majeure ».
2. **Les concepts proches sont comptés plusieurs fois.** Une seule différence de fond produit plusieurs divergences, et chaque majeure abaisse le plafond global (98 %, puis 79, 69 et 59 %) :
   - M1_Q10 et M5_Q01 ;
   - M4_Q01 et M4_Q08 ;
   - pour le retrait : M2_Q06, M9_Q04, M6_Q01, M2_Q07 et M2_Q08, chacune avec son « risque partagé ».
3. **Des options refuges neutralisent les règles** : M1_Q11 D, M6_Q06 D, M6_Q07 D, M7_Q07 D.
4. **Les questions sans règle sont comparées par défaut** : 1 si les réponses sont identiques, 0,65 si elles diffèrent (`module-affinity.ts`, l. 40 et 215).
   - Questions concernées : M0_Q04, M1_Q08, M3_Q01, M3_Q10, M5_Q02, M5_Q05, M7_Q03, M8_Q05, M8_Q08, M10_Q04, M10_Q06, M10_Q10.
   - Être célibataire face à quelqu'un de divorcé, avoir tiré une autre leçon du passé ou être introverti face à quelqu'un d'extraverti fait baisser l'affinité, sans fondement clinique.
   - À l'inverse, M5_Q02, qui porte une vraie divergence, n'est jamais signalée comme telle.
5. **Une seule réponse franchit les seuils** : « Souvent » à M6_Q12 et à M6_Q15 suffit pour une majeure.

**Verdict.** Le moteur distingue des degrés, mais il ne distingue pas encore une vraie divergence d'une simple nuance.

### 4.6 Défauts de calcul relevés

1. **Le seuil d'attachement est placé au point neutre** (`psychometrics.ts`, l. 247-259).
   - 50 correspond exactement à « ni d'accord ni pas d'accord ».
   - Pour un membre neutre sur les six affirmations (score de 50), il suffit que ses scénarios dépassent 50 pour basculer en « En quête de réassurance », ou en « Entre envie de proximité et prudence » si les deux dimensions basculent.
   - À prévoir : une zone intermédiaire (entre 40 et 60, aucun style affiché) ou des seuils calés sur la répartition réelle des membres.
2. **Le score pénalise la franchise** (`psychometrics.ts`, l. 640-720, repris par `module-affinity.ts`).
   - L'insécurité d'attachement, l'indice de dispute, la stabilité, la bienveillance et le sens de l'organisation de chacun abaissent l'affinité avec tout le monde (poids 3, 2 et 2).
   - C'est en contradiction avec `QUESTIONNAIRE_V6.md`, l. 162-164. Il faut soit l'assumer et l'écrire, soit ne retenir que des combinaisons à risque entre les deux membres.
3. **M6_Q10** (`divergence.engine.ts`, l. 503-517) : C (« les tentations existent ») face à A est classé critique. Une réponse honnête et ambiguë devient une « Incompatibilité déclarée ».
4. **M0_Q08** (l. 876-888) : C face à A est classé critique, alors que C peut désigner un verre d'alcool lors des fêtes.
5. **M1_Q10** (l. 266) **et M5_Q01** (l. 223) : mêmes options, deux majeures pour une seule divergence.
6. **M1_Q09** : la convergence « interdits alimentaires » est fausse entre halal, casher et végétarien.
7. **Signal d'alerte face à une habitude** : seules les habitudes avouées sont croisées, et un membre qui minimise n'est jamais signalé. Il faudrait pondérer par le contrôle de sincérité, ou traiter ces cas comme des sujets de Sondeur plutôt que comme des divergences majeures.
8. **M10_Q02 / M10_Q03** : options non alignées, alors qu'elles sont comparées clé à clé.

---

## 5. Les 10 propositions prioritaires

Barème de coût, sachant que toute nouvelle question doit aussi être traduite en anglais (`questions.en.ts`), branchée dans les scores et les divergences, et couverte par les tests :
- **faible** : moins d'une demi-journée, sans nouvelle clé de réponse ;
- **moyen** : 1 à 2 jours (question, traduction, règle, tests) ;
- **fort** : plus de 2 jours, ou migration des réponses déjà enregistrées.

### Tableau récapitulatif

| # | Proposition | Gain principal | Coût |
|---|---|---|---|
| 1 | Corriger les questions qui fabriquent de fausses incompatibilités | Supprime des « critiques » injustes | Moyen |
| 2 | Déclarer ce qui est non négociable | Distingue enfin une divergence d'une nuance | Moyen |
| 3 | Religion : appartenance, pratique, conversion | Mesure la vraie source de conflit religieux | Moyen à fort |
| 4 | Allonger les échelles qui décident d'une divergence majeure | Fiabilité des scores | Moyen |
| 5 | Mesurer directement le cycle « l'un relance, l'autre se ferme » | Repère le cycle de dispute le plus étudié | Moyen |
| 6 | Sexualité : avant le mariage, écart de désir | Divergence fréquente aujourd'hui invisible | Moyen |
| 7 | Ce que chacun appelle « tromper » | Remplace un consensus de façade par une vraie mesure | Moyen |
| 8 | Famille d'origine et capacité à garder sa position | Couvre Bowen et la famille d'origine | Moyen |
| 9 | Versant positif de Gottman | Attention au quotidien, désaccords permanents | Moyen |
| 10 | Hiérarchie des valeurs de vie | Couvre les valeurs (Schwartz) | Moyen |

### P1. Corriger les trois questions qui fabriquent de fausses incompatibilités

**Gain clinique.** Plus aucune réponse honnête ou nuancée ne produit d'« Incompatibilité déclarée ». Les options deviennent ordonnées et sans jugement moral.

**a) Fidélité (remplace M6_Q10)**

« Si votre partenaire vous trompait, ce serait pour vous : »
- A. Une rupture immédiate, sans retour possible
- B. Une blessure très grave ; je ne sais pas si je pourrais pardonner
- C. Une blessure très grave, qui peut se réparer avec du temps et des preuves
- D. Une épreuve qu'un couple peut surmonter s'il en parle franchement

Règle : A face à D, majeure ; A face à C, modérée. Cet item seul ne déclenche plus jamais de critique : la critique viendra de P2, si la fidélité est cochée comme non négociable.

**b) Alcool (dédoubler M0_Q08 sur le modèle du tabac, M0_Q09 et M0_Q08)**

« Vous-même, buvez-vous de l'alcool ? »
- A. Jamais
- B. Lors d'occasions (fêtes, repas)
- C. Chaque semaine
- D. Presque tous les jours

« L'alcool chez votre partenaire : »
- A. Je ne pourrais pas vivre avec
- B. Acceptable s'il reste occasionnel
- C. Sans importance pour moi

« Les autres substances » restent couvertes par les signaux d'alerte.

**c) Excuses (remplace M2_Q08, dont l'option B contredit la question)**

« Après une dispute où vous pensez avoir eu plutôt raison, le plus souvent : »
- A. Je reconnais ma part, même si elle est petite
- B. Je fais un pas vers l'autre, sans revenir sur le fond
- C. J'attends que l'autre revienne vers moi
- D. Je ne m'excuse pas tant que je pense avoir raison

**Coût : moyen.** Le sens des clés change : il faut de nouveaux identifiants, et garder les anciennes règles pour les entretiens déjà terminés.

### P2. Déclarer ce qui est non négociable (remplace M8_Q05 et M8_Q08)

**Gain clinique.** C'est ce qui sépare une vraie divergence d'une nuance. Une différence sur un sujet non négociable pour l'un des deux reste grave ; la même différence entre deux personnes souples devient un sujet de discussion. Deux doublons disparaissent au passage.

**Exemple**

« Parmi ces sujets, lesquels sont pour vous non négociables : un désaccord sur ce point vous ferait renoncer à la relation ? (3 au plus) »
- A. Avoir des enfants, ou non
- B. La religion et sa pratique
- C. La fidélité
- D. La façon de gérer l'argent
- E. Le lieu de vie
- F. La place de la famille dans le couple
- G. L'intimité avant le mariage
- H. La polygamie
- I. Le tabac ou l'alcool
- J. Les rôles de l'homme et de la femme dans le foyer
- K. Aucun : pour moi, tout se discute

**Branchement**
- Pour chaque divergence d'un thème coché par l'un des deux, la gravité monte d'un cran.
- Si aucun des deux n'a coché le thème, une majeure devient modérée.
- Cela généralise le mécanisme existant de M8_Q05 C (`divergence.engine.ts`, l. 1125-1136).

**Coût : moyen.** Il faut une table « thème vers questions » ; M8_Q05 reste lu pour les entretiens antérieurs.

### P3. Religion : distinguer appartenance, pratique et attente de conversion

**Gain clinique.** L'écart de pratique et l'exigence de conversion sont les vraies sources de conflit religieux. Le croyant non pratiquant retrouve enfin une réponse.

**Exemple 1 (remplace M1_Q05)**

« Votre religion ou conviction : »
- A. Chrétienne catholique
- B. Chrétienne protestante ou évangélique
- C. Chrétienne, autre Église
- D. Musulmane
- E. Juive
- F. Bouddhiste ou hindoue
- G. Religion traditionnelle ou des ancêtres
- H. Spirituel(le), sans religion
- I. Sans religion
- J. Autre (précisez)

**Exemple 2**

« À quelle fréquence pratiquez-vous (prière, office, jeûne) ? »
- A. Chaque jour
- B. Chaque semaine
- C. Surtout lors des grandes fêtes
- D. Rarement ou jamais

**Exemple 3**

« Si votre partenaire n'avait pas votre religion : »
- A. Je souhaiterais qu'il ou elle l'adopte avant le mariage
- B. Je le souhaiterais, sans en faire une condition
- C. Chacun garderait la sienne
- D. Je pourrais moi-même adopter la sienne

**Branchement**
- Un écart de pratique de A à D est une majeure, même à religion égale.
- Une conversion exigée (A) face à « chacun garderait la sienne » (C), entre religions différentes, est critique.
- La règle croisée M1_Q05 / M1_Q06 est remplacée.

**Coût : moyen à fort.** M1_Q05 est au cœur de la règle croisée et du portrait : il faut une table de correspondance des anciennes réponses.

### P4. Allonger les échelles qui décident d'une divergence majeure

**Gain clinique.** Une « majeure » reposera sur une tendance et non sur une seule réponse, et le biais d'acquiescement sera contrôlé. Au passage, les items trop proches des originaux sont réécrits (M2_Q11, M2_Q13 à M2_Q16, M2_Q18).

**Ce qu'il faut changer**
- Attachement : passer de 3 à 6 affirmations par dimension, dont 2 inversées.
- Régulation : 3 affirmations par stratégie.
- Chaque cavalier : 2 affirmations, dont une « antidote » inversée.
- Ajouter une consigne : « Pensez à la façon dont vous vivez vos relations amoureuses en général, passées ou présentes. »
- Recalibrer les seuils (zone intermédiaire de 40 à 60).

**Exemples** (formulations originales, échelle d'accord en 5 points sauf mention contraire)
- Anxiété : « Quand je n'ai pas de nouvelles pendant une journée, je relis nos derniers messages pour y chercher un signe. »
- Anxiété : « J'ai besoin de signes fréquents (messages, mots tendres) pour me sentir aimé(e). »
- Anxiété, inversée : « Je reste serein(e) quand nous passons quelques jours sans nous voir. »
- Évitement : « Quand une relation devient très sérieuse, j'ai envie de reprendre un peu de distance. »
- Évitement : « Je préfère régler mes soucis seul(e) plutôt que d'en parler à la personne que j'aime. »
- Évitement, inversée : « Quand j'ai une mauvaise nouvelle, j'ai envie de l'annoncer d'abord à la personne que j'aime. »
- Critique, antidote inversée (fréquence) : « Quand quelque chose me dérange, je le dis en parlant de ce que je ressens plutôt qu'en accusant (« je me suis senti(e) seul(e) hier soir »). »
- Mépris, antidote inversée (fréquence) : « Même fâché(e), je peux dire à l'autre ce que j'apprécie chez lui ou elle. »

**Coût : moyen.** Le code est trivial (ajouter des identifiants aux tableaux de `psychometrics.ts`). Il faut traduire une quinzaine d'affirmations, soit environ 1 min 30 de passation en plus.

### P5. Mesurer directement le cycle « l'un relance, l'autre se ferme »

**Gain clinique.** On mesure les deux pôles du cycle de dispute le plus étudié en thérapie de couple, au lieu de le déduire de deux items de critique et de repli. On repère aussi la capacité à faire une pause, le meilleur remède à la montée émotionnelle.

**Exemple 1**

« Après un désaccord, votre partenaire vous dit : « J'ai besoin d'un moment, on en reparle plus tard. » Le plus souvent : »
- A. Je le ou la laisse tranquille, et nous en reparlons plus tard
- B. J'accepte, mais je reste tendu(e) tant que ce n'est pas réglé
- C. J'insiste pour qu'on en parle tout de suite
- D. Je relance : je le ou la suis, j'appelle ou j'écris plusieurs messages

**Exemple 2**

« Pendant une discussion tendue, quand vous sentez que vous n'arrivez plus à écouter (cœur qui s'accélère, envie de partir) : »
- A. Je le dis et je propose une pause, en fixant un moment pour reprendre
- B. Je continue, même si je n'écoute plus vraiment
- C. Je pars ou je me tais, sans rien expliquer
- D. Cela ne m'arrive pas

**Branchement**
- Exemple 1 C ou D chez l'un, face à l'exemple 2 C (ou à un repli M6_Q15 élevé) chez l'autre : majeure « l'un relance, l'autre se ferme ». Cette règle remplace l'inférence actuelle critique × repli.
- Exemple 2 A des deux côtés : convergence forte (« Vous savez faire une pause et revenir »).

**Coût : moyen.**

### P6. Sexualité : l'intimité avant le mariage et l'écart de désir

**Gain clinique.** L'intimité avant le mariage est probablement la divergence sexuelle la plus fréquente pour ce public, et elle est invisible aujourd'hui. La façon de vivre un écart de désir prédit l'usure d'un couple mieux que la fréquence souhaitée.

**Exemple 1**

« L'intimité physique avant le mariage : »
- A. Exclue pour moi : j'attends le mariage
- B. Je préfère attendre un engagement sérieux (fiançailles, projet officiel)
- C. Possible quand la relation est solide, sans attendre un engagement officiel
- D. Je préfère en parler directement avec la personne

**Exemple 2**

« Si, pendant plusieurs mois, vous aviez moins envie d'intimité que votre partenaire : »
- A. J'en parlerais pour chercher ensemble ce qui nous convient
- B. Je me forcerais pour éviter les tensions
- C. J'attendrais que ça passe, sans en parler
- D. Je penserais que c'est à lui ou à elle de s'adapter

**Branchement**
- Exemple 1 : A face à C est critique ; D face à A compte comme modérée, et non comme neutre.
- Exemple 2 : B ou C donne un conseil au membre seul (même logique que M6_Q08) ; D des deux côtés est un risque partagé.

**Coût : moyen.** À prévoir aussi un point juridique : la vie sexuelle est une donnée relevant de l'article 9 du RGPD, ce qui est déjà le cas de M6_Q06 à M6_Q08 (voir section 7).

### P7. Ce que chacun appelle « tromper »

**Gain clinique.** Sur la fidélité, la vraie divergence porte sur sa définition, pas sur le principe que tout le monde approuve. Cette question remplace la convergence de façade « fidélité absolue ».

**Exemple**

« Pour vous, lesquels de ces comportements de votre partenaire seraient déjà une infidélité ? (plusieurs réponses possibles) »
- A. Échanger des messages de séduction avec quelqu'un d'autre
- B. Garder un profil actif sur un site ou une application de rencontre
- C. Confier à quelqu'un d'autre ce qu'il ou elle ne me dit pas
- D. Revoir un(e) ex sans me le dire
- E. Embrasser quelqu'un d'autre
- F. Regarder des contenus pornographiques
- G. Aucun de ceux-là : seule une relation physique compte

**Branchement**
- Un ou deux comportements cochés par un seul des deux : mineure ; trois ou plus : modérée.
- G face à quatre comportements cochés ou plus : majeure.
- Le moteur sait déjà lire les réponses multiples (« A,C »).

**Coût : moyen.**

### P8. Famille d'origine et capacité à garder sa position (Bowen)

**Gain clinique.** On couvre la famille d'origine (aujourd'hui presque absente) et la différenciation de soi. On distingue la fusion avec les siens, la coupure et la position personnelle sereine. Les conflits avec la belle-famille sont un sujet central pour le public de BOLIGO.

**Exemple 1**

« Dans la maison où vous avez grandi, les désaccords entre adultes se réglaient le plus souvent : »
- A. En discutant, parfois vivement, puis en se réconciliant
- B. Par des cris ou des disputes qui revenaient souvent
- C. Par le silence : on ne parlait pas des problèmes
- D. Une seule personne décidait, les autres suivaient
- E. Je n'ai pas grandi auprès de deux adultes en couple

**Exemple 2**

« Vos proches insistent pour une décision de couple que vous ne partagez pas (lieu du mariage, prénom d'un enfant). Le plus souvent : »
- A. Je suis leur avis pour garder la paix
- B. Nous décidons à deux, et je leur explique calmement notre choix
- C. Je m'oppose à eux vivement
- D. Je prends mes distances avec eux pendant un moment

**À ajouter aussi :** dans M5_Q02, l'option « Je soutiens mon partenaire sur le moment, puis j'en parle seul(e) avec mon parent », et enfin une règle (A ou la nouvelle option face à D : majeure).

**Branchement**
- Exemple 1 : portrait et Sondeur, jamais pénalisé seul. B ou C des deux côtés (deux modèles de silence ou d'éclats) : à explorer.
- Exemple 2 : A face à B, modérée ; A face à C ou D, majeure.

**Coût : moyen.**

### P9. Le versant positif de Gottman : attention au quotidien et désaccords permanents

**Gain clinique.** Le questionnaire mesure aujourd'hui surtout ce qui abîme un couple, et presque rien de ce qui le protège : répondre aux petites demandes d'attention, accepter qu'un désaccord soit permanent.

**Exemple 1**

« Votre partenaire vous raconte un détail de sa journée alors que vous êtes occupé(e). Le plus souvent : »
- A. Je m'arrête un instant pour l'écouter et je réagis
- B. Je réponds brièvement et je reviens à ce que je faisais
- C. Je lui demande d'attendre que j'aie fini, puis je reviens vers lui ou elle
- D. Je continue sans vraiment l'écouter

**Exemple 2**

« Dans tout couple, certains désaccords ne se règlent jamais vraiment (caractère, habitudes). Pour vous : »
- A. C'est normal : on apprend à vivre avec, et même à en rire
- B. Il faut finir par trouver une solution, sinon cela me pèse
- C. Si un désaccord ne se règle pas, c'est que nous ne sommes pas faits l'un pour l'autre
- D. Je n'y ai jamais vraiment pensé

**Branchement**
- Exemple 1 : nourrit un indice d'attention au quotidien (module 6).
- Exemple 2 : C chez l'un, quand une divergence modérée est déjà détectée, fait monter sa gravité d'un cran. A des deux côtés maintient les divergences modérées au rang de nuances.

**Coût : moyen.**

### P10. Hiérarchie des valeurs de vie (Schwartz)

**Gain clinique.** Le cadre des valeurs est aujourd'hui le moins couvert après la famille d'origine. Or l'accord sur les valeurs de fond est l'un des meilleurs soutiens d'un projet commun durable. La question remplace l'approximation de M7_Q01.

**Exemple**

« Parmi ces choses, lesquelles comptent le plus dans votre vie ? (3 au plus) »
- A. La sécurité et la stabilité de ma famille
- B. Le respect des traditions et de ma foi
- C. Réussir et être reconnu(e) pour ce que je fais
- D. Être libre de mes choix
- E. Aider les autres et être juste
- F. Découvrir, voyager, vivre des choses nouvelles
- G. Profiter de la vie et de ses plaisirs
- H. Être en harmonie avec mon entourage, ne pas faire de vagues
- I. Avoir de l'influence et de l'aisance matérielle

**Branchement**
- La proximité se calcule sur le nombre de choix communs.
- Une opposition « tradition et sécurité » (A, B, H) contre « liberté et découverte » (D, F), sans aucun choix commun, donne une divergence modérée.
- La question alimente le module 7 et le portrait.

**Coût : moyen.**

---

## 6. Gains rapides (coût faible, sans nouveau thème)

**Choix multiple et options manquantes**
- Passer M2_Q05 et M6_Q02 en choix multiple : le moteur lit déjà « A,B ».
- M2_Q04 : deux choix au plus. Ajouter « que mes besoins passent toujours après ceux de l'autre », « devoir m'effacer pour être aimé(e) », « ne jamais être assez bien » et « me sentir étouffé(e) ». Quatre schémas précoces de plus sont couverts.
- M3_Q02, M3_Q05, M3_Q07 : ajouter une option « sans objet », et « décès » pour les veufs et veuves.
- Ajouter « Aucune ne me correspond », compté comme neutre, aux questions de scénario les plus contraintes.

**Formulations**
- M2_Q06 : remplacer « (silence punitif) » par « Je ne parle plus à l'autre pendant un moment ».
- M7_Q02 : remplacer « Faible » par « Mesurée ».
- M7_Q03 : retirer « introverti(e) / extraverti(e) » et utiliser la question comme contrôle de cohérence avec M7_Q09 et M7_Q10.

**Doublons et règles**
- M3_Q04 : afficher la question selon la présence d'enfants (M0_Q05 de l'un ou de l'autre), et non selon l'âge.
- M1_Q09 : séparer halal, casher et végétarien, ou retirer la convergence.
- M1_Q04 : supprimer (doublon de M1_Q01).
- M1_Q10 / M5_Q01 : n'en garder qu'une, ou ne compter qu'une seule divergence pour les deux.
- M10_Q02 / M10_Q03 : aligner les options clé à clé.

**Calcul**
- Ne plus comparer par défaut, à 0,65, les questions sans fondement clinique (liste en 4.5, point 4).
- Attachement : instaurer une zone intermédiaire sans style affiché (voir 4.6).

**Nouvelles affirmations**
- Une habitude, en fréquence, croisée avec le signal I de M8_Q10 : « Quand l'autre me dit non, j'insiste pour le faire changer d'avis. »
- Deux affirmations de sincérité de plus : « Il m'est déjà arrivé de bouder pour une broutille. » (pas d'accord = signe d'idéalisation) ; « Je n'ai jamais été de mauvaise humeur avec quelqu'un que j'aime. » Le signal servirait alors à moduler la confiance accordée aux échelles, pas la note.

---

## 7. Hors clinique, à faire vérifier

**Proximité avec des questionnaires protégés.** La documentation (`QUESTIONNAIRE_V6.md`) affirme qu'aucun item protégé n'est reproduit. Pourtant :
- M7_Q09 à M7_Q18 reprennent, item par item, le contenu et l'amorce des dix items du BFI-10 ;
- M2_Q13 à M2_Q16 sont très proches d'items de l'ECR-R, et M2_Q11 s'en approche ;
- M2_Q18 est proche d'un item de l'ERQ.

Les conditions d'usage commercial de ces questionnaires sont à vérifier avec un juriste. En tout état de cause, les réécrire en situations concrètes (P4) règle la question et améliore la mesure.

**RGPD, article 9.** La documentation dit qu'aucune donnée de santé n'est collectée. Mais les convictions religieuses (M1_Q05, M1_Q06) et la vie sexuelle (M6_Q06 à M6_Q08) sont aussi des catégories particulières de l'article 9, qui exigent un consentement explicite.

Les violences subies (M3_Q08) ne relèvent pas de l'article 9 au sens strict, mais la donnée est très sensible : sa finalité doit être justifiée, ou la question retirée.
