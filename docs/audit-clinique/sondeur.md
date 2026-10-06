> État au 6 octobre 2026, avant les corrections de sécurité du même jour (voir `docs/AUDIT_CLINIQUE.md`).

# Audit clinique des questions du Sondeur BOLIGO

*Audit en lecture seule, 6 octobre 2026. Aucun fichier du dépôt n'a été modifié.*

**Périmètre lu en entier** : `src/journey/sondeur.pool.ts` (1 264 lignes), `src/journey/sondeur.generator.ts`, `src/journey/questions.bank.ts`, `src/journey/clinical-lens.ts`, `src/ai/ai.service.ts` (`generateTargetedHarmonyQuestions`, `reviewSondeurQuestions`), `src/journey/sondeur-insights.ts`.

**Lu pour vérifier le contexte** : le moteur de divergences (`src/matching/divergence.engine.ts`), les échelles (`src/psychometrics/psychometrics.ts`), l'assemblage dans `src/journey/journey.service.ts` et `journey-insights.service.ts`, et l'écran mobile qui affiche les questions (`mobile-steve/app/(tabs)/index.tsx`).

**Simulation, hors dépôt** : j'ai écrit un script dans le dossier de travail temporaire. Il génère des entretiens fictifs, puis appelle le vrai `buildDivergenceReport` et le vrai `assembleSondeur`. Trois scénarios de 300 couples chacun :
- réponses tirées au hasard ;
- 60 % de réponses identiques entre les deux membres ;
- 80 % de réponses identiques, le cas le plus proche de couples que l'algorithme a rapprochés.

Les chiffres donnent des ordres de grandeur, pas une mesure de production. Je n'ai fait aucun appel à l'IA : son évaluation porte sur les consignes, pas sur des sorties réelles.

Les numéros de ligne renvoient à `sondeur.pool.ts`, sauf mention contraire. « gen. » désigne `sondeur.generator.ts`.

---

## 1. Verdict global

### 1.1 Gabarits : 4/10

La réserve générique, prise telle qu'elle est écrite, mériterait environ 5,5/10. Ce que les membres reçoivent vraiment mérite environ 3,5/10.

**Ce qui est solide**
- Le français est soigné et les scènes sont concrètes.
- Les cultures sont respectées : dot, envois à la famille, pays d'origine, pratique religieuse, parent qui vient vivre au foyer.
- Le principe est bon : cibler les écarts réels des deux entretiens plutôt que servir un questionnaire commun.
- Une trentaine de gabarits sur 175 sont du niveau d'un clinicien, par exemple :
  - « Quand vous étiez enfant, que se passait-il quand vous n'obteniez pas ce que vous vouliez ? » (980) ;
  - « Comment l'argent était-il vécu dans la famille où vous avez grandi ? » (139) ;
  - « Votre partenaire remet en question une de vos pratiques devant votre famille. Que ressentez-vous ? » (gen. 447) ;
  - « Qu'est-ce qui vous aide à vous ouvrir à quelqu'un de nouveau ? » (1039).
- L'idée du « risque partagé » est cliniquement la plus fine du fichier : même réponse des deux côtés, et c'est elle qui pose problème, comme deux personnes qui se murent dans le silence (664-725).

**Ce qui empêche de parler de questions « ultra cliniques »**
1. **Des positions plutôt que du sens et du fonctionnement.** La grande majorité des gabarits demande ce que l'on déciderait : « Que faites-vous ? », « Quelle est votre position ? », « Dans cinq ans… ». C'est ce que l'entretien à choix multiples a déjà recueilli. Un clinicien demande ce que la position veut dire, d'où elle vient et comment elle se vit de l'intérieur. Certains gabarits reposent même presque mot pour mot une question de l'entretien :
   - l'addition, 1125, reprend l'entretien M4_Q10 ;
   - la voiture prêtée, 1157 et 1167, reprend M4_Q13 ;
   - la maladie, 1243, reprend M8_Q11 ;
   - l'étincelle physique, 1211, reprend M10_Q15.
