# Grand Entretien BOLIGO — V7

Date : 7 octobre 2026. Ce document décrit la V7 du Grand Entretien, ce qui
change par rapport à la V6.2 et pourquoi ; la section 14 décrit la V7.1
(corrections de l'audit clinique de la V7, 168 questions). Il répond point par point à l'audit
clinique (`docs/audit-clinique/grand-entretien.md`, note de 5,5/10) : les dix
propositions P1 à P10, les gains rapides de la section 6, les défauts de calcul
de la section 4.6 et la section 7 (questionnaires protégés, RGPD).

Code concerné :
- `src/interview/questions.data.ts` : questions, table des versions
  (`V7_CHANGES`, `V7_REPLACEMENTS`), questions V6 retirées encore lues
  (`RETIRED_QUESTIONS`), données sensibles (`SENSITIVE_QUESTIONS`) ;
- `src/interview/questions.en.ts` : version anglaise ;
- `src/psychometrics/psychometrics.ts` : échelles, sincérité, lectures croisées ;
- `src/matching/divergence.engine.ts` : règles de divergence ;
- `src/matching/answer-bridge.ts` : lecture des réponses V6 dans les termes de la V7 ;
- `src/portrait/module-affinity.ts`, `portrait.writer.ts`, `portrait.phrases.ts` :
  affinités, fiche Découverte et bilan.

## 1. En bref

| | V6.2 | V7 |
|---|---|---|
| Questions | 139 | **160** (plafond fixé : 160) |
| dont affirmations d'échelle | 36 | 60 |
| Questions V6 conservées (même identifiant, même sens des clés) | — | 89 : 62 inchangées, 20 reformulées, 7 inchangées dont la règle change |
| Questions nouvelles ou dont le sens change (nouvel identifiant) | — | 71 |
| Questions V6 retirées (encore lues pour les entretiens V6) | — | 50 |
| Affirmations reprises d'un questionnaire publié | 17 (BFI-10, ECR-R, ERQ) | **0** |
| Échelles qui décident d'une divergence majeure | 1 à 3 affirmations | 2 à 6 affirmations, dont des inversées ; deux sources concordantes exigées |
| Le membre déclare ce qui est non négociable | non (sauf M8_Q05 C) | oui (M8_Q12), lu par le moteur |
| Comparaison « par défaut » (0,65) des questions sans règle | 12 questions | aucune |
| Violence « selon les circonstances » face à « limite absolue » | majeure | **incompatibilité déclarée** |

| Module | V6 | V7 | dont échelles V7 |
|---|---|---|---|
| M0 Critères essentiels | 10 | 12 | 0 |
| M1 Identité & culture | 12 | 10 | 0 |
| M2 Attachement & émotions | 20 | 26 | 21 |
| M3 Vécu & contexte | 8 | 7 | 0 |
| M4 Vision économique | 12 | 13 | 0 |
| M5 Famille & vie sociale | 7 | 7 | 0 |
| M6 Communication & limites | 14 | 18 | 8 |
| M7 Trajectoire & personnalité | 16 | 21 | 16 |
| M8 Projet de couple | 10 | 12 | 0 |
| M9 Effort & réciprocité | 18 | 22 | 15 |
| M10 Alchimie & désir | 12 | 12 | 0 |
| **Total** | **139** | **160** | **60** |

Durée : les 21 questions de plus sont presque toutes des affirmations d'échelle,
qui se répondent en quelques secondes ; les questions à choix passent de 103 à
100. L'entretien reste sous 30 minutes. Pour limiter la fatigue, qui nuit aussi
à la sincérité : 9 questions sans usage ou sans fondement clinique sont
retirées sans remplacement, les doublons sont fusionnés, les
affirmations des deux dimensions d'attachement sont alternées, et les
questions sur l'ex ne sont posées qu'après une relation sérieuse.

## 2. Cadre clinique : ce qui change et pourquoi

### 2.1 Une mesure à la hauteur des décisions qu'elle déclenche (P4)

En V6, une seule réponse « Souvent » suffisait à une divergence majeure, qui
plafonne le module à 64 % et le score global à 79 %. La V7 applique trois
règles :

1. **Des échelles plus longues, avec des items inversés** (détail en
   section 4) : attachement 6 + 6 affirmations (2 inversées chacune) ;
   réévaluation et suppression 3 chacune (1 inversée) ; chaque « cavalier »
   de Gottman a son antidote inversé ; personnalité 3 ou 4 affirmations par
   trait ; sincérité 5 affirmations (3 inversées). Le biais d'acquiescement est
   contrôlé (section 2.5).
2. **Deux sources concordantes pour une majeure.** Le cycle « l'un relance,
   l'autre se ferme » n'est majeur que si, de chaque côté, le scénario est
   confirmé par l'échelle (ou l'échelle repose sur au moins deux
   affirmations). Un signal d'alerte face à une habitude « très souvent »
   n'est majeur que si une autre réponse du même membre la confirme. Deux
   réparations très lentes (M2_Q07) ou deux silences (M6_Q01, V6) ne sont
   majeurs que si le retrait est confirmé par une autre réponse ; sinon, ils
   sont « à explorer ».
3. **Une zone intermédiaire sans style d'attachement** (défaut 4.6.1) : entre
   40 et 60 sur une dimension, aucun style n'est affiché ; 50 correspond à
   « ni d'accord ni pas d'accord ».

Une consigne de référence implicite est donnée par les situations : chaque
affirmation décrit une scène précise (« Quand la personne que j'aime met
longtemps à répondre… »), qui se répond aussi bien pour une relation passée
qu'en général. L'app n'ayant pas de type « consigne », aucune question vide
n'a été ajoutée.

### 2.2 Distinguer une vraie divergence d'une nuance (P2, P9)

**P2 — ce qui est non négociable (M8_Q12, 3 sujets au plus).** Remplace
M8_Q05 et M8_Q08 (doublons). Table « sujet → questions » :
`NON_NEGOTIABLE_QUESTIONS` (`answer-bridge.ts`).

| Sujet coché | Divergences concernées |
|---|---|
| A Enfants | M0_Q06 |
| B Religion et pratique | religion (M1_Q16 / M1_Q05), pratique (M1_Q17), M1_Q18, alimentation (M1_Q19 / M1_Q09), M1_Q13, M8_Q03 |
| C Fidélité | M6_Q18, M6_Q19, M6_Q10 (V6) |
| D Argent | M4_Q01, M4_Q14, M4_Q05, M4_Q09, M4_Q11, M4_Q12, M4_Q08 (V6) |
| E Lieu de vie | M0_Q03, M7_Q07 |
| F Famille | M5_Q01, M5_Q02, M5_Q03, M5_Q07, M5_Q10, M1_Q15, M1_Q10 (V6) |
| G Intimité avant le mariage | M10_Q17 |
| H Polygamie | M1_Q11 |
| I Tabac, alcool | tabac (M0_Q09), alcool (M0_Q12), M0_Q08 (V6) |
| J Rôles au foyer | M4_Q03, M4_Q04, M4_Q15 |
| K Aucun : tout se discute | — |

- Sujet coché par l'un des deux : la divergence monte d'un cran (modérée →
  majeure, majeure → incompatibilité déclarée) et la fiche le dit (« Ce sujet
  est non négociable pour l'un de vous »).
- Les deux membres ont répondu (V7) et aucun n'a coché le sujet : une majeure
  redevient « à explorer ».
- Une nuance (mineure) ne monte jamais : deux « oui » aux enfants, l'un sans
  condition et l'autre si les conditions sont réunies, ne deviennent pas un
  désaccord parce que les enfants sont non négociables.
- Les limites de sécurité (violence, mots blessants) ne relèvent d'aucun
  sujet : rien ne les adoucit.
- V6 : M8_Q05 (« infidélité » → fidélité ; « enfants ou religion » → les deux)
  et M8_Q08 (« infidélité sous toute forme ») restent lus. Un membre V6 n'a
  rien déclaré : aucune majeure n'est adoucie.
- « Aucun » coché avec d'autres sujets : les sujets cochés priment (l'app ne
  rend pas cette option exclusive).

**P9 — désaccords qui durent (M8_Q14).** Croire qu'un désaccord durable prouve
qu'on n'est pas faits l'un pour l'autre (C) rend chaque différence plus
lourde : la divergence modérée la plus importante (ordre des thèmes) monte
d'un cran, une seule, pour ne pas faire basculer tout le rapport. Deux membres
qui acceptent les désaccords durables (A) gardent les divergences modérées au
rang de nuances, sauf les limites de sécurité et les sujets déclarés non
négociables.

### 2.3 Plus de fausses incompatibilités (P1, défauts 4.6.3 à 4.6.6)

