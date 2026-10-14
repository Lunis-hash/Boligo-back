# Clarté du Grand Entretien V8.2 — relecture éditoriale FR/EN

Relecture du 13 octobre 2026 (versions .docx datées du 14 octobre 2026), branche `claude/recette-ge-v82-ergonomie`.
Périmètre : les 118 questions servies par l'application en V8.2 (les 113 du modèle validé, les 4 questions V7 reprises M5_Q07, M9_Q07, M4_Q14, M10_Q15, et V82_M8_06), en français et en anglais.

**Bilan : 87 libellés corrigés, 29 en français (24 questions) et 58 en anglais (39 questions).** Aucun identifiant, aucune clé de réponse, aucun nombre d'options et aucun ordre ne change.

## Où vivent les corrections

| Support | Fichier | Remarque |
|---|---|---|
| Application (FR) | `src/interview/questions.v82.clarity.ts` → `V82_CLARITY_FR` | appliquée dans `assemble()` (`questions.v82.ts`), après `withV71Attributes` |
| Application (EN) | `src/interview/questions.v82.clarity.ts` → `V82_CLARITY_EN` | appliquée à `V82_EN` |
| Word FR | `docs/questionnaire/V8_2_FINAL/BOLIGO_Grand_Entretien_V8_2_FINAL_FRANCAIS_CORRIGE_2026-10-14.docx` | copie de l'original, corrections au niveau des runs |
| Word EN | `docs/questionnaire/V8_2_FINAL/BOLIGO_Grand_Entretien_V8_2_FINAL_ENGLISH_CORRIGE_2026-10-14.docx` | idem |
| Tests | `src/interview/questions.v82.clarity.spec.ts` | identifiants, clés, cibles des corrections, « habill », V82_M1_04, FR/EN complets |

`questions.v82.generated.ts` (fichier généré) et les originaux .docx ne sont pas modifiés. Les questions V7 reprises sont corrigées par la seule table V8.2 : `questions.data.ts` et `questions.en.ts`, donc la V7.1, restent identiques.

## Tableau avant / après

¹ Question servie par l'application mais absente des .docx validés (question V7 reprise ou V82_M8_06) : corrigée dans l'application seulement.