2. **Une banalité fréquente.** J'estime qu'environ 50 des 118 gabarits génériques (40 %) échouent au « test du premier dîner » : deux personnes se poseraient la question d'elles-mêmes autour d'une table. Exemples : « Combien d'enfants imaginez-vous, et à quel rythme ? » (85), « Ville ou campagne » (547), « Comment imaginez-vous votre vie à deux une fois à la retraite ? » (501), « Dans cinq ans, comment sont gérés vos comptes ? » (gen. 436).
3. **Des techniques cliniques absentes.** On ne trouve aucune question circulaire, aucune échelle, aucune question miracle, et aucune question sur « deux réponses identiques qui cachent des sens différents ». Il n'y a qu'une seule vraie question d'exception (677).
4. **Ce qui est servi n'est pas le meilleur de la réserve.** Les 118 gabarits génériques, les mieux écrits, ne remplissent que 1 à 21 % des créneaux selon le scénario. Les 12 gabarits ciblés, les plus mécaniques, et les 9 gabarits d'accord en remplissent 79 à 99 % (tableau 1.3).
5. **Des sorties cassées ou nuisibles**, mesurées dans la simulation :
   - environ une question servie sur cinq contient des guillemets imbriqués (« sur « même réponse sur « désir d'enfants » » ») ;
   - des scores d'échelle sont cités comme s'ils étaient des « réponses » (« Reproches personnels en dispute : très marqué ») ;
   - des aveux de l'entretien sont révélés à l'autre ;
   - la violence physique est traitée comme une « différence » à rendre « vivable ».
6. **Des options rédigées pour rien.** 175 jeux d'options sont rédigés, plus 63 options écrites par l'IA à chaque parcours, mais l'application ne les affiche jamais (section 2.6). Ils poussent en plus à écrire des questions fermées : 19 à 22 % des questions servies se répondent par oui ou non.

### 1.2 Consigne donnée à l'IA : 6/10

**Ce qui est solide**
- Les écoles sont riches et bien choisies : attachement, couple, émotions, psychodynamique, famille, schémas, approche orientée solutions, valeurs et désir.
- La consigne nomme les bonnes techniques.
- L'étape d'hypothèses reste cachée aux membres.
- La neutralité est explicite.
- Le relecteur appartient à une autre famille de modèles et travaille à température 0.
- Un filtre de jargon est appliqué dans le code.

**Ce qui la limite**
- C'est un catalogue, pas une méthode : rien ne relie le type d'écart à la technique qui convient.
- Elle ignore le contexte réel du Sondeur : deux inconnus, des réponses lues par l'autre, 500 caractères au plus.
- Son exemple de question circulaire, « Comment votre partenaire décrirait-il… ? », est inapplicable : le partenaire ne les connaît pas encore.
- Elle impose des « sujets de fond » banals (« qui paie au premier rendez-vous ») et propose comme modèles de scènes les gabarits les plus plats.
- Elle n'impose aucune limite de longueur et n'interdit ni les questions fermées, ni les présupposés, ni les questions-ultimatums.
- Elle exige des options que personne ne verra.
- Le relecteur perd les champs « méthode » et « cible ».
- Sur un parcours gratuit, les questions de l'IA sont servies sans aucune relecture (section 4.3).

### 1.3 Ce que reçoivent réellement les membres (simulation, 300 couples par scénario, 6 300 questions)

| Scénario | Ciblées sur un écart | Accord | Génériques | Longueur moyenne | Plus de 200 caractères | Guillemets imbriqués | Questions fermées |
|---|---|---|---|---|---|---|---|
| Réponses au hasard | 94 % | 5 % | 1 % | 196 caractères | 53 % | — | — |
| 60 % de réponses identiques | 70 % | 24 % | 6 % | 184 caractères | 40 % | 16,8 % | 22 % |
| 80 % de réponses identiques | 51 % | 28 % | 21 % | 167 caractères | 30 % | 21,4 % | 19 % |

Autres constats de la simulation :
- Environ un créneau ciblé sur quatre (26 à 28 %) reprend un sujet déjà posé un autre jour. Par exemple, « désir d'enfants » revient au jour 1 et au jour 3, parce que gen. 792 choisit l'écart de façon cyclique.
- La violence physique apparaît comme un écart à « rendre vivable » ou à « rapprocher » dans 6 à 14 parcours sur 300.
- Un sujet que les deux membres ont choisi de garder pour une conversation en personne (« Je préfère en parler en personne », sur la polygamie) est relancé par la question « Qu'est-ce que cette position protège en vous ? ».

**Note importante** : un audit interne précédent (`docs/AUDIT_INTELLIGENCE_BOLIGO.md`, ligne 24) signale que l'IA était hors service en production au début d'octobre. La qualité que les membres perçoivent, c'est donc d'abord celle des gabarits.

---

## 2. Analyse des gabarits

### 2.1 Inventaire

| Réserve | Fichier | Formulations | Rôle |
|---|---|---|---|
| `GENERIC`, `GENERIC_B` | gen. 180-590 | 42 | Questions du thème, sans écart |
| `EXTRA_GENERIC` | 29-590 | 63 | Idem |
| `DEEP_GENERIC` | 1119-1264 | 13 | Idem, sujets de fond |
| `TARGETED`, `TARGETED_B` | gen. 104-174 | 6 | Écart réel, citation des deux réponses |
| `EXTRA_TARGETED` | 595-656 | 6 | Idem |
| `TOPIC_DEEP` | 819-1113 | 30 (10 sujets × 3 jours) | Écart sur un sujet précis, prioritaire |
| `SHARED_RISK` | 664-725 | 6 | Même réponse à risque |
| `CONVERGENT` | 727-811 | 9 | Accord réel |
| **Total** | | **175** | |

### 2.2 Type « divergence » : écart réel entre les deux entretiens

**Cliniquement fort**
- L'ancrage dans les données réelles, et la priorité donnée aux scènes propres à un sujet (`TOPIC_DEEP`).
- `TARGETED[2]` cherche le besoin derrière la position : « D'où vient votre position, et qu'est-ce qu'elle protège en vous ? » (gen. 156).
- `TARGETED_B[2]` part d'une bonne intention, être compris plutôt que gagner : « Qu'est-ce que vous aimeriez que l'autre comprenne de votre réponse… ? » (gen. 120).
- Les questions du jour 2 de `TOPIC_DEEP` qui ne citent pas les réponses sont les meilleures du fichier :
  - 980 : « Quand vous étiez enfant, que se passait-il quand vous n'obteniez pas ce que vous vouliez ? » (origine) ;
  - 1008 : « Qu'est-ce qui se cache, chez vous, derrière une bouderie ? » (besoin caché) ;
  - 1039 : « Qu'est-ce qui vous aide à vous ouvrir à quelqu'un de nouveau ? », bien adaptée à deux inconnus.

**Défauts**
- **Mécanique.** Le schéma « « libellé » : « réponse A » / « réponse B ». Question ? » se retrouve dans 38 à 56 % des questions servies. Exemple réel produit par la simulation, 204 caractères :
  > Sur « comportement en dispute », l'un de vous a répondu « Prendre du recul et revenir calme », l'autre « Me murer dans le silence — parfois des jours ». Cet écart pourrait-il mettre fin à votre relation ?
- **La réponse de l'autre est révélée.** Chacun connaît sa propre réponse et déduit donc celle de l'autre. Or le code masque volontairement la réponse du partenaire au Sondeur avant qu'on ait répondu soi-même (`journey.service.ts`, 293-295). La question annule cette précaution et pousse chacun à répondre en fonction de l'autre.
- **Des aveux sont exposés.** Pour les signaux d'alerte, le texte cité est un aveu de l'entretien (`psychometrics.ts` 507 : « Il m'arrive très souvent que… »). La formule « pour l'un de vous c'est un signal pour fuir, pour l'autre une habitude » (942) met l'auteur de l'aveu en accusation devant l'autre. Exemple simulé, 350 caractères :
  > « Signal d'alerte : déclarations d'amour très rapides » : pour l'un de vous c'est un signal pour fuir, pour l'autre une habitude (« Ce qui me ferait fuir : … » / « Il m'arrive très souvent que je dis très vite à l'autre qu'il ou elle est la personne de ma vie »).
- **Des scores sont présentés comme des réponses.** Les écarts tirés des échelles (`psychometrics.ts` 344-346) injectent « Se fermer en dispute : très marqué » dans « l'un de vous a répondu… ». C'est faux, puisque personne n'a écrit cela. C'est aussi une étiquette, et le score de l'un est exposé à l'autre. Cela contredit la consigne : « aucune étiquette, aucun diagnostic ». Exemple simulé :
  > « Reproches et repli en dispute » : l'un de vous a répondu « Se fermer en dispute : très marqué », l'autre « Reproches personnels en dispute : très marqué ». D'où vient votre position… ?
- **Des affirmations présentées comme des faits.** « Vous avez tous les deux tendance à faire sentir une frustration. » (1000) est une interprétation tirée d'une échelle et énoncée comme une vérité.
- **Questions-ultimatums et questions fermées**, avec un fort biais de désirabilité puisque l'autre lira la réponse :
  - « Est-ce une ligne rouge pour vous ? » (gen. 146) ;
  - « Cet écart pourrait-il mettre fin à votre relation ? » (608) ;
  - « Si rien ne bougeait, pourriez-vous construire quand même ? » (gen. 110) ;
  - « Est-ce que cela change vos sentiments ? » (884).

  Ce sont trois des douze gabarits ciblés, ceux qui sont le plus servis.
- **Un compromis présumé, y compris sur ce qui ne se négocie pas** :
  - « quel premier pas… pour rapprocher vos positions » (gen. 130) ;
  - « comment aurez-vous réglé votre différence » (gen. 166) ;
  - « Qu'est-ce qui la rendrait vivable au quotidien ? » (639) ;
  - « est bien vécue » (648).

  Appliqués à « Limite face à la violence physique », « Désir d'enfants : Oui, absolument / Non, c'est définitif » ou « Polygamie », ces gabarits sont au mieux absurdes, au pire dangereux. Il n'existe aucune liste de sujets exclus des gabarits de compromis.
- **Une orientation vers l'exigence envers l'autre** : « Qu'est-ce que l'autre devrait accepter pour que ce point ne vous sépare pas ? » (599). Le regard se tourne vers ce qu'on exige de l'autre, pas vers ce que l'on vit soi-même.
- **Une question double** : « D'où vient votre position, et qu'est-ce qu'elle protège en vous ? » (gen. 156).
- **Des citations en appendice, sans rôle** : la question est posée, puis vient une phrase « Vos réponses diffèrent (…). » qui ne sert à rien (864, 893, 922).
- **Une question qui ne s'applique qu'à l'un des deux** : « D'où vient votre sensibilité sur ce point… ? » (951). Elle est posée aux deux, mais seul celui qui a le signal d'alerte est concerné.
- **Des doublons** : jour 3 de M9_Q19 et jour 3 de M9_Q16 sont identiques (989 = 1017).

### 2.3 Type « risque partagé » (`SHARED_RISK`, 664-725)

**Cliniquement fort.** C'est le seul endroit où l'on trouve, ensemble :
- la réparation : « qui fera le premier pas ? » (668) ;
- l'exception : « Qu'est-ce qui vous a déjà aidé à sortir de cette situation dans le passé ? » (677) ;
- le signal de réparation convenu à l'avance : « Quel signal discret pourriez-vous convenir… ? » (688) ;
- l'émotion sous la réaction : « qu'est-ce que vous ressentez à l'intérieur ? » (697).

**Défauts**
- Ces questions supposent un passé commun que les membres n'ont pas : « Le jour où cela arrivera entre vous » (668).
- Elles affirment au lieu de demander : « vous fonctionnez de la même façon » (677).
- Elles citent une option de l'entretien qui contient elle-même un jugement. La simulation produit : « quand vous réagissez tous les deux ainsi (« Couper le contact temporairement (silence punitif) »)… »
- Les options sont des clichés (« Ne jamais se coucher fâchés », 719), mais elles sont invisibles de toute façon.

### 2.4 Type « accord » (`CONVERGENT`, 727-811)

**Cliniquement fort**
- L'idée même d'explorer un accord.
- « D'où vient-elle, chez vous ? » (760), une question d'origine.
- « Qu'est-ce que cette position protège en vous ? » (769), le besoin caché.
- « Qu'est-ce qui pourrait, malgré tout, vous faire changer d'avis ? » (731), qui teste la rigidité d'une position.

**Défauts**
- **Syntaxe cassée.** Le libellé d'accord est soit une phrase entière (« Vous ne laissez ni l'un ni l'autre traîner une dispute »), soit le libellé de secours « Même réponse sur « x » » (`divergence.engine.ts` 1103). Il est inséré tel quel dans « sur « … » ». La simulation produit, dans 17 à 21 % des questions servies :
  > Vous avez tous deux répondu « Oui, si les conditions sont réunies » sur « même réponse sur « désir d'enfants » ». Qu'est-ce qui pourrait, malgré tout, vous faire changer d'avis ?
- **La technique la plus utile manque.** Aucun gabarit ne vérifie que la réponse commune veut dire la même chose pour les deux (« pratiquant(e) », « une fois par mois », « fidélité absolue »). C'est pourtant ce que la consigne de l'IA cite elle-même (« deux réponses identiques qui cachent des sens différents », `clinical-lens.ts` 27).
- **Des questions absurdes selon le sujet.** « … vous inspire-t-il un premier projet à deux ? » (794) a été servi dans la simulation sur la réponse commune « Je suis peu à l'aise avec le contact physique non sexuel ».
- **Une intrusion.** Une réponse qui diffère la discussion (« Je préfère en parler en personne ») est traitée comme une position, puis creusée.
- **Une répétition.** Avec une seule convergence dans un thème, la même revient les trois jours (gen. 830-832). Dans la simulation, « tendresse et affection » a été posée aux jours 1, 2 et 3.
- **Des questions banales ou fermées** : « Dans cinq ans, comment ferez-vous vivre votre accord… ? » (803), « Avez-vous toujours pensé ainsi ? » (774).

### 2.5 Gabarits génériques, thème par thème

#### Famille
- **Fort**
  - 59 : « Qui, dans votre entourage, vous a le plus appris ce qu'est un couple solide ? », un modèle de couple venu de la famille.
  - gen. 398 : « Quel souvenir de votre propre famille voulez-vous absolument reproduire, ou éviter… ? », ce que l'on répète ou ce que l'on veut fuir.
  - 41 : deux familles qui ne s'entendent pas, un conflit de loyauté.
  - gen. 389 : un proche qui s'invite plusieurs semaines, la question des limites du foyer.
  - 67 : prendre soin de parents vieillissants, une obligation qui dépend beaucoup de la culture.
- **Défauts**
  - Questions banales : 85 « Combien d'enfants imaginez-vous, et à quel rythme ? », qui est aussi double ; 93, fréquence des visites ; 75, traditions.
  - Question triple : gen. 201 « enfants, parents, rythme de vie ».
  - Question normative et abstraite : gen. 192 « Quelle place votre famille doit-elle avoir… ».
  - Ultimatum déguisé : gen. 183 « Votre famille désapprouve ouvertement votre partenaire. Que faites-vous ? ». Tout le monde répondra « je défends mon couple ».
  - Quasi-doublon : 1243 reprend l'entretien M8_Q11 et `TOPIC_DEEP` 1059.
- **Manque** : le rôle tenu dans la famille d'origine, la façon dont les parents se réconciliaient, comment l'affection et la colère s'exprimaient à la maison, et quelle personne de la famille aura l'avis le plus fort sur le partenaire.

#### Argent
- **Fort**
  - 139 : « Comment l'argent était-il vécu dans la famille où vous avez grandi ? », l'histoire familiale de l'argent. C'est la meilleure question du thème.
  - gen. 418 : de l'argent envoyé à sa famille sans en parler, entre loyauté et transparence.
  - gen. 427 : un cadeau cher ou une épargne commune comme preuve d'engagement. Le sens donné à l'argent est bien vu, mais le choix entre deux réponses est imposé.
  - 121 : se porter garant pour un proche.
- **Défauts**
  - Questions banales : 155, 165, 181, gen. 230, gen. 436, et 1125 (l'addition, reprise de l'entretien).
  - Questions normatives : 155 « Qui doit… », 129 « mensonge impardonnable », qui double gen. 212.
  - Ultimatum soumis au regard de l'autre : 1145 « qu'est-ce qui vous retiendrait dans la relation ? ».
- **Manque** : l'émotion attachée à l'argent (ce qu'il apaise, ce qu'il fait honte), le sentiment d'être redevable quand l'autre paie, le pouvoir quand les revenus sont inégaux.

#### Religion et spiritualité
- **Fort**
  - gen. 447 : une pratique remise en question devant la famille, avec une question tournée vers l'émotion (« Que ressentez-vous ? »).
  - gen. 456 : si sa foi évoluait, en parlerait-on ? Le changement dans le temps et le secret sont bien vus, mais la question est fermée.
  - 253 : des enfants qui choisiraient une autre voie.
  - 227 : sur quoi l'on s'appuie dans les moments difficiles.
  - 209 : une pratique qui change le quotidien.
- **Défauts**
  - Questions fermées : 193 « Est-ce un obstacle pour vous ? », 201 « doit-il ou doit-elle partager… ».
  - Options écrites dans la question : 219 « de votre éducation, d'un cheminement personnel, d'une rencontre ? ».
  - Questions abstraites ou banales : 235, 245, gen. 250, gen. 259.
- **Manque** : le doute (y en a-t-il eu, et à qui l'a-t-on confié ?), et le sens concret de « croyant », de « pratiquant » ou de « même foi ». Deux « pratiquants » peuvent vivre des semaines très différentes.

#### Intimité et sexualité
- **Fort**
  - 273 : où commence l'infidélité (des messages intimes sans jamais se voir), ce qui revient à définir un même mot.
  - 307 : ce que l'on a appris de ses relations passées.
  - 289 : un partenaire qui refuse de parler de sexualité.
  - gen. 485 : ce qui fait se sentir désiré(e).
  - 333 : qui parle en premier quand la routine s'installe.
  - 315 : ce que veut dire la pudeur.
- **Défauts**
  - Questions abstraites : gen. 270 « limite absolue », gen. 279.
  - Questions banales : 299 (comment on exprime son affection, une notion de magazine), 325, 341, gen. 494.
  - Question fermée : 1211.
  - Doublon : 1231 et 1105 ont des options identiques. On y parle d'« allure », c'est-à-dire de l'apparence, alors que la consigne exclut le corps.
- **Manque** : comment dire non et comment entendre un non sans le vivre comme un rejet, l'équilibre entre sécurité et désir, et l'attente jamais formulée.

#### Communication et émotions : le thème le plus solide
- **Fort**
  - gen. 308 : « Quand vous êtes blessé(e), de quoi avez-vous besoin en premier ? », l'émotion et le besoin.
  - gen. 505 : un silence de deux jours, ce qui touche au cycle « l'un insiste, l'autre se retire ».
  - 379 : comment on réglait les conflits dans la famille.
  - 395 : ce qui donne le sentiment d'être écouté(e).
  - 1189 : comment on montre qu'on n'a pas obtenu ce qu'on voulait, un regard sur soi.
  - gen. 299 : ce qui ferait quitter la pièce.
  - 361 : être moqué(e) devant des amis.
- **Défauts**
  - Question fermée et banale : 387.
  - Questions banales : gen. 317, 405.
  - Gen. 514 « dans votre couple » présuppose un couple qui n'existe pas encore.
  - Gen. 523, seule question sur les problèmes perpétuels, cherche une solution. Or un problème perpétuel se gère, il ne se résout pas.
  - 1179 impose un choix dans une liste et traite « dire « je t'aime » trop vite » comme un signal de fuite. C'est normatif.
- **Manque** : la réparation (le geste qui fait baisser les armes), le cycle vu des deux côtés, la façon de reconnaître ses torts.

#### Projet de vie
- **Fort**
  - 459 : « Qu'est-ce qui vous donne envie de vous engager maintenant, à ce moment de votre vie ? », la motivation et le moment.
  - gen. 337 : un engagement sérieux se prouve par quoi ? C'est le sens d'un mot.
  - 1255 : un partenaire qui répond « on verra », ce qui mesure la tolérance au flou.
  - gen. 346 : le dimanche idéal, une scène qui révèle le rythme de vie.
- **Défauts**
  - Questions banales : 485, 493, 501, gen. 552, 467.
  - Ultimatum banal : 433 « Si votre partenaire ne voulait finalement pas d'enfants, que feriez-vous ? ».
  - Choix imposé : gen. 543 « la sécurité, l'aventure ou la transmission ? ».
  - Gen. 328 « cette relation » présuppose une relation déjà là.
- **Manque** : l'hésitation (ce qui, en soi, hésite encore), le rêve ou la peur derrière un projet, ce à quoi l'on renoncerait.

#### Lieu de vie et mobilité : le thème le plus faible
- **Fort**
  - 539 : « Où vous sentez-vous vraiment chez vous ? », l'appartenance. C'est une question forte pour des membres de la diaspora.
  - 555 : un déménagement déjà vécu et ce qu'on en a retenu. Une expérience passée est bien sollicitée, mais la question est double.
  - 529 : l'emploi rêvé à 500 km.
  - 581 : partager ses vacances entre deux pays.
- **Défauts**
  - Questions logistiques et banales : 547 « Ville ou campagne », 565, 573, gen. 581, gen. 375 (qui est aussi double).
  - Questions fermées : 513, 521, gen. 563.
  - 1157 (la voiture) n'a rien à faire dans ce thème et double 913 ainsi que l'entretien. 1167 double 931.
- **Manque** : le besoin d'un espace à soi dans un logement partagé, l'attachement à un lieu et le deuil d'un départ, la dette de sacrifice (celui qui a suivi l'autre et qui le reprochera un jour).

#### Ancienne banque (`questions.bank.ts`)

Elle n'est plus servie : `generateFallbackQuestions`, `buildBankPayloads` et `buildAiPayloads` n'ont plus d'appelant. Il n'en reste qu'une recherche d'emoji et d'options (`journey.service.ts` 290). C'est un quiz de type magazine :
- un anglicisme, « dealbreaker » (189) ;
- un cas masculin seulement, « Votre partenaire est très jaloux » (75) ;
- la violence verbale traitée comme négociable : « Je donne une seconde chance mais avec un ultimatum » (91).

**À archiver** : elle ne doit pas redevenir une solution de secours.

### 2.6 Options inutiles alors que la réponse est libre

L'écran du Sondeur (`mobile-steve/app/(tabs)/index.tsx`, 595-604) n'affiche qu'un champ libre de 500 caractères. Les options ne sont jamais montrées. Pourtant :
- 127 jeux d'options sont rédigés dans la réserve et 48 dans le générateur ;
- l'IA doit en écrire 63 par parcours (« 3 options concrètes et distinctes + Autre », `ai.service.ts` 465) ;
- le relecteur refuse une question dont les options « manquent, orientent ou se recoupent » (`clinical-lens.ts` 45, règle 8). Il peut donc refuser une bonne question à cause d'un contenu invisible.

**Effets cliniques**
1. **La forme des questions se dégrade.** On écrit des questions fermées ou à choix (« Est-ce un obstacle ? », « lequel ? »), qui appellent un mot en réponse libre.
2. **Les choix glissés dans la question orientent vraiment la réponse.** C'est le cas de 219, gen. 543, gen. 572, 1179, gen. 427 et 547, parce que ces choix, eux, sont lus.
3. **La seule nuance clinique se trouve parfois dans les options, donc elle est perdue.** C'est le cas de 1010-1012 (« Le sentiment de ne pas compter », « L'envie qu'on devine ce que je veux ») ou de 309-311.

**Recommandation** : supprimer les options du contrat, ou les transformer en **grille de lecture cachée** transmise à l'IA qui rédige la lecture du jour. Si une aide est montrée au membre, que ce soit une seule relance (« Pensez à une scène précise. »).

### 2.7 Répétitions et quasi-doublons

| Gabarit | Double de | Nature |
|---|---|---|
| 1125 (addition) | 826, et l'entretien M4_Q10 | Reprise de l'entretien |
| 1157 (voiture) | 913, et l'entretien M4_Q13 | Idem, et mal rangée dans « lieu » |
| 1167 (ce qui reste à chacun) | 931 | Quasi identique |
| 1243 (maladie) | 1059, et l'entretien M8_Q11 | Idem |
| 1231 (attirance dans dix ans) | 1105 | Mêmes options |
| 989 | 1017 | Texte identique |
| 129 (mensonge sur l'argent) | gen. 212, et l'ancienne banque `lr_02` | Même idée |
| « Dans cinq ans / dix ans / un an / six mois » | 23 gabarits (17 commencent ainsi) | Tic d'écriture, projection répétée |
| « Votre partenaire… Que faites-vous ? / Votre réaction ? / Votre position ? » | Une vingtaine | Même moule |

---

## 3. Techniques cliniques : présentes et absentes

| Technique | Présence dans les gabarits | Où | Verdict |
|---|---|---|---|
| Question circulaire | **Aucune** | — | Absente. L'exemple de la consigne de l'IA (« Comment votre partenaire décrirait-il… ? ») est inapplicable : les membres ne se connaissent pas. Il faut passer par un proche, un ami ou un ex. |
| Origine, famille d'origine | **Environ 12** | 59, 67, 139, 219, 379, 475, 760, 835, 922, 980, gen. 156, gen. 398 | C'est la technique la plus présente, et la mieux maîtrisée (980, 139). Elle est souvent réduite à « éducation, expérience ou convictions ». Il manque les rôles dans la famille et la façon dont les parents se réconciliaient. |
| Échelle | **Aucune** | — | Absente. En réponse libre, elle n'a d'intérêt qu'avec sa relance : « Pourquoi pas un point de moins ? » |
| Exception | **1, plus 1 partielle** | 677 ; 555 | Quasi absente. Avec des inconnus, elle doit porter sur la famille ou les relations passées. |
| Question miracle | **Aucune** | — | Absente. Elle convient bien au jour 3. |
| Besoin caché derrière la position | **Environ 7** | gen. 120, gen. 156, gen. 308, gen. 485, 395, 769, 1008 | Présente mais sous-exploitée : les gabarits d'écart cherchent surtout le compromis. |
| Cycle « l'un insiste, l'autre se retire » | **Implicite, 3** | gen. 505, 387, 1189 | Les données existent (échelles M6_Q15 et M2_Q11), mais elles sont servies par des gabarits génériques qui citent des scores. Aucune question n'aide chacun à voir sa réaction comme une réponse à celle de l'autre. |
| Réparation après conflit | **Environ 4** | 668, 688, 717, gen. 505 | Cantonnée au « risque partagé ». Pas de question générique comme « quel geste vous fait baisser les armes ? ». |
| Problèmes perpétuels | **1** | gen. 523 | Mal orientée, puisqu'elle cherche une solution. |
| Deux réponses identiques qui cachent des sens différents | **Aucune** | — | Absente des gabarits, alors que la consigne de l'IA la cite. C'est le premier manque à combler (section 6, proposition 4). |
| *Présentes en plus* | | | |
| Scène concrète ou dilemme | Nombreuses | 33, 113, 121, 529, gen. 389, gen. 418 | Bonne base. |
| Projection dans le futur | 23 | « Dans cinq ans… » | Utilisée à l'excès. |
| Phrase à compléter | 2 | 147, 467 | Banales. |
| Expérience passée | 4 | 307, 555, 1067, 1096 | Bonnes mais fermées (1067, 1096). |

**Le point de fond** : en couple déjà formé, ces techniques s'appuient sur l'histoire commune. Ici, les deux membres sont des inconnus qui vont lire la réponse de l'autre. Chaque technique doit donc être transposée vers trois sources :
- la famille d'origine ;
- les proches, qui jouent le rôle de témoins ;
- les relations passées, en demandant ce qu'on en a appris, jamais le récit.

C'est la transposition qui manque, à la fois dans les gabarits et dans la consigne.

---

## 4. La consigne clinique de l'IA (`clinical-lens.ts` et prompts de `ai.service.ts`)

### 4.1 Est-elle assez précise pour produire des questions de clinicien ?

Pas encore. Elle dit **qui** convoquer (huit écoles) et **quoi** chercher, mais pas **comment choisir**.

1. **Aucune règle ne relie le type de signal à la technique adaptée.** Face à un écart non négociable, une IA à température 0,7 (`ai.service.ts` 489) produira par défaut un compromis ou un ultimatum, comme les gabarits.
2. **Aucune adaptation au contexte** : des inconnus, des réponses lues par l'autre, 500 caractères, trois jours. L'exemple « Comment votre partenaire décrirait-il… ? » (`clinical-lens.ts` 20) invite à faire inventer une réponse. « La dernière fois que… » (ligne 22) suppose un passé commun.
3. **Les « sujets de fond à couvrir »** (`ai.service.ts` 467-473) et les modèles de scène (« le serveur pose l'addition », « il ou elle prend votre voiture », ligne 465) orientent l'IA vers les questions les plus banales de la réserve. C'est en contradiction directe avec « faire découvrir ce qu'ils ne se seraient pas demandé ».
4. **Aucun exemple contrasté** (mauvaise question, puis bonne question). C'est pourtant le levier le plus efficace pour un modèle de langage.
5. **Une contrainte de forme manquante.** On demande « une seule idée, des mots simples », mais sans limite de longueur, sans interdire les questions fermées et sans interdire de citer les réponses entre guillemets.
6. **21 questions d'un seul tir**, avec analyse et options, dans 8 000 jetons : la qualité se dilue. Demander deux candidates par créneau et laisser le relecteur choisir serait plus sûr (coût moyen).
7. **Les champs « méthode » et « cible » sont demandés puis jetés** par `normalizeAiQuestions` (`harmony-question.types.ts`). On perd à la fois la traçabilité et la possibilité, pour le relecteur, de vérifier que la question atteint sa cible.

### 4.2 Risques

| Risque | Origine dans la consigne | Exemple de dérive probable |
|---|---|---|
| **Intrusion** | Seuls le corps, la taille, la couleur de peau et la santé sont exclus (`clinical-lens.ts` 33). Rien sur les événements douloureux, les secrets de famille, l'histoire sexuelle ou les violences subies. Or la réponse sera lue par un inconnu. | « Qu'avez-vous vécu dans votre enfance qui vous fait craindre l'abandon ? » |
| **Jargon** | Le filtre `JARGON_WORDS` (51-71) est court. Il manque notamment : attachement, dépendance affective, codépendan-, manipul-, schéma, blessure, abandon, insécur-, inconscient, projection, transfert, loyauté invisible, triangul-, enfant intérieur, « red flag », « love bombing », « gaslighting », emprise, refoulé. | « Votre peur de l'abandon… » passe le filtre. |
| **Fausse interprétation** | L'étape 1 demande des « hypothèses cliniques » à partir d'environ 18 lignes de cases cochées (`describeReportForAi`), sans âge, sans culture, sans histoire. | Hypothèse « héritage familial de méfiance » tirée d'une seule réponse sur les comptes séparés. |
| **Invention, présupposé** | Aucune règle n'interdit de présupposer un fait de vie. | « Qu'avez-vous appris de la séparation de vos parents ? » |
| **Longueur** | Pas de plafond. Citer deux positions ajoute 60 à 120 caractères. | Des questions de 250 à 350 caractères, comme les gabarits. |
| **Sécurité** | Rien n'interdit de traiter la violence ou le contrôle comme une différence à aménager. | « Comment rendre vivable votre différence sur la violence ? » |
| **Désirabilité, ultimatum** | Aucune règle. | « Partiriez-vous si… ? » : réponse de façade, puisque l'autre la lira. |
| **Questions sans relecture** | Le relecteur est réservé aux parcours payés (`paidOnly: true`, `ai.service.ts` 546). Sur un parcours gratuit, il échoue, `review` vaut `null`, et `aiQuestions = inGrid` (`journey.service.ts` 474-477) : les questions **non relues** du modèle économique sont servies dans tout créneau sans écart. | Le commentaire « l'appelant reste alors prudent » (`ai.service.ts` 506) ne correspond pas au comportement réel. |

### 4.3 Le relecteur est-il assez exigeant ?

**Points forts**
- Une autre famille de modèles et une température 0.
- « Au moindre doute, tu refuses. »
- Les questions sont traitées comme des données à relire, jamais comme des consignes.
- Les questions déjà posées lui sont fournies.

**Insuffisances**
1. **Il ne sait que refuser, sur des critères surtout négatifs.** Le seul critère de profondeur, « banale », est subjectif. Il ne vérifie pas qu'une technique est reconnaissable.
2. **Il ne voit ni la « méthode » ni la « cible »**, donc il ne peut pas juger si la question atteint son but.
3. **Il partage la consigne et ses angles morts** : il acceptera la question circulaire sur le partenaire.
4. **Il lui manque des critères** :
   - question fermée ;
   - présupposé d'un passé commun ou d'un fait non établi ;
   - ultimatum soumis au regard de l'autre ;
   - demande du récit d'un événement douloureux ;
   - violence ou contrôle traités comme une différence ;
   - longueur ;
   - citation des réponses.
5. **La règle 8 sur les options produit des refus pour un contenu invisible.**
6. **Le seuil est bas** : il suffit que la relecture garde la moitié des questions pour que l'IA passe devant les gabarits (`journey.service.ts` 477).
7. **Il ne relit jamais les gabarits**, qui contiennent pourtant les défauts les plus graves relevés ici.
8. **La question de suivi** (`journey-insights.service.ts` 202-213) est relue sans `avoidModel` : le relecteur peut être de la même famille que le rédacteur.

### 4.4 Propositions de réécriture, en extraits

**a) Bloc à placer en tête de `CLINICAL_LENS`**

```
CADRE DU SONDEUR (prioritaire sur tout le reste) :
- Les deux membres ne se sont encore jamais parlé : ils n'ont aucun passé commun. Ne parle jamais d'un souvenir à deux. Pour une exception ou une question circulaire, appuie-toi sur leur famille, leurs proches ou leurs relations passées (ce qu'ils en ont appris, jamais le récit).
- Chaque réponse sera lue par l'autre. Évite toute question dont la réponse sincère serait gênante à montrer (« partiriez-vous ? », « cela change-t-il vos sentiments ? ») : demande ce que la situation réveille, protège ou rappelle.
- Réponse libre de 500 caractères : une question ouverte, à laquelle on ne peut pas répondre par oui ou non.
- La profondeur monte avec les jours : jour 1, ce qui protège chacun ; jour 2, d'où cela vient ; jour 3, comment cela se vivra à deux.
- Le Sondeur ne repose pas l'entretien : il cherche le sens et le fonctionnement derrière une réponse déjà donnée.
```

**b) Remplacer « TECHNIQUES DE QUESTIONNEMENT » (lignes 19-25)**

```
TECHNIQUES (adaptées à deux personnes qui ne se connaissent pas encore) :
- circulaire : « Comment un proche qui vous connaît bien décrirait-il votre façon de… ? »
- origine : « Dans votre famille, comment savait-on que… ? »
- échelle avec relance : « De 0 à 10, … ? Pourquoi pas un point de moins ? »
- exception : « Pensez à une fois, en famille ou dans une relation passée, où… s'est bien passé. Qu'est-ce qui était différent ? »
- miracle : « Imaginez qu'un matin, … ne vous pèse plus. Quel serait le premier petit signe ? »
- besoin caché : « Qu'est-ce que votre façon de… vous permet de protéger ? »
- même mot, autre sens : « Que veut dire, très concrètement, « … » pour vous ? »
- scène ordinaire : un moment banal de la vie à deux, jamais une catastrophe.
```

**c) Ajouter une règle de choix selon le signal**