| V6 | Défaut | V7 |
|---|---|---|
| M6_Q10 « les tentations existent » face à « absolue » : critique | Une réponse honnête et ambiguë devenait une incompatibilité | M6_Q18 (réaction à une infidélité, réponses ordonnées) : A/D majeure, A/C modérée ; jamais critique seule. M6_Q19 mesure ce que chacun appelle « tromper ». Règle V6 corrigée (A/C modérée) |
| M0_Q08 « je consomme moi-même » face à « rédhibitoire » : critique | Un verre lors des fêtes devenait une incompatibilité ; trois substances mêlées | Tabac (M0_Q11 face à M0_Q09) et alcool (M0_Q13 face à M0_Q12) séparés, comme le tabac en V6. Critique seulement sur une déclaration explicite (« même occasionnel ») face à une consommation régulière, ou si le sujet est non négociable. Règle V6 corrigée (majeure) |
| M2_Q08 « si je me rends compte de mon erreur » | Contredisait la question ; « ego » orientait | M2_Q22 (après une dispute où l'on pense avoir raison) |
| M1_Q10 et M5_Q01, options identiques | Deux majeures pour un seul désaccord | M1_Q10 retirée ; sa réponse V6 n'est lue qu'à défaut de M5_Q01 |
| M4_Q08 (épargne) et M4_Q01 | Double compte | M4_Q08 retirée ; M4_Q14 mesure le tempérament financier |
| M2_Q06, M9_Q04, M6_Q01, M2_Q07, M2_Q08 | Le retrait compté jusqu'à cinq fois | M2_Q06 et M9_Q04 retirées ; le cycle est mesuré une fois (section 2.4) |
| M1_Q09 « halal, casher, végétarien » | Fausse convergence « interdits alimentaires » | M1_Q19 sépare les règles ; convergence seulement pour la même règle |
| M10_Q02 / M10_Q03 | Options non alignées, comparées clé à clé | M10_Q03 réalignée (C chaleureux, D calme et stable) |
| M1_Q11 D, M6_Q06 D, M6_Q07 D, M7_Q07 D | Réponses refuges qui neutralisaient la règle | M1_Q11 D face à « monogamie sans discussion » : modérée ; M6_Q06 et M6_Q07 retirées ; M7_Q07 D reste neutre (ouverture réelle) |

### 2.4 Les domaines cliniques qui manquaient

| Proposition | Questions | Cadre |
|---|---|---|
| P3 Religion | M1_Q16 appartenance (le croyant non pratiquant a enfin une réponse), M1_Q17 pratique, M1_Q18 attente de conversion | L'écart de pratique et l'exigence de conversion pèsent plus que l'appartenance |
| P5 Cycle « l'un relance, l'autre se ferme » | M6_Q16 (quand on n'arrive plus à écouter : pause, escalade, départ), M6_Q17 (le partenaire demande une pause) | Thérapie centrée sur les émotions ; montée émotionnelle et pause (Gottman) |
| P6 Sexualité, sobrement | M10_Q16 place de l'intimité, M10_Q17 intimité avant le mariage, M10_Q18 écart de désir | Aucune question de fréquence ni de détail intime |
| P7 « Tromper » | M6_Q19 (choix multiple) | La divergence porte sur la définition, pas sur le principe |
| P8 Famille d'origine et différenciation | M3_Q12 (comment on se disputait à la maison), M5_Q10 (garder sa position face aux proches), M5_Q02 E (soutenir le partenaire puis parler à son parent) | Bowen, famille d'origine |
| P9 Versant positif de Gottman | M9_Q25 (répondre aux demandes d'attention), M8_Q14 (désaccords durables), antidotes M6_Q20 à M6_Q23 | Se tourner vers l'autre, problèmes perpétuels |
| P10 Valeurs | M7_Q19 (3 au plus) | Schwartz : conservation, ouverture, accomplissement, dépassement de soi |
| Gains rapides | M3_Q11 temps depuis la dernière relation ; M4_Q15 tâches de la maison ; M8_Q13 attitude face à la séparation ; M8_Q15 éducation des enfants ; M8_Q03 E mariage coutumier ; M2_Q04 (deux peurs, six options) | Disponibilité, partage des rôles, engagement, parentalité |

### 2.5 Sincérité : elle module la confiance, jamais la note

- Cinq affirmations (M9_Q08, M9_Q20 à M9_Q23), dont trois inversées : ne pas
  admettre un petit travers universel (bouder pour une broutille, un « je suis
  en route » avant de partir, être moins patient fatigué) signale un portrait
  idéalisé. M9_Q09 (« jamais le moindre mensonge »), qu'un croyant pouvait
  approuver comme un idéal, est remplacée par M9_Q22.
- Réponses par acquiescement : d'accord avec une affirmation et son contraire
  sur trois échelles au moins, ou la même réponse partout.
- Effet : la confiance passe de 1 à 0,5, ce qui divise par deux le poids des
  échelles dans les affinités. **Aucun score ne change**, rien n'est montré
  aux autres membres ; le membre lit une observation bienveillante dans son
  bilan.

### 2.6 Le score ne pénalise plus la franchise (défaut 4.6.2)

`psychometricSimilarities` ne compte plus que des combinaisons à risque entre
les deux membres : inquiétude pour le lien face à l'inconfort avec la
proximité, deux inconforts, deux inquiétudes (poids réduit), deux personnes
qui retiennent tout, relance face à repli, deux replis, deux ironies. Un
membre qui avoue de l'anxiété ou des réflexes de dispute garde 100 % avec un
partenaire dont le profil ne s'y heurte pas. La bienveillance et la sérénité,
propres à chacun, ne sont plus comparées ; l'énergie sociale, l'ouverture et
le sens de l'organisation le sont (rythme de vie).

Les questions sans règle (situation, humour, leçon du passé…) ne sont plus
comparées « par défaut » à 0,65 (défaut 4.5.4) : le moteur fournit un point de
comparaison par question ou règle croisée, et seules celles-ci comptent.

### 2.7 Sécurité

- **Violence physique (M6_Q04)** : « ça dépend des circonstances » face à
  « limite absolue » est une incompatibilité déclarée (hard stop), comme les
  autres critères non négociables du moteur ; face à « inacceptable, mais je
  tenterais d'abord une discussion » : majeure.
- **Tolérance partagée (contre-audit)** : quand les deux membres donnent la
  même réponse autre que la limite absolue, sur la violence (M6_Q04) comme sur
  les mots blessants (M6_Q05), c'est un risque partagé et jamais un accord :
  B → à explorer, C (« ça dépend » / « ça peut arriver ») → majeure,
  D → majeure. Le Sondeur ne reçoit donc jamais un « accord » sur une
  tolérance à la violence. Les identifiants M6_Q04 et M6_Q05 sont conservés :
  le Sondeur (`SAFETY_QUESTIONS`) n'y pose que des questions de limite, sans
  citer les réponses.
- **Ne pas respecter un « non »** : le signal d'alerte I de M8_Q10 est
  désormais croisé avec une habitude (M9_Q24, « quand l'autre me dit non,
  j'insiste »).
- **Violences subies (M3_Q08)** : la question est retirée. Elle était
  collectée sans usage ni orientation vers une aide (section 7 de l'audit) ;
  les réponses V6 restent enregistrées et sont signalées comme sensibles.

### 2.8 Libellés d'accord fidèles (contre-audit)

Chaque règle a un `topic`, sujet neutre (« La présence d'enfants »), distinct
du libellé de divergence (« Enfants déjà présents »). Le libellé de repli d'une
convergence est « Même réponse sur « la présence d'enfants » », et non plus un
libellé qui suppose un fait. Les règles qui produisent souvent un accord ont un
libellé propre (« Vous n'avez ni l'un ni l'autre d'enfant à charge »). Aucun
accord n'est affiché sur l'intime (M10_Q16, M10_Q18, M6_Q07 ; M10_Q17 C et D)
ni sur une convergence sans information (M6_Q10 « fidélité absolue », effet
plafond ; deux « autre religion » ; deux « autre règle alimentaire »).

## 3. Questionnaires protégés : des items propres à BOLIGO

Les affirmations V6 trop proches de questionnaires publiés (M7_Q09 à M7_Q18,
proches du BFI-10 ; M2_Q11, M2_Q13 à M2_Q16, proches de l'ECR-R ; M2_Q18, proche
de l'ERQ) sont retirées et remplacées par des **situations concrètes** écrites
pour BOLIGO. Les dimensions sont les mêmes (inquiétude pour le lien et
inconfort avec la proximité ; cinq traits ; prendre du recul et retenir ses
émotions), mais aucun énoncé ne reprend l'amorce ni le contenu d'un item
publié : plus de « Je me vois comme quelqu'un qui… », plus d'énoncés
abstraits (« Je suis mal à l'aise quand l'autre veut être très proche »), mais
des scènes (« Quand l'autre me dit des mots très tendres, je me sens un peu
gêné(e) et je change de sujet »). M2_Q12, M2_Q17 et M2_Q21 sont retirées avec
leur échelle. Les réponses V6 restent lues (échelles `*_V6`) tant qu'un membre
n'a pas répondu à la V7. La vérification juridique recommandée par l'audit
reste utile, mais le risque ne porte plus que sur les réponses déjà
enregistrées.

## 4. Dimensions mesurées et leurs items

Notation : A = 1 … E = 5 ; une affirmation inversée vaut 6 − note ; score 0–100
dès que la moitié des affirmations est renseignée. Échelles d'accord, sauf les
quatre cavaliers, les habitudes et M9_Q16 (fréquence).

**Inquiétude pour le lien** (6 affirmations, 2 inversée(s) ; V6 : M2_Q11, M2_Q12, M2_Q13)

| Question | Affirmation | Sens |
|---|---|---|
| M2_Q23 | Quand la personne que j'aime met longtemps à répondre à un message, je relis notre conversation pour y chercher un signe. | directe |
| M2_Q25 | Si je n'ai reçu aucun mot tendre de la journée, je me demande si quelque chose ne va pas entre nous. | directe |
| M2_Q27 | Quand nous passons quelques jours sans nous voir, je reste serein(e). | inversée |
| M2_Q29 | Après une petite dispute, j'ai du mal à penser à autre chose tant que nous ne nous sommes pas réconciliés. | directe |
| M2_Q31 | Quand la personne que j'aime passe une soirée avec ses amis sans moi, cela me fait plutôt plaisir pour elle. | inversée |
| M2_Q33 | Quand l'autre ne répond pas, il m'arrive d'appeler ou d'écrire plusieurs fois de suite. | directe |

**Inconfort avec la proximité** (6 affirmations, 2 inversée(s) ; V6 : M2_Q14, M2_Q15, M2_Q16)

| Question | Affirmation | Sens |
|---|---|---|
| M2_Q24 | Quand une relation devient très sérieuse, j'ai envie de reprendre un peu de distance. | directe |
| M2_Q26 | Quand j'apprends une mauvaise nouvelle, la personne que j'aime est la première à qui j'ai envie d'en parler. | inversée |
| M2_Q28 | Quand j'ai un gros souci, je préfère le régler seul(e) avant d'en parler à la personne que j'aime. | directe |
| M2_Q30 | Quand l'autre me dit des mots très tendres, je me sens un peu gêné(e) et je change de sujet. | directe |
| M2_Q32 | Quand je suis épuisé(e), j'accepte volontiers que l'autre prenne soin de moi. | inversée |
| M2_Q34 | Quand l'autre me demande ce que je ressens, je réponds souvent « ça va » pour couper court. | directe |

**Prendre du recul** (3 affirmations, 1 inversée(s) ; V6 : M2_Q17)

| Question | Affirmation | Sens |
|---|---|---|
| M2_Q35 | Quand quelqu'un me parle sèchement, je me dis qu'il a peut-être une mauvaise journée, et cela m'apaise. | directe |
| M2_Q37 | Après un contretemps (un train annulé, un rendez-vous raté), je trouve vite un côté positif ou une leçon à en tirer. | directe |
| M2_Q39 | Quand une remarque me blesse, j'y repense en boucle pendant des heures. | inversée |

**Retenir ses émotions** (3 affirmations, 1 inversée(s) ; V6 : M2_Q18)

| Question | Affirmation | Sens |
|---|---|---|
| M2_Q36 | Quand je suis triste, je fais en sorte que personne ne le remarque. | directe |
| M2_Q38 | Même très en colère, je garde un visage calme pour que rien ne se voie. | directe |
| M2_Q40 | Quand une bonne nouvelle me rend heureux(se), cela se voit tout de suite. | inversée |

**Critique (Gottman)** (2 affirmations, 1 inversée(s))

| Question | Affirmation | Sens |
|---|---|---|
| M6_Q12 | Pendant une dispute, je reproche à l'autre ce qu'il ou elle est, plutôt qu'un fait précis (« tu es toujours… », « tu ne fais jamais… »). | directe |
| M6_Q20 | Quand quelque chose me dérange, je le dis en parlant de ce que je ressens plutôt qu'en accusant (« je me suis senti(e) seul(e) hier soir »). | inversée |

**Mépris (Gottman)** (2 affirmations, 1 inversée(s))

| Question | Affirmation | Sens |
|---|---|---|
| M6_Q13 | Pendant une dispute, je deviens ironique, je me moque ou je lève les yeux au ciel. | directe |
| M6_Q21 | Même fâché(e), je peux dire à l'autre ce que j'apprécie chez lui ou elle. | inversée |

**Attitude défensive (Gottman)** (2 affirmations, 1 inversée(s))

| Question | Affirmation | Sens |
|---|---|---|
| M6_Q14 | Quand on me fait un reproche, je me justifie ou je renvoie la faute plutôt que d'écouter. | directe |
| M6_Q22 | Quand on me fait un reproche, je cherche d'abord ce qu'il a de juste avant de me défendre. | inversée |

**Repli (Gottman)** (2 affirmations, 1 inversée(s))

| Question | Affirmation | Sens |
|---|---|---|
| M6_Q15 | Pendant une dispute, je me ferme complètement et je ne réponds plus. | directe |
| M6_Q23 | Pendant une dispute, je montre à l'autre que je l'écoute (je le regarde, je réponds, je reformule). | inversée |

**Énergie sociale** (3 affirmations, 1 inversée(s) ; V6 : M7_Q09, M7_Q10)

| Question | Affirmation | Sens |
|---|---|---|
| M7_Q20 | Dans une fête où je connais peu de monde, je vais facilement vers les autres pour discuter. | directe |
| M7_Q34 | Dans un groupe d'amis, c'est souvent moi qui propose une sortie ou une activité. | directe |
| M7_Q25 | Après une journée passée avec beaucoup de monde, j'ai surtout besoin de calme et de solitude. | inversée |

**Bienveillance** (3 affirmations, 1 inversée(s) ; V6 : M7_Q11, M7_Q12)

| Question | Affirmation | Sens |
|---|---|---|
| M7_Q21 | Quand un ami me demande un service qui me dérange un peu, je le rends quand même volontiers. | directe |
| M7_Q26 | Dans un désaccord entre amis, je cherche un terrain d'entente plutôt qu'à imposer mon avis. | directe |
| M7_Q30 | Dans une négociation (un achat, un loyer), je défends mes intérêts avant tout, même si l'autre y perd. | inversée |

**Sens de l’organisation** (3 affirmations, 1 inversée(s) ; V6 : M7_Q13, M7_Q14)

| Question | Affirmation | Sens |
|---|---|---|
| M7_Q22 | Je règle mes factures et mes papiers administratifs dans les délais. | directe |
| M7_Q27 | Quand je promets de faire quelque chose, je le fais, même si cela me coûte. | directe |
| M7_Q31 | Il m'arrive souvent de chercher mes clés ou mes papiers parce qu'ils ne sont pas rangés. | inversée |

**Sérénité** (4 affirmations, 2 inversée(s) ; V6 : M7_Q16, M7_Q15)

| Question | Affirmation | Sens |
|---|---|---|
| M7_Q23 | Pour une petite contrariété (un retard, un objet égaré), je peux m’énerver très vite. | inversée |
| M7_Q28 | Je m'inquiète longtemps pour des choses qui n'arriveront peut-être jamais. | inversée |
| M7_Q32 | Quand je reçois une critique au travail, je l'encaisse sans perdre mon calme. | directe |
| M7_Q33 | Le soir, j'arrive en général à laisser de côté les soucis de la journée. | directe |

**Ouverture d’esprit** (3 affirmations, 1 inversée(s) ; V6 : M7_Q17, M7_Q18)

| Question | Affirmation | Sens |
|---|---|---|
| M7_Q24 | J’aime découvrir des lieux, des cuisines ou des idées que je ne connais pas encore. | directe |
| M7_Q35 | Un livre, un film ou une conversation peut me faire réfléchir pendant plusieurs jours. | directe |
| M7_Q29 | Je préfère les activités que je connais déjà à celles que je n’ai jamais essayées. | inversée |

**Timidité au début d’une relation** (3 affirmations, 1 inversée(s))

| Question | Affirmation | Sens |
|---|---|---|
| M2_Q19 | Au début d'une rencontre, je me sens intimidé(e). | directe |
| M2_Q20 | Il me faut du temps avant de parler de moi et de ce que je ressens. | directe |
| M2_Q41 | Avec une personne que je viens de rencontrer, je me sens vite à l’aise. | inversée |

**Caractère exigeant (bouderie, attentes non dites, impatience)** (3 affirmations, 0 inversée(s))

| Question | Affirmation | Sens |
|---|---|---|
| M9_Q16 | Quand je n'obtiens pas ce que je veux, je le fais sentir (bouderie, froideur). | directe |
| M9_Q17 | Dans un couple, j'attends que l'autre devine mes envies sans que j'aie à les dire. | directe |
| M9_Q18 | Quand j'ai envie de quelque chose, j'ai du mal à attendre. | directe |

**Contrôle de sincérité** (5 affirmations, 3 inversée(s))

| Question | Affirmation | Sens |
|---|---|---|
| M9_Q08 | Il ne m'est jamais arrivé d'être jaloux(se), même un tout petit peu. | directe |
| M9_Q21 | Je n'ai jamais été de mauvaise humeur avec quelqu'un que j'aime. | directe |
| M9_Q20 | Il m'est déjà arrivé de bouder pour une broutille. | inversée |
| M9_Q22 | Il m'est déjà arrivé de dire « je suis en route » alors que je n'étais pas encore parti(e). | inversée |
| M9_Q23 | Quand je suis fatigué(e), il m'arrive d'être moins patient(e) avec mes proches. | inversée |


**Habitudes** (jamais pénalisées seules, lues face aux signaux d'alerte de
l'autre, M8_Q10) : M9_Q10 à M9_Q15, M6_Q14 et, en V7, M9_Q24 (« quand l'autre
me dit non, j'insiste »).

**Questions miroir** (ce qu'on vous a reproché face à ce que vous déclarez) :
M2_Q05 et M6_Q02, désormais à choix multiple.

**Scénarios du cycle de dispute** (P5) : M6_Q16 (repli : « je pars ou je me
tais » ; escalade : « je hausse le ton » ; pause : « je propose une pause »),
M6_Q17 (relance : « j'insiste », « je relance »).

## 5. Chaque ajout, justifié

| Question | Sujet | Pourquoi |
|---|---|---|
| M0_Q11 | Le tabac chez l'autre | Remplace M0_Q08 (trois substances mêlées) ; croisée avec M0_Q09 |
| M0_Q12 | Votre consommation d'alcool | Seul le tabac était demandé pour soi (audit M0) ; sans elle, un refus de l'alcool ne pouvait pas être croisé |
| M0_Q13 | L'alcool chez l'autre | Remplace M0_Q08 ; « même occasionnel » rend le refus explicite (P1 b) |
| M1_Q16 | Religion ou conviction | Remplace M1_Q05 : le croyant non pratiquant, les Églises chrétiennes, les religions traditionnelles et « autre » ont une réponse (P3) |
| M1_Q17 | Pratique religieuse | L'écart de pratique pèse plus que l'appartenance (P3) ; posée aux seuls membres qui ont une religion |
| M1_Q18 | Attente de conversion | Remplace M1_Q06, maladroite pour un non-croyant ; la conversion exigée est la vraie source de conflit (P3) |
| M1_Q19 | Habitudes alimentaires | Remplace M1_Q09 : halal, casher et végétarien séparés (défaut 4.6.6) |
| M2_Q22 | Le premier pas après une dispute | Remplace M2_Q08, dont une option contredisait la question (P1 c) |
| M2_Q23 à M2_Q34 | Inquiétude pour le lien, inconfort avec la proximité (6 + 6) | P4 : 3 → 6 affirmations, 2 inversées ; remplacent les items proches de l'ECR-R et les scénarios M2_Q01 à M2_Q03 ; M2_Q33 mesure la relance (comportement de protestation) |
| M2_Q35 à M2_Q40 | Prendre du recul, retenir ses émotions (3 + 3) | P4 : 1 → 3 affirmations ; remplacent les items proches de l'ERQ ; la rumination sert d'item inversé |
| M2_Q41 | Aisance avec une personne nouvelle | Item inversé de la timidité ; remplace M2_Q21, qui mesurait autre chose (audit M2) |
| M3_Q11 | Dernière relation sérieuse | Disponibilité émotionnelle et temps écoulé (audit M3, M0) ; conditionne les questions sur l'ex |
| M3_Q12 | Les disputes à la maison dans l'enfance | Famille d'origine (P8) : portrait et Sondeur, jamais pénalisée seule |
| M4_Q14 | Épargne ou dépense | Tempérament financier, absent (audit M4) ; remplace M4_Q08, doublon de M4_Q01 |
| M4_Q15 | Tâches de la maison | Un des sujets de dispute les plus fréquents, absent de la V6 |
| M5_Q09 | Les amitiés de l'autre sexe chez le partenaire | Remplace M5_Q04, qui mêlait ce que je fais et ce que j'accepte |
| M5_Q10 | Garder sa position face aux proches | Différenciation de soi (P8) : fusion, coupure ou position sereine |
| M6_Q16 | Quand on n'arrive plus à écouter | Montée émotionnelle, escalade et pause (P5) ; remplace M6_Q01, dont manquait le pôle « attaque » |
| M6_Q17 | Quand l'autre demande une pause | Pôle « relance » du cycle, mesuré directement (P5) |
| M6_Q18 | Si votre partenaire vous trompait | Remplace M6_Q10 (P1 a) |
| M6_Q19 | Ce que chacun appelle « tromper » | P7 |
| M6_Q20 à M6_Q23 | Les antidotes des quatre cavaliers (inversés) | P4 et P9 : un cavalier ne repose plus sur une seule affirmation ; le versant positif de Gottman est mesuré |
| M7_Q19 | Valeurs de vie (3 au plus) | P10 ; remplace M7_Q01, aux options non exclusives |
| M7_Q20 à M7_Q35 | Cinq traits en situations concrètes (3 ou 4 par trait) | Remplacent les items proches du BFI-10 (section 7) ; fiabilité individuelle ; l'irritabilité (M7_Q23), facette la plus liée à l'insatisfaction de couple, est mesurée |
| M8_Q12 | Ce qui est non négociable | P2 ; remplace M8_Q05 et M8_Q08 (doublons) |
| M8_Q13 | Un couple malheureux après des années | Attitude face à la séparation, indicateur d'engagement (audit M8) |
| M8_Q14 | Les désaccords qui durent | P9 |
| M8_Q15 | L'éducation des enfants | Absente (audit M8) ; posée si des enfants sont là ou souhaités |
| M9_Q20 à M9_Q23 | Sincérité (3 inversées) | Deux à trois affirmations de plus (gains rapides) ; M9_Q22 remplace M9_Q09 |
| M9_Q24 | Insister après un « non » | Croisée avec le signal d'alerte le plus important pour la sécurité (gains rapides) |
| M9_Q25 | Répondre aux petites demandes d'attention | P9 (« se tourner vers l'autre ») |
| M10_Q16 | La place de l'intimité physique | Remplace M6_Q06 (trois axes mêlés, réponse refuge) |
| M10_Q17 | L'intimité avant le mariage | P6 : probablement la divergence la plus fréquente pour ce public |
| M10_Q18 | Un écart de désir | P6 : remplace M6_Q07 (fréquence souhaitée, un détail intime) |

## 6. Retraits

| Question V6 | Pourquoi |
|---|---|
| M0_Q08 | Trois substances et deux axes mêlés ; remplacée par M0_Q11 à M0_Q13 |
| M1_Q04 | Doublon de M1_Q01, stéréotypé, jamais utilisé |
| M1_Q05, M1_Q06 | Remplacées par M1_Q16 à M1_Q18 |
| M1_Q08 | Centrée sur la France ; la langue du quotidien est déjà demandée (M0_Q10) et filtrée |
| M1_Q09 | Remplacée par M1_Q19 |
| M1_Q10 | Doublon mot pour mot de M5_Q01 |
| M2_Q01 à M2_Q03 | Scénarios aux options non exclusives ou orientées ; remplacés par les échelles allongées |
| M2_Q06 | Jargon (« silence punitif »), doublon de M9_Q04 ; remplacée par M6_Q16 et la suppression |
| M2_Q08 | Remplacée par M2_Q22 |
| M2_Q11 à M2_Q18, M2_Q21 | Items proches de questionnaires publiés, ou autre concept (M2_Q21) |
| M3_Q01 | Toutes les options désirables, comparée sans fondement |
| M3_Q02 | Options incomplètes et mêlées (violence et manque de respect) ; sans règle |
| M3_Q08 | Violences subies : donnée très sensible, sans usage ni orientation vers une aide |
| M4_Q08 | Doublon de M4_Q01 |
| M5_Q04 | Mêlait ce que je fais et ce que j'accepte ; remplacée par M5_Q09 |
| M5_Q05 | Réseaux sociaux : préférence sans fondement clinique, comparée par défaut ; la transparence est mesurée par M5_Q08 et M6_Q19 |
| M6_Q01 | Remplacée par M6_Q16 et M6_Q17 |
| M6_Q06, M6_Q07 | Remplacées par M10_Q16 et M10_Q18 (sans détail intime) |
| M6_Q10 | Remplacée par M6_Q18 et M6_Q19 |
| M7_Q01 | Remplacée par M7_Q19 |
| M7_Q03 | Jargon (introverti, extraverti), doublon de l'énergie sociale |
| M7_Q09 à M7_Q18 | Items quasi traduits du BFI-10 |
| M8_Q05, M8_Q08 | Doublons ; remplacées par M8_Q12 |
| M9_Q04 | Doublon de M2_Q06 |
| M9_Q09 | Approuvable comme un idéal religieux ; remplacée par M9_Q22 |
| M10_Q01 | Option obscure, jamais utilisée |
| M10_Q06 | Comparée sans fondement ; l'attirance est déjà mesurée par M10_Q13 et M10_Q15 |
| M10_Q10 | Abstraite (« en un mot »), auto-description flatteuse |

## 7. Table de correspondance V6 → V7

« Inchangée » : même texte, mêmes clés. « Modifiée » : même identifiant, même
sens des clés (formulation, option ajoutée, choix multiple ou règle
d'affichage). « Règle modifiée » : question inchangée, règle de compatibilité
revue. « Retirée → … » : plus posée, réponses V6 encore lues ; questions V7 qui
reprennent le sujet.

| V6 | Question | V7 |
|---|---|---|
| M0_Q01 | La tranche d'âge que vous recherchez chez votre partenaire | inchangée |
| M0_Q02 | Le périmètre géographique de vos rencontres | inchangée |
| M0_Q03 | Êtes-vous prêt(e) à déménager pour votre partenaire ? | inchangée |
| M0_Q04 | Votre situation actuelle | modifiée (même sens des clés) |
| M0_Q05 | Avez-vous des enfants ? | modifiée (même sens des clés) |
| M0_Q06 | Souhaitez-vous des enfants à l'avenir ? | inchangée |
| M0_Q07 | Votre niveau d'études | inchangée |
| M0_Q09 | Vous-même, fumez-vous ? | inchangée |
| M0_Q08 | Le tabac, l'alcool ou d'autres substances chez votre partenaire | retirée → M0_Q11, M0_Q12, M0_Q13 |
| M0_Q10 | Dans quelles langues êtes-vous à l'aise pour vivre une relation au quo | inchangée |
| M1_Q01 | Votre continent d'origine ou de référence culturelle (deux au plus si  | inchangée |
| M1_Q02 | La culture de votre partenaire idéal(e) | modifiée (même sens des clés) |
| M1_Q03 | Quelle place accordez-vous aux traditions de mariage dans votre cultur | inchangée |
| M1_Q04 | Laquelle de ces traditions de mariage vous représente le mieux ? | retirée |
| M1_Q05 | Votre religion ou spiritualité | retirée → M1_Q16, M1_Q17 |
| M1_Q06 | Votre religion aura-t-elle un impact sur votre partenaire ? | retirée → M1_Q18 |
| M1_Q08 | La langue parlée à la maison | retirée |
| M1_Q09 | Votre rapport aux interdits alimentaires | retirée → M1_Q19 |
| M1_Q10 | Le rôle des anciens et des patriarches dans vos décisions de couple | retirée → M5_Q01 |
| M1_Q11 | Votre position sur la polygamie | inchangée, règle modifiée |
| M1_Q13 | Votre rapport à la transmission culturelle à vos enfants | inchangée |
| M1_Q15 | Si votre famille n'approuve pas votre partenaire pour des raisons cult | inchangée |
| M2_Q01 | Quand votre partenaire ne répond pas à vos messages pendant plusieurs  | retirée → M2_Q23, M2_Q33 |
| M2_Q02 | Quand votre partenaire demande plus de proximité que vous n'en souhait | retirée → M2_Q24, M2_Q30 |
| M2_Q03 | Dans une relation, ce dont vous avez le plus besoin | retirée → M2_Q23, M2_Q25, M2_Q27, M2_Q29, M2_Q31, M2_Q33, M2_Q24, M2_Q26, M2_Q28, M2_Q30, M2_Q32, M2_Q34 |
| M2_Q04 | Vos plus grandes peurs dans une relation (2 au plus) | modifiée (même sens des clés) |
| M2_Q05 | On m'a déjà reproché dans une relation de : (plusieurs réponses possib | modifiée (même sens des clés) |
| M2_Q06 | Quand je suis en colère dans une relation, j'ai tendance à | retirée → M6_Q16, M2_Q36, M2_Q38 |
| M2_Q07 | Après une dispute sérieuse, vous revenez à la douceur en | inchangée, règle modifiée |
| M2_Q08 | Êtes-vous capable de vous excuser en premier, même si vous pensez avoi | retirée → M2_Q22 |
| M2_Q10 | Si vous traversiez une période difficile, demander l'aide d'un profess | inchangée |
| M2_Q11 | J'ai souvent peur de tenir davantage à l'autre que l'autre ne tient à  | retirée → M2_Q23, M2_Q25, M2_Q27, M2_Q29, M2_Q31, M2_Q33 |
| M2_Q12 | Quand l'autre prend un peu de distance, j'ai besoin d'être rassuré(e)  | retirée → M2_Q23, M2_Q25, M2_Q27, M2_Q29, M2_Q31, M2_Q33 |
| M2_Q13 | L'idée d'être quitté(e) m'inquiète rarement. | retirée → M2_Q23, M2_Q25, M2_Q27, M2_Q29, M2_Q31, M2_Q33 |
| M2_Q14 | Je suis mal à l'aise quand l'autre veut être très proche de moi. | retirée → M2_Q24, M2_Q26, M2_Q28, M2_Q30, M2_Q32, M2_Q34 |
| M2_Q15 | Je préfère ne pas montrer à l'autre ce que je ressens au fond de moi. | retirée → M2_Q24, M2_Q26, M2_Q28, M2_Q30, M2_Q32, M2_Q34 |
| M2_Q16 | Il m'est facile de compter sur l'autre quand j'en ai besoin. | retirée → M2_Q24, M2_Q26, M2_Q28, M2_Q30, M2_Q32, M2_Q34 |
| M2_Q17 | Quand je suis contrarié(e), j'arrive à regarder la situation sous un a | retirée → M2_Q35, M2_Q37, M2_Q39 |
| M2_Q18 | Je garde mes émotions pour moi, même quand elles sont fortes. | retirée → M2_Q36, M2_Q38, M2_Q40 |
| M2_Q19 | Au début d'une rencontre, je me sens intimidé(e). | modifiée (même sens des clés) |
| M2_Q20 | Il me faut du temps avant de parler de moi et de ce que je ressens. | inchangée |
| M2_Q21 | Les gens se confient facilement à moi. | retirée → M2_Q41 |
| M3_Q01 | La leçon principale de vos relations passées | retirée |
| M3_Q02 | La cause principale de votre dernière rupture | retirée |
| M3_Q03 | Comment avez-vous vécu votre dernière rupture ? | modifiée (même sens des clés) |
| M3_Q04 | Dans une famille recomposée, la place du beau-parent auprès des enfant | modifiée (même sens des clés) |
| M3_Q05 | Quelle place accordez-vous à votre ex dans votre vie actuelle ? | modifiée (même sens des clés) |
| M3_Q07 | Avez-vous des conflits non résolus avec votre ex-partenaire ? (plusieu | modifiée (même sens des clés) |
| M3_Q08 | Avez-vous vécu une situation de violence dans une relation passée ? | retirée |
| M3_Q10 | Avez-vous déjà retrouvé les mêmes situations difficiles d'une relation | modifiée (même sens des clés) |
| M4_Q01 | Votre rapport à l'argent dans un couple | inchangée |
| M4_Q03 | Votre vision du rôle économique de l'homme | modifiée (même sens des clés) |
| M4_Q04 | Votre vision du rôle économique de la femme | inchangée |
| M4_Q05 | Votre rapport aux envois d'argent à la famille élargie | inchangée |
| M4_Q06 | L'achat immobilier dans votre projet de vie | inchangée |
| M4_Q07 | La dot ou le mahr dans votre culture | inchangée |
| M4_Q08 | Votre rapport à l'épargne dans le couple | retirée → M4_Q14 |
| M4_Q09 | Les dettes ou crédits en cours de votre partenaire | inchangée |
| M4_Q10 | Au premier rendez-vous, l'addition | inchangée |
| M4_Q11 | Si votre partenaire gagnait peu ou plus rien pendant une longue périod | inchangée |
| M4_Q12 | La place de l'argent et du niveau de vie dans le choix d'un(e) partena | inchangée |
| M4_Q13 | Prêter vos affaires personnelles à votre partenaire (voiture, téléphon | inchangée |
| M5_Q01 | La place de votre famille dans vos décisions de couple | inchangée |
| M5_Q02 | Votre mère (ou votre père) manque de respect à votre partenaire. Vous | modifiée (même sens des clés) |
| M5_Q03 | La cohabitation avec la belle-famille | inchangée |
| M5_Q04 | Avez-vous des amis proches du sexe opposé ? | retirée → M5_Q09 |
| M5_Q05 | Les réseaux sociaux et votre vie de couple | retirée |
| M5_Q07 | La fréquence idéale des visites à la belle-famille | inchangée |
| M5_Q08 | L'accès au téléphone et aux messages de votre partenaire | inchangée |
| M6_Q01 | Lors d'une dispute, votre comportement concret est plutôt | retirée → M6_Q16, M6_Q17 |
| M6_Q02 | On m'a déjà reproché dans une dispute de : (plusieurs réponses possibl | modifiée (même sens des clés) |
| M6_Q03 | Avez-vous besoin de gagner le débat ou d'avoir le dernier mot ? | inchangée, règle modifiée |
| M6_Q04 | La violence physique dans une relation | inchangée, règle modifiée |
| M6_Q05 | Les insultes ou les mots blessants lors d'une dispute | inchangée, règle modifiée |
| M6_Q06 | Votre rapport à la sexualité dans le couple | retirée → M10_Q16 |
| M6_Q07 | La fréquence d'intimité physique que vous souhaitez idéalement dans un | retirée → M10_Q18 |
| M6_Q08 | Quand vous n'avez pas envie d'intimité physique et que votre partenair | inchangée |
| M6_Q10 | La fidélité dans votre conception du couple | retirée → M6_Q18, M6_Q19 |
| M6_Q11 | Après une dispute, la réconciliation idéale pour vous | inchangée, règle modifiée |
| M6_Q12 | Pendant une dispute, je reproche à l'autre ce qu'il ou elle est, plutô | inchangée |
| M6_Q13 | Pendant une dispute, je deviens ironique, je me moque ou je lève les y | inchangée |
| M6_Q14 | Quand on me fait un reproche, je me justifie ou je renvoie la faute pl | inchangée |
| M6_Q15 | Pendant une dispute, je me ferme complètement et je ne réponds plus. | inchangée |
| M7_Q01 | Dans 5 ans, si tout se passe comme vous le souhaitez, votre vie ressem | retirée → M7_Q19 |
| M7_Q02 | Votre niveau d'ambition professionnelle | modifiée (même sens des clés) |
| M7_Q03 | Vous êtes plutôt | retirée → M7_Q20, M7_Q25, M7_Q34 |
| M7_Q05 | Votre rapport au changement et à l'imprévu | inchangée |
| M7_Q07 | Où vous voyez-vous vivre dans 5 ans ? | inchangée |
| M7_Q08 | Le temps passé ensemble dans la semaine, idéalement | inchangée |
| M7_Q09 | Je me vois comme quelqu'un qui est sociable et va facilement vers les  | retirée → M7_Q20, M7_Q25, M7_Q34 |
| M7_Q10 | Je me vois comme quelqu'un qui est plutôt réservé(e). | retirée → M7_Q20, M7_Q25, M7_Q34 |
| M7_Q11 | Je me vois comme quelqu'un qui accorde facilement sa confiance et sa b | retirée → M7_Q21, M7_Q26, M7_Q30 |
| M7_Q12 | Je me vois comme quelqu'un qui a tendance à relever les défauts des au | retirée → M7_Q21, M7_Q26, M7_Q30 |
| M7_Q13 | Je me vois comme quelqu'un qui va au bout de ce qu'il ou elle entrepre | retirée → M7_Q22, M7_Q27, M7_Q31 |
| M7_Q14 | Je me vois comme quelqu'un qui a tendance à remettre les choses à plus | retirée → M7_Q22, M7_Q27, M7_Q31 |
| M7_Q15 | Je me vois comme quelqu'un qui se laisse facilement gagner par le stre | retirée → M7_Q23, M7_Q28, M7_Q32, M7_Q33 |
| M7_Q16 | Je me vois comme quelqu'un qui reste calme et détendu(e) face aux diff | retirée → M7_Q23, M7_Q28, M7_Q32, M7_Q33 |
| M7_Q17 | Je me vois comme quelqu'un qui a de l'imagination et aime les idées no | retirée → M7_Q24, M7_Q29, M7_Q35 |
| M7_Q18 | Je me vois comme quelqu'un qui s'intéresse peu à l'art, à la culture o | retirée → M7_Q24, M7_Q29, M7_Q35 |
| M8_Q01 | Votre objectif principal sur BOLIGO | modifiée (même sens des clés) |
| M8_Q02 | Dans quel délai envisagez-vous un engagement officiel ? | inchangée |
| M8_Q03 | Votre vision du mariage | modifiée (même sens des clés) |
| M8_Q04 | Ce qui vous fait le plus sentir aimé(e) (2 au plus) | modifiée (même sens des clés) |
| M8_Q05 | Ce qui, pour vous, entraînerait une rupture sans discussion possible | retirée → M8_Q12 |
| M8_Q06 | La communication dans votre couple idéal | inchangée |
| M8_Q08 | Ce que vous ne pourrez jamais accepter dans un couple | retirée → M8_Q12 |
| M8_Q09 | Si vos projets de vie divergent sur un point clé (ville, enfants, reli | inchangée |
| M8_Q10 | Parmi ces signaux, lesquels vous feraient fuir rapidement ? (3 au plus | inchangée |
| M8_Q11 | Si votre partenaire tombait gravement malade ou vivait avec un handica | inchangée |
| M9_Q01 | Dans votre couple idéal, qui prend les décisions importantes ? | inchangée, règle modifiée |
| M9_Q02 | Votre philosophie de l'effort en amour | inchangée |
| M9_Q03 | Tenez-vous le compte de ce que vous donnez et de ce que vous recevez d | modifiée (même sens des clés) |
| M9_Q04 | Quand vous ressentez de la frustration dans une relation | retirée → M2_Q36, M6_Q16 |
| M9_Q06 | Votre rapport au sacrifice dans une relation | inchangée |
| M9_Q07 | Votre rapport à la tendresse et à l'affection physique hors sexualité | inchangée |
| M9_Q08 | Il ne m'est jamais arrivé d'être jaloux(se), même un tout petit peu. | inchangée |
| M9_Q09 | Je n'ai jamais dit le moindre petit mensonge. | retirée → M9_Q22 |
| M9_Q10 | Au début d'une relation, je dis très vite à l'autre qu'il ou elle est  | inchangée |
| M9_Q11 | Quand j'ai un doute, je regarde le téléphone de l'autre ou je lui dema | inchangée |
| M9_Q12 | Quand une relation ne me convient plus, je préfère disparaître plutôt  | inchangée |
| M9_Q13 | Je préfère ne pas définir la relation trop tôt, pour garder mes option | inchangée |
| M9_Q14 | Quand je parle de mes ex, c'est surtout pour dire ce qu'ils ou elles o | inchangée |
| M9_Q15 | Pendant un moment à deux, je consulte mon téléphone. | inchangée |
| M9_Q16 | Quand je n'obtiens pas ce que je veux, je le fais sentir (bouderie, fr | inchangée |
| M9_Q17 | Dans un couple, j'attends que l'autre devine mes envies sans que j'aie | inchangée |
| M9_Q18 | Quand j'ai envie de quelque chose, j'ai du mal à attendre. | inchangée |
| M9_Q19 | Face à un(e) partenaire qui boude quand il ou elle n'obtient pas ce qu | inchangée |
| M10_Q01 | Quand vous entrez dans une pièce, les gens ont tendance à | retirée |
| M10_Q02 | Mes amis proches me décriraient comme quelqu'un de | inchangée |
| M10_Q03 | Quel type d'énergie recherchez-vous chez un(e) partenaire ? | modifiée (même sens des clés) |
| M10_Q04 | Vous faites rire facilement les gens autour de vous ? | inchangée |
| M10_Q06 | L'attirance dans une relation, pour vous, naît principalement de | retirée |
| M10_Q09 | Ce que vous apportez de vraiment unique dans une relation | inchangée |
| M10_Q10 | Si vous deviez résumer en un mot l'expérience que vous voulez offrir à | retirée |
| M10_Q11 | Repensez aux personnes qui vous ont fait chavirer rapidement. Qu'avaie | inchangée |
| M10_Q12 | Votre propre allure, au quotidien | inchangée |
| M10_Q13 | Chez quelqu’un, ce qui provoque le déclic en premier | inchangée |
| M10_Q14 | Ce que les gens remarquent en premier chez vous | inchangée |
| M10_Q15 | Pour qu'une histoire commence, l'attirance physique doit être | inchangée |

## 8. Règles de divergence V7

Gravités : critique (incompatibilité déclarée, hard stop), majeure, modérée
(« à explorer »), mineure (nuance, sans pénalité). Chaque règle a un libellé de
divergence (groupe nominal court) et un sujet d'accord neutre (`topic`).

| Question | Libellé | Gravités | Accords |
|---|---|---|---|
| Tabac (M0_Q11 ou M0_Q08 V6, face à M0_Q09) | Tabac | « Je ne pourrais pas vivre avec » face à un fumeur régulier : critique ; occasionnel : majeure ; « acceptable s'il reste occasionnel » face à un fumeur régulier : modérée | — |
| Alcool (M0_Q13 face à M0_Q12) | Alcool | « Même occasionnel, non » face à un verre lors des fêtes : majeure ; chaque semaine ou presque tous les jours : critique ; « acceptable s'il reste occasionnel » face à presque tous les jours : majeure, chaque semaine : modérée ; V6 « rédhibitoire » face à une consommation régulière : modérée | — |
| Religion (M1_Q16 ; V6 M1_Q05, M1_Q06) | Religion et place de la foi dans le couple | Religions différentes : conversion exigée (M1_Q18 A ou B) face à « chacun garde la sienne » : critique ; face à « je pourrais adopter la sienne » ou à une attente inconnue : majeure ; conversion souhaitée sans condition : modérée ; sinon mineure. Deux Églises chrétiennes : modérée si l'un exige la sienne | Même foi (« Vous partagez la même foi musulmane »), deux « sans religion » |
| M1_Q17 | Pratique religieuse | Chaque jour / rarement : majeure ; deux crans d'écart : modérée | Même pratique |
| Alimentation (M1_Q19 ; V6 M1_Q09) | Habitudes alimentaires | Deux règles strictes différentes : modérée ; stricte / aucune : modérée ; stricte / adaptée : mineure | Même règle (halal, casher, végétarien) seulement |
| M1_Q11 | Polygamie | Inacceptable / envisageable : critique ; « je la respecte chez les autres » / envisageable : majeure ; « j'en parlerai en personne » / inacceptable : modérée | Monogamie exclusive |
| M3_Q04 | Famille recomposée | Parent à part entière / sans autorité : modérée | Repli |
| M3_Q11 + M8_Q02 | Disponibilité et rythme d'engagement | Séparation en cours (ou rupture de moins de six mois encore douloureuse) face à un engagement dans les douze mois : modérée | — |
| M3_Q12 | Disputes dans la famille d'origine | Deux modèles de cris, ou deux modèles de silence : modérée (risque partagé) ; jamais comparée sinon | — |
| M4_Q14 | Épargne et dépenses | Tout mettre de côté / tout dépenser : modérée | Même tempérament |
| M4_Q15 | Partage des tâches de la maison | Rôle de la femme / partage équitable : majeure ; responsabilité principale de la femme / équitable : modérée | Partage équitable |
| M5_Q02 | Loyauté face à un parent | Défendre (A ou E) / « ne le prends pas à cœur » : majeure ; défendre / attendre : modérée | Défendre ; soutenir puis parler au parent |
| M5_Q09 | Amitiés de l'autre sexe | Aucun problème / inacceptable : majeure | Transparence |
| M5_Q10 | Garder sa position face aux proches | Suivre leur avis / décider à deux : modérée ; suivre / s'opposer vivement ou prendre ses distances : majeure | Décider à deux |
| M6_Q04 | Limite face à la violence physique | Limite absolue / ça dépend : **critique** ; inacceptable mais discussion / ça dépend : majeure ; même réponse B : modérée, C ou D : majeure (risque partagé) | Limite absolue des deux côtés seulement |
| M6_Q05 | Mots blessants en dispute | Limite absolue / ça peut arriver : majeure ; même réponse B : modérée, C ou D : majeure (risque partagé) | Limite absolue |
| M6_Q16, M6_Q17 | (cycle de dispute, lu par la psychométrie) | Voir P5 | « Vous savez tous les deux proposer une pause » ; « Vous respectez le besoin de pause de l'autre » |
| M6_Q18 | Fidélité | Rupture immédiate / épreuve surmontable : majeure ; rupture / réparable : modérée | Rupture immédiate ; très grave mais réparable |
| M6_Q19 | Ce que chacun appelle tromper | 1 ou 2 comportements d'écart : mineure ; 3 ou plus : modérée ; « seule une relation physique compte » face à 4 comportements ou plus : majeure | Même définition |
| M7_Q19 | Valeurs de vie | Aucune valeur commune : mineure ; aucune commune et « tradition et sécurité » face à « liberté et découverte » : modérée | Valeurs communes, citées |
| M8_Q04 | Ce qui fait se sentir aimé | Aucune façon commune : mineure | Façons communes |
| M8_Q13 | Engagement dans les moments difficiles | « Pour la vie » / « partir sans trop attendre » : majeure | Pour la vie ; dernier recours |
| M8_Q14 | (modère les autres règles, P9) | — | Accepter les désaccords durables |
| M8_Q15 | Éducation des enfants | Autorité / liberté : majeure | Cadre bienveillant ; dialogue |
| M9_Q25 | Attention au quotidien | Aveu : compte dans l'affinité, jamais cité | Écouter l'autre, même occupé |
| M10_Q16 | Place de l'intimité physique | Essentielle / secondaire : modérée | Aucun accord affiché (intime) |
| M10_Q17 | Intimité avant le mariage | Exclue / possible sans engagement : majeure (critique si l'un l'a déclarée non négociable) ; attendre un engagement / possible : modérée ; « j'en parlerai » / exclue : modérée | Attendre le mariage ; attendre un engagement |
| M10_Q18 | Écart de désir | Deux « c'est à l'autre de s'adapter » : modérée (risque partagé) ; le reste est un conseil au membre seul | — |
| M2_Q22 | Le premier pas après une dispute | Reconnaître sa part / ne pas s'excuser : modérée ; deux attentes, ou deux refus : modérée (risque partagé) | Reconnaître sa part ; faire un pas |
| M2_Q07 | Temps pour se réconcilier | Deux « très longtemps » : majeure si le retrait est confirmé, sinon modérée | Ne pas laisser traîner |
| M6_Q03, M6_Q11, M9_Q01 | Dernier mot, réconciliation, décision | Nouveaux risques partagés : deux besoins de gagner, deux attentes du premier pas, deux personnes qui prennent la direction : modérée | Résoudre plutôt que gagner ; en reparler ; décider ensemble |

Lectures croisées des échelles (`psychometricDivergences`), avec les
identifiants que le Sondeur protège (jamais cités) :
- **M2_Q11** « Proximité et besoin d'espace » : inquiétude ≥ 60 face à un
  inconfort ≥ 60 sans inquiétude ; majeure si l'inquiet n'est pas lui-même
  distant (≤ 40).
- **M6_Q15** « Relance et repli en dispute » : majeure si les deux pôles sont
  confirmés par deux sources, sinon modérée ; « Silence des deux côtés ».
- **M6_Q13** « Ironie ou moquerie en dispute » : à explorer.
- **M8_Q10** signaux d'alerte face aux habitudes : « souvent » ou « très
  souvent » → à explorer ; « très souvent » confirmé par une autre réponse du
  même membre → majeure ;
- **M9_Q19** caprices et patience, **M2_Q19** timidités : inchangés.

## 9. Les 14 membres V6

- **Identifiants conservés** quand le sens ne change pas (89 questions) ;
  **nouveaux identifiants** pour toute question nouvelle ou dont le sens change
  (71) : une réponse V6 n'est jamais réinterprétée sous un autre sens.
- **Passerelle** (`answer-bridge.ts`) : une réponse V6 de même sens est lue
  dans les termes de la V7 (M1_Q10 → M5_Q01 à défaut ; M0_Q08 → M0_Q11 pour
  le tabac ; M6_Q06 → M10_Q16 ; M2_Q08 A et D → M2_Q22). Religion,
  alimentation et non-négociables ont une lecture commune aux deux versions :
  un membre V6 et un membre V7 restent comparables sur ces sujets.
- **Règles V6 conservées et corrigées** (`LEGACY_RULES`) pour M0_Q08, M2_Q03,
  M2_Q08, M5_Q04, M6_Q01, M6_Q07, M6_Q10, M7_Q01 : appliquées seulement quand
  la question V7 qui les remplace manque d'un côté.
- **Échelles V6** : lues tant que la version V7 n'a pas assez de réponses ;
  scénarios M2_Q01 à M2_Q03 toujours lus (30 %) pour l'attachement.
- **Réponses manquantes** : une question sans réponse des deux côtés n'est
  jamais comparée ; un module sans point commun reste affiché sans
  pourcentage ; sous 8 points de comparaison, le score revient à la carte
  mentale. La fiche et le bilan lisent la V7 d'abord, la V6 sinon ; la clarté
  du profil est calculée sur les questions de l'entretien du membre (V6 ou
  V7), pas sur des questions qu'on ne lui a jamais posées.
- **Entretiens terminés** : jamais rouverts. **Entretiens en cours** : les
  questions V7 des modules restants sont posées à la reprise.
- Tests : `src/matching/v7-rules.spec.ts` (« Membres V6 »).

## 10. Données sensibles (RGPD, article 9)

`SENSITIVE_QUESTIONS` (`questions.data.ts`) liste les questions à couvrir par
le consentement explicite, avec un test qui vérifie que toute question parlant
de religion, de foi ou d'intimité y figure.

| Catégorie | V7, direct | V7, indirect (une option peut le révéler) | V6 retirées, réponses encore enregistrées |
|---|---|---|---|
| Convictions religieuses | M1_Q16, M1_Q17, M1_Q18, M1_Q19, M8_Q03 | M1_Q11, M1_Q13, M4_Q07, M7_Q19, M8_Q12 | M1_Q05, M1_Q06 ; M1_Q09, M8_Q05 (indirect) |
| Vie sexuelle | M6_Q08, M6_Q19, M10_Q16, M10_Q17, M10_Q18 | M6_Q18, M8_Q12 | M6_Q06, M6_Q07 ; M6_Q10 (indirect) |
| Violences subies | — (M3_Q08 retirée) | — | M3_Q08 |

Les questions sur l'intime sont des questions d'attitude, sobres : ni
fréquence, ni pratique, ni détail. Aucune question de santé : M2_Q10 mesure
l'ouverture à l'aide, M8_Q11 l'attitude face à la maladie d'un partenaire.

## 11. Formulation

- Vouvoiement ; les affirmations d'échelle sont à la première personne,
  comme en V6.
- Sans jargon (test dédié : « attachement », « anxieux », « schéma »,
  « trauma », « introverti », « silence punitif », « pourvoyeur »… absents) ;
  sans diagnostic.
- Une idée par question : M2_Q19 et M2_Q08 corrigées ; M3_Q04 écrite du point
  de vue du beau-parent, pour qu'un membre sans enfant puisse répondre ;
  M0_Q05 (« enfants à charge » passe dans les options), M1_Q02, M7_Q02
  (« Mesuré » au lieu de « Faible »), M8_Q01, M9_Q03, M4_Q03 reformulées.
- Options exclusives et couvrantes, avec une option nuancée ou « aucune » :
  M2_Q04 G, M6_Q16 E, M6_Q19 G, M8_Q12 K, M3_Q11 E, M3_Q12 E.
- Seuls les types de l'app : choix unique, choix multiple (avec maximum),
  échelles d'accord et de fréquence ; « Autre (précisez) » seulement sur un
  choix multiple, le seul cas que l'app affiche (test dédié).

## 12. Tests

- `src/interview/questions.v7.spec.ts` : 160 questions, table des versions,
  traduction, types, jargon, vouvoiement, données sensibles, dépendances.
- `src/matching/v7-rules.spec.ts` : hard stop et tolérance partagée à la
  violence, P2, P9, P3, P7, P10, tabac, alcool, famille, intimité,
  disponibilité, aveux non cités, membres V6.
- `src/psychometrics/psychometrics.spec.ts` : échelles V7 et items inversés,
  échelles V6, zone intermédiaire, sincérité, acquiescement, cycle de dispute,
  franchise non pénalisée.
- Mis à jour : `divergence.engine.spec.ts` (libellés d'accord fidèles,
  questions non comparées), `dealbreaker-rules.spec.ts`, `v6-rules.spec.ts`,
  `v61-rules.spec.ts`, `compatibility-scale.spec.ts`, `portrait.*.spec.ts`,
  `questions.*.spec.ts`.

## 13. Ce qui reste perfectible

- **Étalonnage** : seuils (40/60, 75) et poids fixés par raisonnement clinique.
  Ils devront être recalés sur la répartition réelle des réponses des membres
  V7 (quelques centaines d'entretiens).
- **Caractère exigeant** (M9_Q16 à M9_Q18) : trois concepts, sans item inversé.
- **Choix exclusifs** : l'app n'empêche pas de cocher « Aucun » avec d'autres
  options ; le moteur le tolère (les autres priment). Une option « exclusive »
  côté app serait plus propre.
- **Autres chantiers** : `src/ai/ai-bio-guard.ts` lit encore M1_Q05 (religion
  V6) : pour un membre V7, il faudrait lire M1_Q16. Le Sondeur
  (`src/journey/`) ne connaît pas encore les nouvelles questions de fond
  (M5_Q10, M8_Q15, M10_Q17…) : elles y passent par les gabarits génériques.
- **Juridique** : faire valider la liste des données sensibles et le texte
  du consentement.
- **Documents Drive** : `scripts/questionnaire-doc.ts` produit encore la
  présentation V6.2 (textes d'introduction V6) ; à adapter avant de générer un
  document V7 pour le Drive.
- **M6_Q08** (refuser l'intimité) : les options B et D se recoupent encore
  (accepter pour faire plaisir, avoir du mal à refuser) ; question conservée
  telle quelle pour garder les réponses V6 comparables.

## 14. V7.1 : corrections de l'audit clinique de la V7

Date : 7 octobre 2026. La V7.1 applique l'audit clinique de la V7 (constats
B1 à B7, M1 à M14, m1 à m9 sauf m8, et sa section 3). Chaque cas vérifié de
l'audit est devenu un test de non-régression dans
`src/matching/v71-rules.spec.ts`. Les changements sont listés dans
`V71_CHANGES` (`questions.data.ts`) ; une question nouvelle ou retirée
l'est aussi dans `V7_CHANGES`. Les sections 1 à 13 décrivent la V7 publiée ;
quand elles diffèrent de cette section, la V7.1 prime.

### 14.1 En bref

| | V7 | V7.1 |
|---|---|---|
| Questions | 160 | **168** (plafond fixé : 168) |
| dont affirmations d'échelle | 60 | 64 |
| Questions nouvelles | — | 19 (dont 7 qui en remplacent une plus faible) |
| Questions retirées (réponses toujours lues) | — | 11 |
| Plus longue suite d'affirmations d'affilée | 21 | 12 |

| Module | V7 | V7.1 |
|---|---|---|
| M0 Critères essentiels | 12 | 15 |
| M1 Identité & culture | 10 | 9 |
| M2 Attachement & émotions | 26 | 25 |
| M3 Vécu & contexte | 7 | 7 |
| M4 Vision économique | 13 | 12 |
| M5 Famille & vie sociale | 7 | 7 |
| M6 Communication & limites | 18 | 18 |
| M7 Trajectoire & personnalité | 21 | 22 |
| M8 Projet de couple | 12 | 15 |
| M9 Effort & réciprocité | 22 | 25 |
| M10 Alchimie & désir | 12 | 13 |

### 14.2 Bloquants (B1 à B7)

- **B1 — non-négociables protégés.** Le projet de vie (enfants, accueil des
  enfants de l'autre, religion et pratique, polygamie, cérémonies, dot,
  aide à la famille, lieu de vie, jeux d'argent : `CORE_DEALBREAKERS`)
  n'est jamais adouci par M8_Q12 ni par M8_Q14. « Tout se discute » seul
  n'est plus une déclaration. Le « problème perpétuel » (Gottman, P9) ne
  joue que sur le caractère et les habitudes (`PERPETUAL_TOPICS`).
  Référence : Gottman et Silver, *The Seven Principles*, sur les problèmes
  insolubles, qui portent sur la personnalité et non sur le projet de vie.
- **B2 — désir d'enfants.** « Oui si les conditions sont réunies » face à
  « non, définitif » est une incompatibilité déclarée ; M0_Q06 s'adresse
  aussi aux parents (« ou d'autres enfants »).
- **B3 — polygamie.** M1_Q20 remplace M1_Q11 : une seule idée (son propre
  couple), sans réponse refuge (« en parler en personne ») ; « exclue »
  face à « envisageable » est une incompatibilité déclarée.
- **B4 — lieu de vie.** « Je reste où je suis » (M0_Q03 D), « la même ville
  qu'aujourd'hui » (M7_Q07 A) et « ma vie est là où je vis » (M7_Q36 C) sont
  relatifs. Le moteur reçoit la ville et le pays de chacun (« Ville, Pays »
  de l'inscription, `homeContext`) : deux refus nets dans deux pays sont une
  incompatibilité déclarée, un seul attachement une divergence majeure ;
  deux villes d'un même pays, majeure ou modérée. Ces réponses identiques ne
  comptent plus comme des accords quand les lieux diffèrent.
- **B5 — aide à la famille et dot posées à tous.** M4_Q16 et M4_Q17
  remplacent M4_Q05 et M4_Q07, qui n'étaient posées qu'à certains
  continents : le couple mixte, celui qui en a le plus besoin, est enfin
  comparé. En anglais, « bride price ».
- **B6 — contrôle coercitif.** Trois attitudes (surveillance M9_Q26,
  isolement M9_Q27, argent M9_Q28) sont lues avec les habitudes (M9_Q11,
  M9_Q24) et les normes (téléphone, jalousie) par `controlRisk`. Deux signes
  ou plus donnent une divergence neutre, « Respect des limites et de la
  liberté de l'autre » (thème communication, majeure ou critique), qui ne
  cite aucune réponse ; un profil acquiesçant ne compte pas ; aucun
  signalement automatique à la modération. Le Sondeur la traite comme une
  limite de sécurité (jamais un compromis). Références : Stark, *Coercive
  Control* (2007) ; Johnson, typologie des violences conjugales.
- **B7 — membre sans consentement.** Un sujet central renseigné d'un seul
  côté (religion, polygamie, intimité avant le mariage) devient « Sujet non
  renseigné par l'un de vous » : majeure si l'autre en a fait un
  non-négociable ou une position nette, modérée sinon, jamais une
  incompatibilité ; la fiche de compatibilité le nomme toujours, le Sondeur
  en reçoit le sujet, sans réponse.

### 14.3 Majeurs (M1 à M14)

- **M1** : réagir à une infidélité (M6_Q18) n'est pas être fidèle ; la
  fidélité déclarée non négociable ne lit plus M6_Q18.
- **M2** : M1_Q18 B dit une condition (« qu'elle adopte les miennes avant
  le mariage »), plus un souhait.
- **M3** : la justification de la violence (M6_Q24, « une gifle peut se
  comprendre ») est mesurée à part de la tolérance (M6_Q04). Deux « ça
  dépend des circonstances », ou un « ça dépend » face à un refus net, sont
  une incompatibilité déclarée.
- **M4** : deux fusions ou deux coupures face aux proches (Bowen) sont un
  risque partagé, plus un accord.
- **M5** : « tout se transmet » des deux côtés, avec deux religions ou deux
  cultures, devient « deux transmissions à concilier ».
- **M6** : M3_Q05 (la place de son ex) est un fait ; ce que l'on accepte des
  liens de l'autre avec son ex (M3_Q13, nouvelle) se compare.
- **M7** : M0_Q14 (accueillir les enfants de l'autre) se compare aux enfants
  que l'autre a déjà ; M0_Q05 devient un fait.
- **M8** : M8_Q17 remplace M8_Q02 (délais exhaustifs, sans recoupement).
- **M9** : M8_Q16 remplace M8_Q03 : civil, religieux et coutumier se
  cumulent (choix multiple, « aucune cérémonie » exclusive).
- **M10** : origine ethnique (M1_Q21, M1_Q02 ; M1_Q01 retirée) et santé
  (M2_Q10, retirée) dans les données sensibles ; catégories multiples.
- **M11** : M10_Q19 remplace M6_Q08 dans le bloc intime ; jamais comparée,
  elle donne au membre seul une observation bienveillante.
- **M12** : une « bonne pratique » partagée n'est affichée que si aucun des
  deux portraits n'est idéalisé ; M5_Q02 et M5_Q08 sans option évidente.
- **M13** : le point neutre (50) ne confirme plus un retrait (seuil 60).
- **M14** : les antidotes des cavaliers ne font plus d'acquiescement.

### 14.4 Mineurs (m1 à m9, sauf m8)

- **m1** : le « rédhibitoire » V6 (tabac, alcool ou substances) n'est plus lu
  comme un refus du tabac.
- **m2** : une affirmation d'accord (M9_Q13) se cite en accord.
- **m3** : bouddhisme (F) et hindouisme (K) séparés ; deux « autre religion »
  dont l'un exige la sienne sont à explorer.
- **m4** : M7_Q22 et M7_Q32 sans biais de revenu ni d'emploi.
- **m5** : jamais plus de douze affirmations d'affilée, une bascule accord /
  fréquence au plus par module ; le désir (M10_Q16 à M10_Q19) avant l'allure.
- **m6** : parité de l'anglais (M2_Q22, M2_Q04 F).
- **m7** : pas d'option « Marié(e) » ; M0_Q04 dit, en français et en anglais,
  que BOLIGO est réservé aux personnes libres de s'engager. Les CGU le
  disent déjà (« célibataires ou libres de tout engagement »).
- **m8** : traité à part (Sondeur).
- **m9** : M2_Q22 C face à D (personne ne fait le premier pas) est un risque.

### 14.5 Questions décisives ajoutées (section 3 de l'audit)

| Question | Sujet | Règle | Pourquoi |
|---|---|---|---|
| M8_Q18 | Religion dans laquelle élever les enfants | « dans ma religion » face à « sans éducation religieuse » ; deux « dans ma religion » avec deux religions | premier conflit des couples interreligieux à l'arrivée d'un enfant |
| M8_Q19 | Vivre ensemble avant le mariage | « exclu » face à « souhaitable » : majeure | norme très différente selon la religion et la culture |
| M8_Q20 | Tape ou fessée pour éduquer | « fait partie d'une bonne éducation » face à « jamais » : majeure | grand point de friction des couples Afrique-Europe ; jamais un accord partagé affiché |
| M7_Q36 | Retour au pays d'origine | projet proche face à « ma vie est ici » : majeure | projet fréquent dans la diaspora, que M7_Q07 ne disait pas |
| M0_Q15, M0_Q16 | Jeux d'argent (soi, chez l'autre) | croisées comme le tabac et l'alcool | risque financier majeur, absent depuis le retrait des « autres substances » |
| M9_Q26 à M9_Q28, M6_Q24 | Attitudes de contrôle, justification de la violence | lues par `controlRisk` et la règle de la gifle | voir B6 et M3 |
| M0_Q14, M3_Q13 | Enfants de l'autre, liens avec un ex | voir M7, M6 | |
| M1_Q20, M4_Q16, M4_Q17, M8_Q16, M8_Q17, M10_Q19, M1_Q21 | remplacent une question plus faible | voir B3, B5, M8, M9, M11, 14.7 | |

### 14.6 Retraits (réponses toujours lues)

Les questions retirées restent dans `RETIRED_QUESTIONS` : les entretiens
déjà enregistrés sont relus, par des passerelles (`LEGACY_UPGRADES`,
`answer-bridge.ts`) quand le sens est le même, ou par leur ancienne règle
(`LEGACY_RULES`, ignorée quand la question qui la remplace est répondue des
deux côtés).

| Retirée | Remplacée par | Pourquoi |
|---|---|---|
| M1_Q01 (continent) | M1_Q21 (région) | trop grossière : une Martiniquaise et une Américaine, un Congolais et un Somalien avaient « la même origine » ; une réponse M1_Q01 reste comparée par continent |
| M1_Q03 (traditions de mariage) | M8_Q16, M4_Q17 | doublon des cérémonies et de la dot |
| M1_Q11 (polygamie) | M1_Q20 | deux idées, réponse refuge (B3) |
| M2_Q10 (aide d'un professionnel) | — | sans usage dans le moteur ; « je l'ai déjà fait » révélait un suivi psychologique (donnée de santé) |
| M3_Q07 | — | sans usage dans le moteur |
| M4_Q05 (envois d'argent) | M4_Q16 | posée selon le continent (B5) |
| M4_Q06 | — | faible pouvoir de discrimination |
| M4_Q07 (dot) | M4_Q17 | posée selon le continent (B5) |
| M6_Q08 (refuser l'intimité) | M10_Q19 | options qui se recoupent, sans usage, loin du bloc intime (M11) |
| M8_Q02 (délai d'engagement) | M8_Q17 | options non exhaustives (M8) |
| M8_Q03 (cérémonies) | M8_Q16 | choix unique alors que les cérémonies se cumulent (M9) |

### 14.7 Relecture culturelle

- **Origine** : M1_Q21, douze régions (Afrique de l'Ouest, centrale, de
  l'Est et océan Indien, australe, Maghreb, Moyen-Orient, Caraïbes, Amérique
  du Nord, Amérique latine, Europe, Asie, Océanie). Deux régions d'un même
  continent sont des cultures proches : « la même culture » exigée y est à
  explorer (modérée), plus un accord. M1_Q02 n'a pas changé de texte : elle
  est relative (« la même que la mienne ») et se lit avec la région. Aucune
  question ne dépendait de M1_Q01 ; le croisement par origine (`originsOf`,
  `shareOrigin`) lit l'une ou l'autre version.
- **Langues** : « Créole — Kreyòl » (M0_Q10 J), proposé d'abord en Haïti,
  pré-écrit à côté du français aux Antilles et en Guyane, reconnu en toutes
  lettres pour le croisement par langue.
- **Études** (M0_Q07) : options sorties du système français (plus de
  CAP-BEP ni de Bac +), mêmes clés.
- **M4_Q13** (prêter ses affaires) passe dans le thème argent.

### 14.8 Données sensibles (V7.1)

| Catégorie | Question entière | Options seulement (sans accord : ni proposées, ni enregistrées) |
|---|---|---|
| Origine ethnique | M1_Q21, M1_Q02 (et M1_Q01, retirée) ; M1_Q13 (aussi religion) | — |
| Convictions religieuses | M1_Q16 à M1_Q20, M8_Q18, M1_Q13 | M7_Q19 B, M8_Q16 B, M8_Q12 B et H |
| Vie sexuelle | M6_Q19, M10_Q16 à M10_Q19, M6_Q18 | M8_Q12 G |
| Santé | M2_Q10 (retirée, réponses V7 encore enregistrées) | — |
| Violences subies | M3_Q08 (V6, retirée) | — |

Le retrait de l'accord efface les réponses entières et les options
sensibles des autres réponses (« B,D » devient « D »). Le texte d'accord de
l'app, les textes du profil et la politique de confidentialité nomment
l'origine.

### 14.9 App

- Options exclusives (`exclusive`) : « aucun » de M2_Q04, M2_Q05, M6_Q02,
  M6_Q19, M8_Q16 et M8_Q12. L'app décoche les autres réponses quand on la
  coche, et inversement ; le serveur refuse un mélange.
- Aide sous la question (`assistance`), traduite (M0_Q04).

### 14.10 Sondeur

Pour chaque nouveau sujet : une tournure (`TOPIC_PHRASES`), ses jours
(`TOPIC_DAYS`) et sa famille (`TOPIC_FAMILIES`) ; les sujets intimes ne
vont qu'au jour 3 ; les sujets de sécurité (M6_Q24, M9_Q24) n'ont aucune
tournure de compromis et rejoignent `SAFETY_QUESTIONS`. Pour que les
gabarits génériques restent sous leurs seuils, quelques entrées de plus ont
été nécessaires : alias de formulations (`DEEP_ALIASES`) et d'accords
(`AGREEMENT_ALIASES`) vers la question remplacée quand le sens est le même,
formulations propres à M0_Q14, M0_Q15, M3_Q13 et M8_Q18. `agreementKey` lit
aussi les questions retirées : les accords des entretiens V6 et V7 sur ces
questions sont enfin servis. Le résumé donné à l'IA nomme un sujet non
renseigné sans réponse.

### 14.11 Validation

`scripts/psychometric-validation.ts` (lecture seule, base locale par défaut)
et le protocole `docs/VALIDATION_CLINIQUE.md` : au moins 300 entretiens
pour la fiabilité des échelles, 50 couples cotés à l'aveugle par deux
cliniciens (kappa ≥ 0,70), recalage des seuils.

### 14.12 Ce qui reste perfectible

- **Étalonnage** : tant que la validation n'a pas eu lieu, seuils et
  gravités restent des choix cliniques raisonnés.
- **Cavaliers** à deux affirmations : fiabilité attendue faible (voir la
  simulation de `docs/VALIDATION_CLINIQUE.md`).
- **M0_Q04 D** (« en transition : séparation ou divorce pas encore
  terminé ») reste proposée alors que l'aide et les CGU réservent BOLIGO aux
  personnes libres de s'engager : décision à prendre (retirer l'option, ou
  bloquer la mise en relation).
- **Ressources d'aide** (3919 en France et équivalents) quand une réponse
  signale un risque : non faites dans cette version.
- **Documents** : `scripts/questionnaire-doc.ts` cite encore M1_Q01.