| Id | Langue | Champ | Avant | Après | Raison |
|---|---|---|---|---|---|
| V82_M0_02 | FR | texte | Et quels âges accepteriez-vous réellement, au-delà de cette tranche idéale ? | Et quelle tranche d'âge seriez-vous réellement prêt(e) à accepter, en incluant votre tranche idéale ? | « au-delà de » laissait croire qu'il fallait saisir des âges hors de la tranche idéale ; or la plage acceptée doit l'inclure (règle du curseur). |
| V82_M0_02 | EN | texte | And which ages would you genuinely accept, beyond that ideal range? | And what age range would you genuinely accept, including your ideal range? | Même ambiguïté (« beyond ») ; aligné sur le français. |
| M0_Q02 | FR | option C | Tout mon pays (National) | Tout mon pays (national) | Majuscule fautive après la parenthèse. |
| M0_Q02 | FR | option D | International (Sans frontières) | International (sans frontières) | Majuscule fautive après la parenthèse. |
| M0_Q10 | EN | texte | Which languages are you comfortable living a relationship in, day to day? (several answers possible) | Which languages are you comfortable using in a day-to-day relationship? (select all that apply) | Calque (« living a relationship in ») ; « (several answers possible) » remplacé par la formule anglaise usuelle. |
| M0_Q04 | FR | option C | Veuf / Veuve | Veuf / veuve | Majuscule incohérente avec « Séparé(e) / divorcé(e) ». |
| M0_Q04 | FR | option D | En transition : séparation ou divorce pas encore terminé | En transition : séparation ou divorce en cours | « pas encore terminé » ne s'accordait qu'avec « divorce » ; « en cours » vaut pour les deux. |
| V82_M0_03 | EN | texte | Do you have children? If so, where do they mostly live? (several answers possible) | Do you have children? If so, where do they mostly live? (select all that apply) | Formule anglaise usuelle pour un choix multiple. |
| M0_Q14 | EN | option A | That suits me completely | I’m completely fine with it | Calque de « Cela me convient » ; anglais naturel. |
| M0_Q14 | EN | option B | That suits me, as long as they don’t live with us full-time | I’m fine with it, as long as they don’t live with us full-time | Calque ; anglais naturel, même sens. |
| M3_Q04 | EN | texte | In a blended family, the step-parent’s place with the other’s children: | In a blended family, the step-parent’s role with their partner’s children: | « the other’s children » obscur ; « place » se dit « role » en anglais. |
| M3_Q04 | EN | option A | A full parent, with no difference between the children | A full parent, treating all the children the same | Formulation plus naturelle, même sens. |
| M3_Q04 | EN | option B | An affectionate place, each parent keeping their role with their own children | An affectionate role, with each parent keeping their own role with their children | « place » → « role » (calque). |
| M3_Q04 | EN | option D | A place built over time and through trust | A role that develops with time and trust | « place » → « role » (calque). |
| V82_M8_01 | FR | option D | Découvrir, sans décider tout de suite de la forme | Faire connaissance, sans décider tout de suite de la forme de la relation | « Découvrir… de la forme » : complément manquant (découvrir quoi ? la forme de quoi ?). |
| V82_M8_01 | EN | option D | To get to know someone, without deciding the form right away | Getting to know someone, without deciding yet what form the relationship will take | Aligné sur le français ; forme en -ing parallèle à une réponse. |
| V82_M8_02 | FR | texte | Si la relation se construit bien, à quel horizon souhaiteriez-vous un engagement officiel ? | Si la relation se construit bien, dans quel délai souhaiteriez-vous un engagement officiel ? | « à quel horizon » est du jargon de gestion ; « dans quel délai » est usuel. |
| M8_Q16 | FR | texte | Pour vous, un mariage n'est accompli qu'avec : (plusieurs réponses possibles) | Pour vous, quelles cérémonies sont indispensables à un mariage ? (plusieurs réponses possibles) | L'amorce « n'est accompli qu'avec : » ne s'accordait pas avec la réponse D (« Aucune cérémonie n'est indispensable ») ; question directe, même sens. |
| M8_Q16 | EN | texte | For you, a marriage is only complete with: (several answers possible) | For you, which ceremonies are essential to a marriage? (select all that apply) | Même correction ; formule usuelle pour un choix multiple. |
| M0_Q11 | FR | option D | Acceptable s'il ne fume jamais à la maison ni près des enfants | Acceptable si le tabac reste hors de la maison et loin des enfants | « s'il ne fume jamais » : sujet masculin implicite (le partenaire), alors que « il » renvoie au tabac dans l'option B ; formulation neutre et cohérente. |
| M0_Q11 | EN | texte | Tobacco in a partner: | A partner who smokes: | « Tobacco in a partner » n'est pas idiomatique. |
| M0_Q11 | EN | option B | Acceptable if it stays occasional | Acceptable if it’s only occasional | Plus naturel avec la nouvelle amorce. |
| M0_Q11 | EN | option D | Acceptable if never at home or around children | Acceptable if they never smoke at home or around children | Phrase sans sujet ; complétée. |
| M0_Q12 | FR | option B | Seulement lors d'occasions (fêtes, repas) | Seulement en certaines occasions (fêtes, repas) | « lors d'occasions » est maladroit. |
| M0_Q12 | EN | option B | Only on occasions (celebrations, meals) | Only on certain occasions (celebrations, meals) | « on occasions » n'a pas ce sens en anglais. |
| M0_Q13 | FR | option A | Je ne pourrais pas vivre avec, même occasionnel | Je ne pourrais pas vivre avec, même si c'est occasionnel | Accord fautif : « même occasionnel » ne se rattache à rien. |
| M0_Q13 | FR | option D | Acceptable avec modération, jamais d'ivresse | Acceptable avec modération, sans jamais d'ivresse | Construction elliptique ; « sans jamais d'ivresse » se lit d'un trait. |
| M0_Q13 | EN | texte | Alcohol in a partner: | A partner who drinks alcohol: | « Alcohol in a partner » n'est pas idiomatique. |
| M0_Q13 | EN | option B | Acceptable if it stays occasional | Acceptable if it’s only occasional | Plus naturel avec la nouvelle amorce. |
| M0_Q13 | EN | option D | Acceptable in moderation, never drunk | Acceptable in moderation, never to the point of getting drunk | « never drunk » ambigu ; même sens que le français. |
| M0_Q15 | FR | texte | Vous-même, les jeux d'argent (paris sportifs, casino, loterie) : | Vous-même, jouez-vous à des jeux d'argent (paris sportifs, casino, loterie) ? | Amorce bancale (« Vous-même, les jeux d'argent : ») ; question directe, parallèle à M0_Q09 et M0_Q12. |
| M0_Q15 | EN | texte | Yourself, gambling (sports betting, casino, lottery): | Do you gamble yourself (sports betting, casino, lottery)? | Même correction (« Yourself, gambling » n'est pas de l'anglais). |
| M0_Q16 | EN | texte | Gambling (sports betting, casino, lottery) in a partner: | A partner who gambles (sports betting, casino, lottery): | « Gambling … in a partner » n'est pas idiomatique. |
| V82_M1_01 | EN | texte | Which cultures, family languages or traditions matter in your identity? (two at most, optional) | Which cultures, family languages or traditions matter to your identity? (up to two, optional) | « matter in your identity » → « matter to » ; « up to two » usuel. |
| M1_Q16 | EN | option C | Christian: another Church | Christian: another church | « church » ne prend pas de majuscule en anglais dans ce sens. |
| V82_M1_02 | FR | option B | Oui, mais une différence reste compatible avec ma vision | Oui, mais une différence de convictions reste compatible avec ma vision | « une différence » : on ne savait pas de quoi ; « de convictions » précise. |
| V82_M1_02 | EN | option B | Yes, but a difference remains compatible with my outlook | Yes, but a difference in beliefs is still compatible with my outlook | Aligné sur le français. |
| M1_Q18 | FR | texte | Si la personne que vous aimez n'avait pas votre religion ou vos convictions : | Si la personne que vous aimez ne partageait pas votre religion ou vos convictions : | « n'avait pas votre religion » est familier ; « ne partageait pas » est le sens visé. |
| M1_Q19 | EN | option F | No rules: I eat everything | No rules: I eat anything | « I eat everything » = je mange tout ; « anything » = je mange de tout. |
| V82_M1_03 | EN | texte | What place would you like each partner’s traditions to have in your future home? | What role would you like each partner's traditions to play in your future home? | « What place … to have » est un calque ; apostrophes harmonisées dans la question. |
| V82_M1_04 | FR | texte | Si vos familles désapprouvaient votre union pour des raisons culturelles ou religieuses, comment décideriez-vous ? | Si vos familles s’opposaient à votre union pour des raisons culturelles ou religieuses, quelle place donneriez-vous à leur avis dans votre décision ? | Signalé par Steve : « comment décideriez-vous ? » ne disait pas ce qu'on décide. La question porte sur le poids de l'avis des familles ; les options A à D y répondent sans changement. |
| V82_M1_04 | EN | texte | If your families disapproved of your union for cultural or religious reasons, how would you decide? | If your families opposed your relationship for cultural or religious reasons, how much weight would you give their opinion in your decision? | Même correction ; « union » est rare en anglais courant. |
| M4_Q17 | EN | option D | I don’t adhere to it, even if my partner cares about it | I don’t subscribe to it, even if my partner cares about it | « adhere to » est un calque ; aligné sur V82_M4_08 (« subscribe to »). |
| M1_Q20 | EN | option C | Conceivable if everyone consents, within a religious or customary framework | Something I could consider if everyone consents, within a religious or customary framework | « Conceivable » est un calque d'« Envisageable ». |
| M6_Q19 | EN | texte | In your view, which of these behaviours by your partner would already be unfaithful? (several answers possible) | In your view, which of these behaviours by your partner would already count as infidelity? (select all that apply) | Un comportement n'est pas « unfaithful » ; « count as infidelity » ; formule usuelle du choix multiple. |
| V82_M8_04 | EN | option A | A firm, explained and consistent framework | Firm, consistent rules, with the reasons explained | « framework » est un calque de « cadre ». |
| V82_M8_04 | EN | option C | Broad autonomy within a safe framework | Plenty of independence within safe limits | « framework » est un calque de « cadre ». |
| M8_Q18 | EN | option B | In one of ours, chosen together | In the religion of one of us, chosen together | « In one of ours » est agrammatical. |
| M8_Q10 | FR | texte | Parmi ces signaux, lesquels vous feraient fuir rapidement ? (3 au plus) | Parmi ces signaux, lesquels vous feraient fuir rapidement ? (trois au plus) | Nombre en lettres, comme « deux au plus » (V82_M1_01). |
| M8_Q10 | EN | texte | Which of these signs would make you run quickly? (3 at most) | Which of these warning signs would make you walk away quickly? (up to 3) | « run quickly » est un calque de « fuir » ; « (up to 3) » usuel. |
| M8_Q10 | EN | option D | Staying vague about intentions: “we’ll see”, no commitment | Staying vague about their intentions: “we’ll see”, no commitment | Possessif manquant. |
| M8_Q10 | EN | option J | Eyes glued to their phone during time together | Being glued to their phone during time together | Forme en -ing, parallèle aux autres signaux. |
| M8_Q12 | FR | texte | Parmi ces sujets, lesquels sont pour vous non négociables, au point qu’un désaccord vous ferait renoncer à la relation ? (3 au plus) | Parmi ces sujets, lesquels sont pour vous non négociables, au point qu’un désaccord vous ferait renoncer à la relation ? (trois au plus) | Nombre en lettres, comme ailleurs. |
| M8_Q12 | EN | texte | Which of these topics are non-negotiable for you, to the point that a disagreement would make you give up the relationship? (3 at most) | Which of these topics are non-negotiable for you, to the point that a disagreement would make you end the relationship? (up to 3) | « give up the relationship » est un calque ; « (up to 3) » usuel. |
| M8_Q12 | EN | option F | The place of family in the couple | The role of family in the relationship | « in the couple » est un calque. |
| V82_M8_06 ¹ | EN | texte | If, after several years, your relationship went through a long difficult period, with no violence or danger for anyone, what would your attitude be? | If, after several years, your relationship went through a long, difficult period, with no violence or danger for anyone, what would your attitude be? | Virgule manquante entre deux adjectifs coordonnés. |
| V82_M8_06 ¹ | EN | option D | I would leave fairly quickly: staying out of obligation alone makes no sense to me | I would leave fairly quickly: staying only out of obligation makes no sense to me | Ordre des mots plus naturel. |
| V82_M10_01 | FR | texte | Qu’est-ce qui vous fait le plus souvent sentir une proximité naissante avec quelqu’un ? | Qu’est-ce qui vous fait le plus souvent ressentir une proximité naissante avec quelqu’un ? | « sentir une proximité » → « ressentir » (sentiment, non sensation). |
| V82_M10_02 | FR | option A | Des échanges écrits d’abord, puis une conversation à voix haute | Des échanges écrits d’abord, puis une conversation de vive voix | « conversation à voix haute » est inhabituel ; « de vive voix » (par opposition à l'écrit) est le sens visé. |
| V82_M10_02 | FR | option B | Une conversation à voix haute assez vite | Une conversation de vive voix assez vite | Même correction. |
| V82_M3_02 | FR | texte | Aujourd’hui, quel lien gardez-vous avec votre dernier/dernière partenaire ? | Aujourd’hui, quel lien gardez-vous avec votre dernier ou dernière partenaire ? | « dernier/dernière » : barre oblique remplacée par une écriture lisible. |
| V82_M6_03 | FR | texte | Quand je me sens blessé(e), il m'arrive d'être ironique ou moqueur(se). | Quand je me sens blessé(e), il m'arrive d'être ironique ou moqueur(euse). | Faute manifeste d'écriture inclusive : « moqueur(se) » → « moqueur(euse) ». Seule retouche dans un item d'échelle. |
| M6_Q05 | EN | option B | Serious, but I can forgive a first time | Serious, but I can forgive it once | « forgive a first time » est un calque. |
| M6_Q05 | EN | option D | I try to ignore it if it’s not recurring | I try to let it go if it doesn’t keep happening | « ignore » trahit « passer outre » ; « recurring » lourd. |
| V82_M9_01 | FR | texte | Pour une décision importante sur laquelle vous n’êtes pas d’accord, quel fonctionnement préférez-vous ? | Face à une décision importante sur laquelle vous n’êtes pas d’accord tous les deux, comment préférez-vous procéder ? | « vous n'êtes pas d'accord » pouvait se lire comme un désaccord de la personne avec la décision ; on précise qu'il s'agit d'un désaccord entre les deux. « fonctionnement » → « procéder ». |
| V82_M9_01 | EN | texte | For an important decision you disagree on, how do you prefer to proceed? | When you and your partner disagree on an important decision, how do you prefer to proceed? | Même précision. |
| M5_Q08 | EN | option A | Total transparency — each has access to everything | Total transparency — we each have access to everything | « each has access » est un calque. |
| M5_Q08 | EN | option B | Each keeps their phone to themselves | We each keep our phone private | Plus naturel ; même sens. |
| V82_M9_05 | EN | option A | I would like it, if we both decide so | I'd like that, if we both agree to it | « if we both decide so » est un calque. |
| M9_Q07 ¹ | FR | option A | Essentielles — c'est mon langage principal d'amour | Essentielles — c'est mon principal langage d'amour | Ordre des mots plus naturel. |
| M9_Q07 ¹ | FR | option B | Importantes, mais je ne suis pas très démonstratif(ve) | Importantes, mais je ne suis pas très démonstratif(ive) | Faute d'écriture inclusive : « démonstratif(ve) » → « démonstratif(ive) ». |
| M9_Q07 ¹ | EN | texte | Your relationship with tenderness and physical affection outside sexuality: | Your attitude to tenderness and non-sexual physical affection: | « Your relationship with tenderness … outside sexuality » est un calque. |
| M10_Q19 | EN | option A | I say so simply, and we find another tender moment | I simply say so, and we find another moment of tenderness | « I say so simply » (ordre des mots) ; « tender moment » trop vague. |
| M10_Q15 ¹ | EN | texte | For a story to begin, physical attraction has to be: | For a relationship to begin, physical attraction has to be: | « story » est un calque d'« histoire » (relation). |
| M10_Q15 ¹ | EN | option B | There, and it grows as we get to know each other | Present, and it grows as we get to know each other | « There » isolé n'est pas naturel. |
| V82_M4_02 | FR | texte | Si votre partenaire perdait son emploi pendant plusieurs mois tout en cherchant activement, comment le vivriez-vous ? | Si votre partenaire se retrouvait sans emploi pendant plusieurs mois, tout en cherchant activement du travail, comment le vivriez-vous ? | « perdait son emploi pendant plusieurs mois » se lisait comme une perte qui dure ; on décrit une période sans emploi, et ce que la personne cherche. |
| V82_M4_02 | EN | texte | If your partner lost their job for several months while actively looking, how would you handle it? | If your partner were out of work for several months while actively looking for a job, how would you handle it? | Même précision. |
| M4_Q16 | EN | texte | Supporting your family financially (parents, brothers and sisters…) once you are a couple: | Supporting your family financially (parents, brothers and sisters…) once you are in a relationship: | « once you are a couple » est un calque. |
| V82_M4_03 | EN | option C | Regularly, a small share of my income | Regularly, with a small share of my income | Préposition manquante. |
| V82_M4_03 | EN | option D | Regularly, a large share of my income | Regularly, with a large share of my income | Préposition manquante. |
| V82_M4_04 | FR | texte | Si vous découvriez un crédit important de votre partenaire avant de vivre ensemble, quelle réaction serait la plus proche de la vôtre ? | Si, avant de vivre ensemble, vous découvriez que votre partenaire a un crédit important, quelle réaction serait la plus proche de la vôtre ? | Ambiguïté : « avant de vivre ensemble » portait-il sur le crédit ou sur la découverte ? On place le moment de la découverte en tête. |
| V82_M4_04 | EN | texte | If you discovered your partner had a large loan before moving in together, which reaction would be closest to yours? | If, before moving in together, you found out that your partner had a large loan, which reaction would be closest to yours? | Même ambiguïté levée. |
| V82_M4_06 | FR | option A | Je réduirais volontiers mon train de vie si nous sommes d’accord | Je réduirais volontiers mon train de vie si nous étions d’accord | Concordance des temps (conditionnel → imparfait après « si »). |
| V82_M4_06 | EN | option A | I would gladly cut back if we agree | I would gladly cut back if we agreed | Concordance des temps. |
| V82_M4_06 | EN | option B | I would accept with a budget and a date to review | I would accept, with a budget and a date to review the situation | Virgule et complément manquants. |
| V82_M5_03 | EN | option A | I would welcome them naturally, even with no end date | I would gladly welcome them, even with no end date | « naturally » est un calque. |
| V82_M5_03 | EN | option D | I don't want a long-term cohabitation | I don’t want anyone living with us long-term | « a long-term cohabitation » n'est pas idiomatique. |

## Méthode

1. **Extraction.** Les textes servis ont été exportés depuis l'application (`V82_QUESTIONS`, `V82_EN`) et les deux .docx lus avec python-docx. Avant correction, les 113 questions des .docx étaient identiques, mot pour mot, à celles de l'application, en français comme en anglais.
2. **Relecture question par question**, avec cinq critères : orthographe et accords ; ponctuation ; naturel et clarté (on doit comprendre ce qu'on demande sans relire) ; cohérence psychologique (une question pour une idée, pas de double négation, pas de formulation qui oriente, options grammaticalement cohérentes avec l'amorce) ; fidélité de l'anglais (anglais naturel et neutre, sans calque du français). L'orthographe britannique déjà en place (behaviour, criticise, humour) est conservée.
3. **Contraintes.** Le sens validé ne change pas. Les réponses sont stockées par clé : un libellé corrigé ne touche aucun entretien commencé ou terminé.
4. **Application.** Une table de corrections par langue, appliquée par-dessus le fichier généré. Les tests vérifient que chaque correction vise une question et une clé existantes, qu'elle change bien le libellé source, et que la V7.1 n'est pas modifiée.
5. **Word.** Les .docx corrigés sont des copies où l'on remplace uniquement le texte du run concerné (« N. ID — texte » ou « X. option ») : mise en forme, styles et tableaux sont inchangés. À la relecture des fichiers produits, les 113 questions sont identiques à celles de l'application corrigée et chaque correction y figure (27 en français, 53 en anglais ; les autres portent sur des questions absentes des .docx). Les originaux ont gardé leur empreinte md5.
6. **Contrôles.** Le libellé « habill » n'apparaît dans aucune source : ni dans l'application, ni dans les .docx, ni dans le modèle. L'application affiche déjà « Quelle tranche d'âge vous attire le plus ». La seule occurrence du dépôt est un commentaire de `src/journey/sondeur.generator.ts` (« sous un autre habillage »), sans rapport. Le « vous habillez » vu par Steve vient vraisemblablement de la traduction automatique du navigateur.

## Points laissés volontairement intacts

- **Mini-IPIP (V82_M7_01 à V82_M7_20)** : c'est un instrument psychométrique publié. Aucun item n'a été modifié, en français comme en anglais. L'anglais reprend mot pour mot les items de l'IPIP (« I sympathize… », « I feel others' emotions »), et le français ne contient aucune faute manifeste.
- **Échelles d'accord, de fréquence et d'exactitude** : aucun libellé n'a été modifié. Leurs apostrophes typographiques (« d’accord ») cohabitent avec des apostrophes droites dans certains items : ce n'est pas une faute, donc on n'y touche pas.
- **Items d'échelle de BOLIGO (attachement, régulation, conflit, réciprocité, M6_Q24…)** : aucune modification, sauf la faute manifeste « moqueur(se) » de V82_M6_03.
- **Apostrophes droites (') et typographiques (’)** : les deux coexistent dans le fichier généré, souvent selon l'origine de la question (V7 ou V8.2). Les harmoniser partout aurait modifié environ 60 libellés sans gain de lisibilité, avec un risque pour les comparaisons de textes littérales (Sondeur, tests). On a donc harmonisé seulement dans les libellés réécrits.
- **Espaces avant « ? » et « : »** : le fichier met partout une espace simple (aucune espace insécable). On a gardé cette convention ; aucune question n'en manquait. Pour éviter qu'un « ? » passe seul à la ligne, il faudrait le gérer à l'affichage (côté front), pas dans les données.
- **M0_Q02** : les options A (« ma ville et ma région ») et B (« Même région ») se recouvrent. Ce n'est pas corrigé, car les filtres de la Découverte traitent A et B comme « local » (`meeting-scope.ts`, `discover-filters.ts`) : changer A modifierait le sens fonctionnel. La question est d'ailleurs posée à l'inscription, pas pendant l'entretien. À arbitrer.
- **Aide de M0_Q09 et M0_Q11** (« y compris cigarette électronique (vapotage) et chicha ») : elle figure dans les .docx mais n'est pas servie par l'application (ni la V7.1 ni la V8.2 n'ont d'aide pour ces questions). Rien n'a été ajouté, car c'est un ajout de contenu, pas une correction. À arbitrer. Même chose pour la note sur la dot (M4_Q17).
- **Consignes, intertitres et notes des .docx** (préambule, « Aide : », annexes) : relus, aucune faute relevée, rien de modifié.
- **Sources du modèle** (`preuves/model.py`, `items_base.py`, `v7reuse_final.json`, `sondeur_v82/v82_items.json`) et documents V6/V7 historiques : non modifiés. Les corrections forment une couche au-dessus de l'export. Si le modèle est un jour corrigé à la source, le test « chaque correction change réellement un libellé » signalera les entrées devenues inutiles.

## Libellés copiés ailleurs (signalés, non modifiés)

- **Sondeur, IA, matching (`src/journey`, `src/ai`, `src/matching`)** : aucun libellé corrigé n'y est recopié en dur. Les textes de réponses V8.2 y sont lus à l'exécution (`V82_INDEX`, `V82_EN`), par clé, ou par texte des deux côtés (`agreementKey`, `convergenceTextEn`) : les deux côtés lisent donc le même libellé corrigé. Les questions communes à la V7.1 sont lues par le moteur dans `QUESTION_INDEX`, qui n'a pas changé.
- **Tests existants** : `src/interview/questions.v82.spec.ts` comparait les options à `v82_items.json` et les questions V7 reprises à la V7.1, texte pour texte. Les deux assertions ont été adaptées pour intégrer la relecture : codes et ordre restent vérifiés à l'identique. Les changements de texte sont voulus.
- **Documents seulement** : les anciens libellés restent dans `docs/questionnaire/BOLIGO_Questionnaire_V6_2_*.html`, `BOLIGO_Questionnaire_V7_*.html`, `BOLIGO_Consigne_IA_V7.html`, `V8_2_FINAL/preuves/*` et les prompts d'essai `docs/ia-essais/prompts/*.txt` (M8_Q16, M0_Q13, M0_Q15, M1_Q18, M8_Q10, M9_Q07, V82_M4_06). Ce sont des archives ou des sources : elles ne sont pas modifiées.