```
CHOIX DE LA TECHNIQUE SELON LE SIGNAL :
- Écart sur un point non négociable (enfants, foi exigée, polygamie, pays de vie) : jamais de compromis ; demande d'où vient la position ou ce qu'elle protège.
- Écart de rythme ou de style (dispute, temps ensemble, parole) : c'est un désaccord durable ; demande comment chacun le vit de l'intérieur, ou ce qui l'apaise.
- Même réponse des deux côtés : vérifie que les mots veulent dire la même chose ; demande une scène ordinaire où cette réponse se voit.
- Même réponse qui pose un risque (deux silences, deux réconciliations lentes) : exception tirée du passé, ou signal de réparation.
- L'un veut parler tout de suite, l'autre s'éloigne : demande à chacun ce qu'il espère que l'autre comprenne à ce moment-là.
- Violence, contrôle, dépendance : jamais « vivable », jamais « compromis » ; demande où chacun place sa limite de sécurité.
- Réponse « je préfère en parler en personne » : ne pas relancer ce sujet.
```

**d) Ajouter des règles de forme et de pudeur**

```
FORME ET PUDEUR :
- 180 caractères au plus, une seule question (la relance d'une échelle est admise).
- Ne cite jamais les réponses entre guillemets ; nomme le sujet avec des mots simples (« l'argent que l'on envoie à sa famille »).
- Ne présuppose aucun fait de leur vie absent de l'analyse (parents séparés, enfants, ex, pratique religieuse).
- Ne demande jamais le récit d'un événement douloureux, d'un secret de famille ou d'un détail de la vie sexuelle.
- Pas de liste de choix dans le texte de la question.
```

**e) Ajouter des exemples contrastés (mauvaise question, puis bonne)**

```
EXEMPLES (inspire-toi de l'écart entre les deux, ne les recopie pas) :
Mauvais : « Est-ce une ligne rouge pour vous ? » (fermée, réponse de façade)
Bon : « Sur ce point, qu'est-ce qui vous ferait sentir respecté(e), même si l'autre pense autrement ? »
Mauvais : « Comment votre partenaire décrirait-il votre façon de vous disputer ? » (ils ne se connaissent pas)
Bon : « Comment un proche qui vous a vu(e) en colère décrirait-il votre façon de vous calmer ? »
Mauvais : « Que représente la famille pour vous ? » (abstraite, banale)
Bon : « Dans votre famille, comment savait-on qu'une dispute était terminée ? »
Mauvais : « Au premier rendez-vous, qui paie ? » (déjà demandé dans l'entretien)
Bon : « Quand quelqu'un paie l'addition pour vous, qu'est-ce que vous ressentez ? »
```

**f) Dans `generateTargetedHarmonyQuestions`**
- Supprimer la liste des « sujets de fond » (467-473), ou la reformuler sous l'angle du sens, comme dans l'exemple ci-dessus sur l'addition.
- Supprimer l'exigence d'options (465).
- Ajouter à l'entrée l'âge des membres, la présence d'enfants et le pays, si la vie privée le permet. Moins de contexte, c'est davantage d'inventions.
- Conserver « méthode » et « cible » dans `normalizeAiQuestions`, et les transmettre au relecteur.

**g) Nouvelle grille du relecteur (`CRITIC_RULES`)**

```
Refuse une question si :
1. elle oriente vers une réponse, juge ou fait la morale ;
2. elle contient du jargon, une étiquette, un diagnostic ou une interprétation présentée comme un fait (« vous avez tendance à… ») ;
3. elle porte sur le corps, l'apparence, la couleur de peau ou la santé, ou demande une coordonnée ;
4. elle mélange plusieurs idées, propose une liste de choix dans son texte, ou reste abstraite ;
5. elle répète une question de la liste ou déjà posée (même sens, autres mots), ou une question de l'entretien ;
6. elle échoue au test du premier dîner : deux inconnus se la poseraient spontanément ;
7. elle contient une faute, oublie le vouvoiement, cite les réponses entre guillemets ou dit qui a répondu quoi ;
8. on peut y répondre par oui ou par non ;
9. elle suppose un passé commun aux deux membres, ou un fait de leur vie non établi ;
10. sa réponse sincère serait difficile à montrer à l'autre (ultimatum, « partiriez-vous ? ») ;
11. elle demande le récit d'un événement douloureux, un secret de famille ou un détail de la vie sexuelle ;
12. elle traite la violence, le contrôle ou une dépendance comme une différence à aménager ;
13. elle dépasse 180 caractères ;
14. sa « méthode » n'est pas reconnaissable dans le texte, ou elle ne peut pas révéler sa « cible ».
```

Format de réponse : `{"rejets": [{"n": 4, "regle": 9, "raison": "..."}]}`.

**h) Côté code** : une question de l'IA non relue ne doit pas être servie. Dans `journey.service.ts` 474, remplacer `aiQuestions = review ? … : inGrid` par une liste vide quand `review` vaut `null`, ou n'accepter les questions non relues qu'après des contrôles automatiques : longueur, un seul point d'interrogation, pas de début du type « Est-ce… », « Faut-il… », « Avez-vous déjà… ».

Il faut aussi relever le seuil de `preferAi` à deux tiers des questions gardées, et passer le modèle rédacteur au relecteur de la question de suivi.

*Coût annexe* : `clinical-lens.spec.ts` vérifie la présence de certaines formules (« question circulaire », « ne se seraient jamais posée », « banale », « répète »). Il faudra le mettre à jour.

---

## 5. Lectures du jour et bilan (`sondeur-insights.ts`)

### 5.1 Ce qui est bien
- Les réponses sont traitées comme des données, jamais comme des consignes (ligne 169).
- « N'invente rien », « une réponse vide ou évasive n'est ni un accord ni un désaccord » (179-180).
- Ni score ni prédiction (181).
- Le code écarte tout texte contenant du jargon, des coordonnées ou un contenu refusé par la modération (256-264).
- Une version écrite par les règles, sans IA, existe et n'invente rien (125-165).
- La question de suivi est relue avant d'être placée.

### 5.2 Risques d'invention et de surinterprétation

1. **Une consigne contradictoire.** Le texte système contient toute la consigne de rédaction des questions, plus : « cherche le besoin derrière chaque position, l'émotion qu'elle protège, l'héritage qu'elle peut porter, et ce que l'un attend de l'autre sans l'avoir dit » (173). Le modèle est donc invité à inférer des émotions et une histoire familiale à partir de 500 caractères, tout en devant « ne rien inventer ». Entre ces deux consignes, un modèle de langage choisit presque toujours l'interprétation plausible. La mention « jamais un verdict » ne suffit pas, parce que le membre lit le texte comme la parole de BOLIGO.
2. **Des interprétations attribuées nommément.** Les réponses sont fournies avec les prénoms (185-193). Rien n'interdit d'écrire « Nadia semble craindre… » dans une lecture que l'autre lira. Seule la question de suivi a cette interdiction (203).
3. **De faux accords.** « together : accords réels » (213) repose sur le jugement du modèle à partir de textes libres. Deux réponses qui disent « la confiance » ou « le respect » seront comptées comme un accord, alors que c'est justement le cas « même mot, sens peut-être différent ».
4. **Un titre qui évalue.** « une phrase qui résume ce que ces trois jours montrent de leur rencontre » (235) appelle une évaluation, comme « Une rencontre prometteuse » ou « Vous partagez l'essentiel ».
5. **Aucun ancrage vérifiable.** Le JSON ne demande ni le numéro de la question ni une citation. Le code ne peut donc pas vérifier qu'un point repose sur une réponse réelle (`parseDayReading` et `parseReview`, 319-357).
6. **Une température de 0,5** (`ai.service.ts` 588) : c'est élevé pour une lecture qui doit rester factuelle.
7. **La question de suivi est rédigée dans le même appel que l'interprétation.** Elle hérite des hypothèses de la lecture.

### 5.3 Comment réduire ces risques

**a) Une consigne de lecture distincte.** Elle remplace l'inclusion de `CLINICAL_LENS` et la phrase de la ligne 173, et garde le bloc de neutralité :

```
POUR LIRE LEURS RÉPONSES :
- Décris, compare, cite ; n'explique pas. Tu peux relever un mot commun, une différence de rythme, une réponse laissée courte.
- Toute hypothèse sur un besoin ou une émotion prend la forme d'une question qui leur est posée, jamais d'une affirmation.
- N'attribue jamais à un prénom une émotion, une peur ou un besoin qu'il ou elle n'a pas écrit.
- Deux réponses qui emploient le même mot (« respect », « confiance », « sécurité ») ne sont pas un accord : classe-les dans « toDiscuss » comme « même mot, sens à préciser ».
- Un accord n'existe que si les deux réponses décrivent la même chose concrète.
- Le titre décrit ce qu'ils ont exploré ; il n'évalue pas leur compatibilité.
```

**b) Un ancrage contrôlé par le code.** Chaque point (`together`, `toDiscuss`) porte `refs` (les numéros de questions) et `quotes`, une citation de 3 à 8 mots par membre, recopiée telle quelle. Après une normalisation simple (casse et espaces), le code vérifie que chaque citation figure dans la réponse correspondante. Sinon, le point est écarté. Le coût est faible et c'est le garde-fou le plus efficace contre l'invention.

**c) Un filtre d'interprétation** dans `cleanText`, en plus du jargon. Il écarte les tournures du type : `au fond`, `inconsciemment`, `en réalité`, `(cache|révèle|trahit) (une|un|votre)`, `blessure`, `peur de l'abandon`, `vous avez tendance`.

**d) Une température entre 0,2 et 0,3** pour les lectures et le bilan.

**e) Une question de suivi relue avec `avoidModel`** (le modèle qui a écrit la lecture). Option, pour un coût moyen : la rédiger dans un second appel qui ne voit que les écarts relevés, pas les interprétations.

**f) Les réponses de type « je préfère en parler de vive voix »** ne sont jamais interprétées ; la lecture les signale simplement comme un sujet réservé à la rencontre.

---

## 6. Les dix propositions les plus utiles, par ordre de priorité

| # | Proposition | Gain clinique | Coût |
|---|---|---|---|
| 1 | Sortir la violence, le contrôle et les dépendances des gabarits de compromis | Sécurité, éthique | Faible |
| 2 | Réparer les sorties cassées (guillemets imbriqués, scores, aveux, même sujet trois jours de suite) | Crédibilité, neutralité | Faible |
| 3 | Gabarits d'accord « même mot, même sens ? » | Technique absente, la plus révélatrice | Faible |
| 4 | Supprimer la citation mécanique des deux réponses | Neutralité, réponses indépendantes, longueur | Moyen |
| 5 | Supprimer les options et rouvrir les questions fermées | Qualité des réponses libres | Moyen |
| 6 | Ajouter les techniques manquantes, adaptées à des inconnus | Profondeur de clinicien | Moyen |
| 7 | Réécrire la consigne de l'IA | Qualité des questions de l'IA | Faible |
| 8 | Durcir le relecteur et ne jamais servir de question non relue | Garde-fou | Faible |
| 9 | Ancrer les lectures et le bilan dans les réponses | Moins d'inventions | Moyen |
| 10 | Pudeur graduée et droit de différer | Respect, sincérité | Moyen |

### 1. Sortir la violence, le contrôle et les dépendances des gabarits de compromis
- **Gain** : plus aucune question ne suggère qu'une limite de sécurité se négocie. Aujourd'hui, la simulation produit « Qu'est-ce qui la rendrait vivable au quotidien ? » sur la violence physique.
- **Comment** : créer une liste de sujets non aménageables (M6_Q04 sur la violence, M6_Q05 sur les mots blessants, le signal « jalousie et contrôle », les substances quand l'écart touche à la sécurité, le désir d'enfants opposé, la polygamie). Pour eux, n'utiliser que des gabarits d'origine ou de limite.
- **Exemples**
  - Jour 1 : « Dans une dispute, à quel moment sentiriez-vous que vous n'êtes plus en sécurité ? »
  - Jour 2 : « Qui vous a appris, par l'exemple, qu'on peut se disputer sans se faire de mal ? »
  - Jour 3 : « Si la colère montait trop haut un jour, quel serait votre signal pour arrêter et reprendre plus tard ? »
- **Coût** : faible.

### 2. Réparer les sorties cassées
- **Gain** : la qualité perçue remonte aussitôt, puisqu'environ une question sur cinq est aujourd'hui grammaticalement cassée. Les scores et les aveux ne sont plus exposés.
- **Comment**
  - Dans `CONVERGENT`, utiliser le libellé de la règle (le sujet) et non la phrase d'accord ou le libellé de secours `Même réponse sur « … »`.
  - Ne jamais insérer un texte produit par `trait()` ni un aveu « Il m'arrive… » dans une question. Donner à M2_Q11, M6_Q15, M6_Q13 et M8_Q10 des gabarits propres, sans citation.
  - Choisir les écarts sur les trois jours sans reposer le même sujet. Si un thème n'a qu'un écart, ne le poser qu'au jour dont l'angle convient, et compléter avec les autres réserves.
  - Supprimer les quasi-doublons du tableau 2.7.
  - Corriger 1000 (« Vous avez tous les deux tendance… ») et 942.
- **Exemple** (écart « reproches d'un côté, repli de l'autre », sans score) : « Pendant une dispute, l'un a souvent besoin de parler tout de suite, l'autre de s'éloigner un moment. Quand cela vous arrive, qu'espérez-vous que l'autre comprenne de vous ? »
- **Coût** : faible.

### 3. Gabarits d'accord « même mot, même sens ? »
- **Gain** : c'est la technique la plus révélatrice pour un couple qui se croit d'accord, et elle est absente aujourd'hui. Elle fait découvrir ce qu'aucun des deux n'aurait vérifié.
- **Exemples**
  - Jour 1 : « Vous avez tous les deux choisi la même réponse. Qu'est-ce que cette réponse vous interdirait de faire, très concrètement ? »
  - Jour 2 (sur la foi) : « Vous vous dites tous les deux croyant(e) et pratiquant(e). Dans une semaine ordinaire, qu'est-ce que cela change concrètement à votre emploi du temps ? »
  - Jour 3 : « Vous êtes d'accord sur ce point aujourd'hui. Dans quelle situation de la vie cet accord serait-il le plus mis à l'épreuve ? »
- **Règle** : ne jamais construire un accord sur une réponse du type « je préfère en parler en personne ».
- **Coût** : faible.

### 4. Supprimer la citation mécanique des deux réponses
- **Gain** : les réponses restent indépendantes, on évite d'ancrer sa réponse sur celle de l'autre et de s'exposer, et les questions passent sous 180 caractères. La question porte sur le sens, plus sur l'écart lui-même.
- **Comment** : ajouter à chaque règle du moteur une tournure naturelle (« l'argent que l'on envoie à sa famille », « le désir d'enfants »), puis réécrire les 12 gabarits ciblés et les 6 gabarits de risque partagé autour de cette tournure, sans guillemets.
- **Exemples**
  - Remplace gen. 146 : « À propos de l'argent que l'on envoie à sa famille, qu'est-ce qui vous ferait sentir respecté(e), même si l'autre pense autrement ? »
  - Remplace gen. 156, question double : « Quel moment de votre vie a rendu le désir d'enfants si important pour vous ? »
  - Remplace gen. 166 : « Imaginez un samedi ordinaire, dans trois ans, où la question des visites en famille se pose entre vous. Que se passe-t-il ? »
- **Coût** : moyen.

### 5. Supprimer les options et rouvrir les questions fermées
- **Gain** : des réponses libres plus riches, donc des lectures plus justes. Plus de refus du relecteur pour un contenu invisible, et moins de travail pour l'IA.
- **Comment** : retirer `options` du contrat d'affichage, ou les garder comme grille de lecture cachée transmise à la lecture du jour. Réécrire la vingtaine de questions fermées.
- **Exemples**
  - 193 : « Imaginez votre mariage sans cérémonie religieuse : qu'est-ce qui vous manquerait le plus ? »
  - 273 : « Où commence l'infidélité pour vous ? Décrivez le premier message qui franchirait la ligne. »
  - 608 : « Sur ce point, qu'est-ce que vous auriez besoin d'entendre de l'autre pour en parler sans vous braquer ? »
- **Coût** : moyen. Il faut toucher au back, au relecteur et aux tests. Le mobile n'affiche déjà rien.

### 6. Ajouter les techniques manquantes, adaptées à des inconnus
- **Gain** : c'est ce qui fera passer de « questionnaire de compatibilité » à « regard de clinicien ». Environ deux gabarits par technique et par jour, à placer en priorité dans les thèmes Lieu et Famille, qui en ont le plus besoin.
- **Exemples, un par technique**
  - Circulaire : « Si l'on demandait à votre meilleur(e) ami(e) ce qui est parfois difficile à vivre avec vous, que répondrait-il ou elle ? »
  - Échelle : « De 0 à 10, à quel point avez-vous besoin de savoir où est l'autre pour être tranquille ? Pourquoi pas un point de moins ? »
  - Exception : « Pensez à une dispute, en famille ou dans une relation passée, qui s'est bien terminée. Qu'est-ce qui l'a rendue différente ? »
  - Miracle : « Imaginez qu'un matin, parler d'argent à deux ne vous pèse plus du tout. Quel serait le premier petit signe de ce changement ? »
  - Besoin caché : « Qu'est-ce que votre façon de gérer l'argent vous permet de protéger ? »
  - Réparation : « Après une dispute, quel petit geste de l'autre vous fait baisser les armes ? »
  - Problème perpétuel : « Dans vos relations passées, quel désaccord revenait toujours, et qu'avez-vous appris à faire avec lui ? »
  - Famille d'origine : « Dans votre famille, comment savait-on qu'une dispute était terminée ? »
  - Lieu : « Si vous suiviez un jour votre partenaire dans une autre ville, qu'auriez-vous peur de lui reprocher plus tard ? »
  - Intimité : « Comment aimeriez-vous qu'on vous dise « pas ce soir », pour ne pas le vivre comme un rejet ? »
- **Coût** : moyen. Il faut une soixantaine de formulations à écrire, puis à faire relire par un clinicien.

### 7. Réécrire la consigne de l'IA
- **Gain** : l'IA cesse d'imiter les gabarits les plus plats. Elle choisit la technique selon le signal et respecte le contexte de deux inconnus.
- **Comment** : intégrer les blocs a) à f) de la section 4.4, retirer les « sujets de fond » banals et l'exigence d'options, et conserver « méthode » et « cible ».
- **Exemple** (version clinique d'un sujet de fond imposé aujourd'hui) : « Quand quelqu'un paie l'addition pour vous, qu'est-ce que vous ressentez ? »
- **Coût** : faible. Il faut mettre à jour `clinical-lens.spec.ts`.

### 8. Durcir le relecteur et ne jamais servir de question non relue
- **Gain** : les règles 8 à 14 de la section 4.4 g) arrêtent les dérives les plus probables. Le parcours gratuit ne sert plus de questions de l'IA sans relecture.
- **Comment** : nouvelle grille, transmission de la méthode et de la cible, `aiQuestions = []` si `review === null`, seuil de deux tiers, `avoidModel` pour la question de suivi. Option : faire passer **une fois**, hors ligne, les 175 gabarits devant ce relecteur.
- **Exemple** (refusée, puis réécrite)
  - Refusée, règle 9 : « Comment votre partenaire décrirait-il votre façon de gérer les conflits ? »
  - Acceptée : « Comment un proche qui vous a vu(e) en colère décrirait-il votre façon de vous calmer ? »
- **Coût** : faible.

### 9. Ancrer les lectures et le bilan dans les réponses
- **Gain** : la lecture du jour ne psychologise plus. Elle compare, cite et pose des questions. Plus aucune interprétation n'est attribuée à un prénom.
- **Comment** : consigne de lecture distincte (section 5.3 a), `refs` et `quotes` vérifiés par le code (5.3 b), filtre d'interprétation (5.3 c), température de 0,3.
- **Exemple** (question d'ouverture produite à partir d'un faux accord) : « Vous avez tous les deux parlé de « sécurité » : qu'est-ce que ce mot veut dire pour vous, très concrètement ? »
- **Coût** : moyen.

### 10. Pudeur graduée et droit de différer
- **Gain** : des réponses plus sincères et aucune exposition forcée devant un inconnu. Cela respecte les cultures où l'intimité se dit tard.
- **Comment**
  - Afficher sous chaque question : « Vous pouvez aussi écrire : « J'aimerais en parler de vive voix. » »
  - Ne jamais relancer un sujet ainsi différé, et le signaler comme tel dans la lecture.
  - Garder les questions les plus intimes pour le jour 3.
  - Remplacer les questions à forte pression sociale.
- **Exemple** (remplace 884, « … Est-ce que cela change vos sentiments ? ») : « En dehors de l'argent, qu'est-ce qu'un partenaire devrait apporter au foyer pour que vous vous sentiez à égalité ? »
- **Coût** : moyen. Il faut toucher au mobile, au back et aux lectures.

---

## Annexe : références utiles

**Défauts relevés dans le code**
- Options jamais affichées : `mobile-steve/app/(tabs)/index.tsx` 595-604.
- La réponse du partenaire est masquée volontairement, mais la question révèle sa réponse à l'entretien : `src/journey/journey.service.ts` 293-295.
- Questions de l'IA non relues servies sur les parcours gratuits : `src/journey/journey.service.ts` 474-477, avec `src/ai/ai.service.ts` 153-155 et 546.
- Libellé de secours qui produit les guillemets imbriqués : `src/matching/divergence.engine.ts` 1103.
- Scores et aveux injectés dans les citations : `src/psychometrics/psychometrics.ts` 344-346 et 503-507.
- Même sujet repris plusieurs jours : gen. 792 pour les écarts, gen. 830-832 pour les accords.
- Méthode et cible de l'IA perdues : `src/journey/harmony-question.types.ts`, `normalizeAiQuestions`.
- Relecture de la question de suivi sans `avoidModel` : `src/journey/journey-insights.service.ts` 202-213.

**Simulation** : script hors dépôt, dans le dossier de travail (`scratchpad/sim/`). Les entretiens sont tirés au hasard, ce qui ne reflète pas la distribution réelle des réponses : les chiffres sont des ordres de grandeur.
