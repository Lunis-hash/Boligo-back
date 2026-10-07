# Coût de l'IA chez BOLIGO

## 1. Le portrait n'a pas besoin de l'IA

Le Grand Entretien est un questionnaire à choix : chaque réponse est une option
précise. À partir de ces réponses, les règles de BOLIGO calculent, sans IA :

- la synthèse, les valeurs, les besoins, les lignes rouges, les trois mots et le
  profil relationnel ;
- le texte « À propos », fluide, à la première personne, sans phrase coupée ;
- les cartes des modules ;
- les pourcentages de compatibilité, les divergences et les sujets à aborder.

Ce portrait est exact et explicable : chaque phrase vient d'une réponse. L'IA ne
ferait que reformuler le texte « À propos », avec un risque réel : elle a déjà
inventé un désir d'enfants ou une religion que le membre n'avait pas déclarés
(un contrôle les écarte aujourd'hui).

**Verdict : le portrait reste sans IA (0 € par membre).**

Si BOLIGO voulait quand même un texte « À propos » réécrit par l'IA, voici le
coût, aux prix publics de Groq :

| Version | Pour 1 profil | Pour 1 000 000 de profils |
|---|---|---|
| Actuelle (`AI_PROFILE_MODE=ai`) : toutes les réponses envoyées (≈ 5 000 jetons lus, ≈ 1 000 écrits) | 0,0003 € à 0,001 € | 330 € à 1 000 € |
| Optimisée (non construite) : seulement le portrait déjà calculé (≈ 600 jetons lus, ≈ 300 écrits), modèle Llama 3.1 8B | ≈ 0,00005 € | ≈ 55 € |
| Optimisée, modèle gpt-oss-120b | ≈ 0,0003 € | ≈ 270 € |

## 2. Le Sondeur, lui, a besoin de l'IA

Dans le Sondeur, les deux membres écrivent leurs réponses librement. Des
règles ne savent pas dire si « Celui qui invite paie » et « Moitié-moitié au
début » s'accordent : seule l'IA peut lire ces réponses. Avant ce changement,
personne ne les lisait.

**Le regard clinique.** Pour le Sondeur, l'IA raisonne comme un clinicien du
couple formé à plusieurs écoles :

- l'attachement ;
- la méthode Gottman ;
- la thérapie centrée sur les émotions ;
- les approches psychodynamique et psychanalytique ;
- l'approche systémique ;
- les thérapies cognitives et des schémas ;
- l'approche orientée solutions ;
- les valeurs, et le désir face à la sécurité.

Elle choisit pour chaque question la technique la plus juste : question
circulaire, question d'origine, échelle, scène concrète, besoin caché, futur.
Elle ne cherche pas la faille : elle cherche **la question que les deux membres
ne se seraient jamais posée eux-mêmes**.

Avant d'écrire, elle formule des hypothèses sur le couple (besoins, héritages
familiaux, attentes jamais dites). Pour chaque question, elle note la méthode
utilisée et ce qu'elle cherche à révéler. Rien de tout cela n'est montré aux
membres : la méthode reste invisible, sans jargon, sans étiquette, sans
diagnostic. BOLIGO ne présente jamais l'IA comme psychologue.

**La méthode, adaptée au Sondeur.** La consigne (`src/journey/clinical-lens.ts`)
commence par le cadre réel :

- deux personnes qui ne se sont jamais parlé ;
- chacune lira la réponse de l'autre ;
- une réponse libre de 500 caractères ;
- une profondeur qui monte avec les jours.

Elle relie ensuite chaque type d'écart à la technique adaptée. Exemple : un
point non négociable ne donne jamais lieu à un compromis, mais à une question
sur ce que la position protège. Elle fixe la forme et la pudeur :

- 180 caractères au plus ;
- une question ouverte ;
- jamais de citation des réponses ;
- jamais de récit douloureux ni de fait supposé.

Elle se termine par des exemples de mauvaises et de bonnes questions.

**Les garde-fous contre les erreurs et les répétitions** :

1. **Deux propositions par créneau, rédigées jour par jour.** Le rédacteur
   écrit les trois jours en parallèle : 14 propositions par jour, deux par
   thème, avec deux techniques différentes. Il note la méthode et la cible de
   chacune.
2. **Contrôle de forme par le code, avant toute relecture.** Une proposition est
   écartée dans chacun de ces cas :
   - elle est fermée (« Est-ce… », « Accepteriez-vous… ») ;
   - elle dépasse 200 caractères ou ne finit pas par un point d'interrogation ;
   - elle cite une réponse entre guillemets ;
   - elle contient du jargon ou une interprétation (« au fond », « cela
     révèle… », « vous avez tendance à… »).
3. **Relecture par une autre famille d'IA.** Le relecteur n'est jamais de la
   même famille que le rédacteur :
   - avec OpenRouter : Claude (Anthropic) rédige, GPT (OpenAI) relit ;
   - sans OpenRouter, ou en secours : gpt-oss-120b (OpenAI) rédige, Llama 3.3 70B
     (Meta) relit.

   Il voit la méthode et la cible de chaque proposition, et refuse au moindre
   défaut, selon 20 règles :
   - question orientée ;
   - jargon ou diagnostic ;
   - corps ou santé ;
   - plusieurs idées ;
   - répétition ;
   - question banale ;
   - faute ;
   - question fermée ;
   - passé commun ou fait inventé ;
   - réponse gênante à montrer ;
   - récit douloureux ;
   - violence traitée comme négociable ;
   - plus de 180 caractères ;
   - méthode absente ;
   - question qui n'a pas de sens pour l'un des deux ;
   - demande d'un montant, d'un employeur, de papiers, d'un détail sur des
     enfants ou un ex ;
   - compromis sur un point non négociable ;
   - mention de l'âge, du genre ou de la ville ;
   - exemple de la consigne recopié ;
   - modèle culturel, religieux ou familial présenté comme allant de soi ou
     dépassé (famille élargie, dot, polygamie…), ou ethnie demandée.

   Un refus l'emporte toujours, même suivi d'une acceptation du même numéro.

   Il rend un verdict pour **chaque** proposition, jour par jour, et chaque
   jour est relu par une autre famille que celle de son rédacteur : une
   proposition sans verdict explicite n'est jamais servie. Il reçoit le
   contexte du couple, l'angle des jours et la liste des questions du Grand
   Entretien. Dans chaque créneau, il désigne la meilleure des deux
   propositions.
4. **Sécurité d'abord.** Un écart sur la violence ou les insultes reçoit
   toujours la question de limite écrite et vérifiée à l'avance, jamais une
   question de l'IA : le rédacteur n'écrit même pas de question pour ce thème.
   Les points non négociables (déclarés, critiques ou listés) sont nommés au
   rédacteur, et une proposition de compromis sur un tel thème est écartée par
   le code avant la relecture.
5. **Priorité à l'IA seulement si elle couvre au moins les deux tiers des
   créneaux** (14 sur 21), et jamais sans relecture. Sinon, les questions
   modèles de BOLIGO gardent la priorité sur les écarts réels.
6. **Contrôles du code qui s'appliquent toujours** :
   - une seule grille de forme pour les questions modèles et celles de l'IA :
     question ouverte, vouvoiement, ni ultimatum, ni morale, ni passé commun
     supposé, ni corps ou santé, ni détail sexuel, ni récit douloureux, ni
     demande intrusive (argent envoyé, partenaires passés, ancien conjoint,
     enfants, visa, ethnie, ville, lieu de travail…), ni jargon ;
   - question trop proche d'une question déjà posée à l'un des deux membres
     (12 derniers parcours) ou du même Sondeur : écartée ;
   - grille fixe : 21 questions, 7 thèmes chaque jour.
7. **Lectures et bilan ancrés dans les réponses.**
   - Chaque accord et chaque point à explorer cite le numéro de la question et
     deux extraits recopiés mot pour mot. Le code vérifie que ces extraits
     figurent vraiment dans les réponses, sinon le point est supprimé.
   - Un extrait doit porter un mot plein (« je suis de la » ne suffit pas) et
     compter 8 mots au plus. Les extraits sont conservés et montrés sous
     chaque point, dans la langue où ils ont été écrits.
   - Une réponse brève (moins de quatre mots) n'est ni un accord ni un écart :
     « ce point reste à préciser ».
   - Le code supprime aussi toute phrase qui interprète (« au fond… »), évalue
     ou prédit (« compatibles », « même longueur d'onde », « source de
     conflits »), propose un compromis sur un non-négociable, conseille de
     poursuivre ou d'arrêter, ou prête à un membre une émotion qu'il n'a pas
     écrite.
   - La consigne de lecture est distincte de celle des questions : décrire,
     comparer, citer ; une hypothèse ne s'écrit que sous forme de question.
   - Deux réponses qui emploient le même mot (« respect ») ne comptent pas comme
     un accord.
   - Puis le relecteur vérifie que rien n'est inventé, exagéré, attribué au
     mauvais membre ou présenté comme un diagnostic. Refusée ou non vérifiée, la
     lecture n'est pas publiée : la version des règles s'affiche.
8. **Pudeur.** Sous chaque question, l'app propose de répondre « J'aimerais en
   parler de vive voix ». Une telle réponse n'est jamais interprétée : la
   lecture signale seulement le sujet gardé pour la rencontre.
9. **Question d'approfondissement à part.** Après les jours 1 et 2, elle est
   rédigée dans un appel séparé, qui ne voit que les réponses et les écarts
   décrits. Le code contrôle sa forme, puis le relecteur choisit la meilleure
   des deux propositions. Elle ne touche jamais un thème de sécurité ni une
   journée déjà commencée.
10. **Sécurité à deux étages.**
    - **Premier étage, le code.** Il repère les signaux de danger dans chaque
      réponse, par catégorie : violence subie ou exercée, menace, contrôle
      (téléphone fouillé, passeport confisqué, proches interdits), détresse ou
      idées de mort, demande d'argent (Western Union, mobile money…), âge de
      moins de 18 ans. En français, registre africain, SMS, anglais et créole.
      Ne sont pas des signaux :
      - une limite écrite (« s'il levait la main sur moi, je partirais ») ;
      - un souvenir d'enfance dit comme tel ;
      - un idiome (« ce qui m'a frappé ») ;
      - un engagement associatif ou un métier (avocate, infirmier) ;
      - un modèle de couple choisi (« mon mari gère mon salaire, ça me
        convient »).

      Une menace ou un contrôle subis, racontés par la victime (« mon ex
      fouillait mon téléphone »), comptent comme une confidence de violence
      subie. Le code reconnaît les tournures courantes ; une phrase ambiguë
      peut encore être lue comme venant de l'auteur. Dans ce cas, la
      modération choisit la bonne catégorie dans le tableau de bord avant de
      décider. C'est aussi pourquoi le message d'aide envoyé pour une menace
      ou un contrôle est neutre : il ne présume ni victime ni auteur.
    - **Second étage, l'IA, dès l'envoi.** Sur un parcours payé, le relecteur
      haut de gamme lit chaque réponse au moment où elle est envoyée et
      repère ce que le code ne voit pas. Coût : environ 0,15 € par parcours
      (42 réponses courtes), pris sur l'enveloppe de 3 €. Sur un parcours non
      payé, c'est le modèle économique qui relit chaque réponse (moins d'un
      centime par parcours, dans le plafond mensuel) : la sécurité n'est pas
      réservée aux parcours payés. Une confidence de violence subie est relue
      aussi, car la même réponse peut contenir une menace ou venir de
      l'auteur.
      L'IA peut aussi lever une alerte dans la lecture du jour, dans le bilan
      et dans le contrôle de fidélité.
    - **IA lente ou en panne : fermé par défaut, payé ou non.** Au-delà de
      10 secondes, ou si l'IA ne répond pas, la réponse est enregistrée mais
      cachée à l'autre membre et signalée « classement en attente » ; la
      messagerie attend. Quand l'enveloppe de 3 € d'un parcours est épuisée,
      c'est le modèle économique (plafond mensuel) qui relit à la place du
      relecteur haut de gamme, pour ne pas geler le parcours. Si lui aussi est
      indisponible (plafond mensuel atteint, panne), toutes les réponses
      restent en attente : il faut surveiller le plafond mensuel.
      Elle est relue automatiquement, au plus toutes les 10 minutes. Relue
      sans danger, elle redevient visible et le signalement se clôt seul.
      Pendant une longue panne, l'équipe peut trancher à la main.
    - **Mesure.** Un corpus de non-régression (plus de 230 phrases, dont des
      phrases saines) fait échouer l'intégration si le repérage par le code
      tombe sous 95 % par catégorie, ou si une phrase saine retient la
      messagerie. Ces phrases ont servi à écrire les motifs : ce n'est pas un
      taux réel. Sur des phrases neuves écrites par des auditeurs
      indépendants, le code seul en repère environ la moitié (23 % au
      sixième contre-audit, 52 % au septième), moins en anglais et en créole.
      Le septième contre-audit a aussi montré que les motifs ajoutés
      retenaient à tort un tiers des phrases saines, surtout sur des sujets
      fréquents chez les membres africains (envois d'argent, montants en
      FCFA, ville d'Abidjan) : ces faux positifs ont été corrigés et ses 68
      phrases saines et 42 réponses de limite sont devenues des tests. Chaque
      correction est écrite à partir d'un corpus : seul le contre-audit
      suivant, sur des phrases neuves, donne le vrai taux.
      C'est la relecture de l'IA à l'envoi
      qui porte la sécurité d'un parcours payé ; son taux n'a pas encore été
      mesuré sur de vraies réponses. Le laboratoire IA contient quatre couples
      dont le danger est invisible pour le code, pour la mesurer. Seul un corpus de vraies réponses, annoté par des
      spécialistes, donnera un taux fiable (voir plus bas).
    - **Signalement.** Il part dès l'envoi de la réponse, et avant son
      enregistrement : si le signalement échoue, la réponse n'est pas
      enregistrée non plus. Un membre qui s'arrête en route n'y échappe pas.
      Il y a un signalement par réponse (le texte haché sert de clé), et une seule alerte
      de l'IA ouverte par membre. Une réponse refusée (insulte, proposition
      sexuelle, coordonnées), par le code comme par l'IA, est toujours
      signalée pour trace, avec les dangers que le code y voit : elle n'a
      jamais été montrée et ne retient pas la messagerie, sauf si elle
      évoque une menace, un contrôle ou un autre danger pour l'autre, auquel
      cas la messagerie attend la décision de l'équipe. Le simple nom d'une
      messagerie dans un récit (« il lisait mes messages WhatsApp ») n'est pas
      refusé.
    - **Ce qui se passe ensuite** :
      - aucune lecture ni question d'approfondissement par l'IA pour la
        journée ;
      - une lecture de sécurité s'affiche : rien n'est commenté, la liberté de
        chacun est rappelée, et aucune piste de premier message n'est donnée ;
      - la modération reçoit la ou les catégories et la réponse.
    - **Réponse cachée.** L'autre membre voit « Réponse disponible plus
      tard. » à la place de toutes les réponses de ce membre pour la
      journée, pour ne pas désigner la question en cause (une détresse est
      une donnée de santé). C'est fermé par défaut : le texte reste caché si
      le code y voit un danger, même sans signalement écrit, si l'IA n'a pas
      encore pu le relire, ou si une alerte de l'IA vise ce membre, jusqu'à
      ce que l'équipe tranche. Une confidence de violence subie seule n'est
      pas cachée ; elle l'est si l'IA y voit aussi une autre catégorie ou
      lève une alerte sur ce membre.
    - **Messagerie.** Un seul chemin du code l'ouvre, et un test le vérifie.
      Elle attend la décision de l'équipe. Seule exception : une confidence de
      violence subie, sans autre catégorie, ne retient pas la victime ; la
      lecture de sécurité dit alors « l'équipe en a été informée », sans
      promettre de vérification. Sur un parcours payé, la messagerie attend
      aussi les lectures de l'IA (ou leur troisième échec).
    - **Décision de l'équipe** (tableau de bord, page Signalements) :
      - **Fausse alerte** : la réponse redevient visible, la lecture de l'IA
        est écrite, et la messagerie s'ouvre si rien d'autre n'attend ;
      - **Confirmer** : le parcours est clos pour les deux membres et le
        crédit est rendu au membre mis en danger. Pour une détresse ou une
        minorité, où personne n'est en faute, les deux crédits sont rendus.
        Les deux membres sont prévenus sans que le motif soit donné. Pour
        une menace ou un contrôle, l'équipe choisit d'abord la catégorie
        (exercés par la personne qui écrit, ou violence subie) : une victime
        qui cite son agresseur ne doit pas être traitée en auteur.
    - **Parcours clos.** Un parcours arrêté (par un membre, l'anti-ghosting ou
      la modération) ne laisse plus passer aucun message, aucun signal
      « en train d'écrire », aucun accusé de lecture ni aucun appel ou refus
      d'appel : l'état du parcours est relu à chaque événement, sans cache.
      Les appels ne sonnent qu'à l'étape vidéo d'un parcours en cours.
    - **Ressources d'aide.** L'auteur de la réponse les reçoit en privé, sans
      commentaire :
      - détresse : le 3114 (France) ;
      - violences subies : le 3919 (France) ;
      - menace ou contrôle : un message neutre, ni victime ni auteur présumés ;
      - gestes violents : un message à l'auteur.

      Ailleurs, une association d'aide du pays, jamais la police seule (ce
      renvoi n'est pas sûr partout) ; en cas de danger immédiat, les secours.
      Une détresse n'est jamais effacée par une violence évoquée en même
      temps. Le code évite de renvoyer un message d'aide déjà reçu dans le
      parcours ; deux signalements arrivés au même instant peuvent encore en
      envoyer deux. Une alerte de
      l'IA sans membre désigné n'envoie aucun message. La notification ne
      montre jamais le contenu sur l'écran verrouillé.
    - **À valider par l'équipe** :
      - les ressources d'aide par pays, avec des associations locales ;
      - un délai de traitement des signalements de détresse, 24 h/24 ;
      - une analyse d'impact RGPD : la détresse est une donnée de santé, et
        la lecture de sécurité, visible des deux, révèle qu'un signal existe.
11. **Plancher de qualité.** En secours sur Groq, un parcours payé n'utilise
    jamais un petit modèle : sans grand modèle disponible, les questions
    modèles de BOLIGO s'affichent.
12. **Traçabilité.** Pour chaque question sont enregistrés son origine, sa
    méthode, sa cible, le rédacteur et le relecteur. Rien de tout cela n'est
    jamais envoyé à l'app.
13. **Températures basses** : 0,6 pour les questions, 0,3 pour les lectures,
    0 pour les relectures.

Ce qui est en place pour chaque **parcours payé** :

1. **Questions du Sondeur** : rédigées et relues comme ci-dessus. Si l'IA
   échoue, les questions modèles de BOLIGO complètent.
2. **Lecture du jour** : dès que les deux membres ont fini une journée, l'IA
   écrit une lecture visible par les deux :
   - une phrase qui décrit ce qu'ils ont exploré ;
   - jusqu'à 3 accords réels ;
   - jusqu'à 3 points à explorer, chacun ancré dans leurs réponses ;
   - une question ouverte pour en parler.
3. **Question d'approfondissement** pour les jours 2 et 3 :
   - elle remplace la question du même thème ;
   - le Sondeur garde toujours 21 questions, 7 par jour ;
   - dans l'app, elle porte la mention « Question écrite pour vous deux après
     la lecture de la journée précédente ».
4. **Bilan Harmonie** : à la fin des trois jours, quand le chat s'ouvre :
   - les accords ;
   - les sujets à aborder en priorité ;
   - trois premières questions possibles ;
   - un conseil pour le premier échange.

**Parcours sans paiement** : aucune rédaction par l'IA (questions, lectures,
bilan). Les questions modèles de BOLIGO et les lectures écrites par les règles
s'affichent. Seule la relecture de sécurité de chaque réponse passe par le
modèle économique, dans le plafond mensuel, avec la même règle « fermé par
défaut ». En pratique, chaque parcours accepté consomme un crédit : il est
payé tant que `AI_JOURNEY_BUDGET_EUR` est supérieur à 0.

Garde-fous sur les données :

- **Ce que l'IA reçoit** :
  - les écarts des deux entretiens ;
  - le prénom, l'âge, le genre et la ville de chaque membre ;
  - les questions et les réponses du Sondeur.

  Elle ne reçoit jamais l'e-mail, le téléphone ni une photo. Les réponses sont
  traitées comme des données : une consigne glissée dans une réponse est
  ignorée.
- **Contrôle du texte** : liens, adresses, numéros et insultes refusés ; un
  texte trop long est écarté plutôt que coupé.
- **Échec de l'IA** : la version des règles s'affiche, et l'IA est relancée au
  plus 3 fois, à 10 minutes d'écart.
- **Confidentialité** : une lecture n'existe que lorsque les deux membres ont
  répondu à toute la journée.
- **Effacement** : les lectures sont effacées avec le parcours, et donc avec le
  compte.
- **Accès** : un membre extérieur au parcours reçoit un refus (403).

## 3. Coût d'un parcours payé

Avec OpenRouter (clé `OPENROUTER_API_KEY`), le rédacteur est le meilleur Claude
ouvert au compte (Opus, puis Sonnet) et le relecteur le meilleur GPT (GPT-5.5,
puis GPT-5.1 et GPT-5). Les prix réels sont relus en direct sur OpenRouter.
Estimation aux prix d'Opus (≈ 5 $ par million de jetons lus, 25 $ écrits) et de
GPT-5.5 (≈ 5 $ / 30 $), en comptant 1 $ pour 1 € :

| Tâche | Appels | Coût estimé |
|---|---|---|
| Questions du Sondeur (3 jours, 2 propositions par créneau) | 3 | ≈ 0,35 € |
| Relecture du Sondeur, jour par jour (verdict pour chaque question) | 3 | ≈ 0,36 € |
| Lectures du jour | 3 | ≈ 0,12 € |
| Vérifications anti-invention (3 lectures + bilan) | 4 | ≈ 0,23 € |
| Questions d'approfondissement : rédaction et relecture | 4 | ≈ 0,29 € |
| Bilan Harmonie | 1 | ≈ 0,07 € |
| Relecture de sécurité de chaque réponse à l'envoi (21 × 2) | 42 | ≈ 0,15 € |
| **Total par parcours** | **60** | **≈ 1,55 €** |

Selon la longueur des réponses, le total va de **1,15 € à 1,75 €** environ.
Le relecteur et le rédacteur reçoivent la liste des questions du Grand
Entretien, pour ne jamais les reposer, et le relecteur réfléchit davantage avant
de juger : c'est le prix de la qualité. Le budget de **3 € par parcours** laisse
de la marge pour une relance après un échec.

Pour la recette d'un parcours (30 €, 15 € par membre), l'IA représente environ
5 %. Pour 1 000 000 de parcours payés : 1,15 à 1,75 million d'euros d'IA, pour
30 millions d'euros de recette.

Le Sondeur est préparé en arrière-plan dès que le parcours est accepté. Rédigé
puis relu, il prend une à trois minutes. Il est presque toujours prêt quand les
membres ouvrent l'application ; sinon, l'app recharge toute seule pendant
quatre minutes.

**Le laboratoire IA** (tableau de bord, administrateurs) rejoue le Sondeur avec
les vrais modèles sur 27 couples types fictifs : questions servies, propositions
écartées et pourquoi, lecture du jour, coût réel. Chaque couple porte une
référence indépendante des filtres (danger attendu ou non) : le laboratoire
compte les dangers manqués et les faux signaux. Comptez environ 1 € par couple
(plafonné à 1,50 €), compté dans la dépense IA du mois.

## Les limites de dépense

| Limite | Valeur par défaut | Où |
|---|---|---|
| Budget d'un parcours payé | 3 € | `AI_JOURNEY_BUDGET_EUR` |
| Plafond mensuel de tous les parcours payés | aucun | `AI_JOURNEY_MONTHLY_CAP_EUR` (facultatif) |
| Plafond mensuel du reste (modération…) | 10 € | `AI_MONTHLY_BUDGET_EUR` |
| Prix plafond d'un modèle OpenRouter | 15 $ lus / 75 $ écrits par million de jetons | `OPENROUTER_MAX_PRICE_PROMPT` / `_COMPLETION` |
| Plafond de la clé OpenRouter | à régler par vous | tableau de bord OpenRouter |

En clair :

- **3 € par parcours** : chaque parcours payé a sa propre enveloppe. Un parcours
  ne peut jamais coûter plus de 3 € d'IA, même en cas d'erreur ou de relance.
  Au-delà, la suite de ce parcours passe aux versions sans IA.
- **Pas de plafond mensuel global** : plus il y a de parcours payés, plus la
  dépense monte, toujours à moins de 3 € par parcours (1,55 € en moyenne). Pour en fixer un quand
  même, renseignez `AI_JOURNEY_MONTHLY_CAP_EUR` (par exemple `500`).
- **Le prix plafond ne bride pas la qualité.** Il laisse passer les meilleurs
  modèles (Claude Opus, GPT-5.5). Il écarte seulement les variantes « pro » ou
  « fast », facturées 6 à 30 fois plus cher pour la même qualité, et un modèle
  dont le prix exploserait.
- **Avant chaque appel**, le coût est estimé au prix du modèle le plus cher
  envisagé, avec une réponse de longueur maximale. Si l'appel ferait dépasser
  une limite, il n'est pas lancé.
- **Après chaque appel**, le coût réel facturé par OpenRouter est enregistré.
- **Modèles autorisés** :
  - jamais de modèle gratuit ;
  - uniquement des fournisseurs qui n'utilisent pas les données pour entraîner
    leurs modèles (réglage `data_collection: deny`).
- **Plafond sur la clé OpenRouter** : c'est un second verrou, indépendant de
  BOLIGO. Réglez-le dans le tableau de bord OpenRouter selon le nombre de
  parcours attendus, par exemple 2 € par parcours prévu dans le mois.

## 4. Plafond mensuel pour le reste

`AI_MONTHLY_BUDGET_EUR` (**10 €** par défaut, `0` coupe ces usages) couvre tout ce
qui n'est pas le suivi d'un parcours payé :

- la modération des messages longs ou suspects (modèle économique, réponse
  limitée à 400 jetons, température 0, mémoire de 5 000 décisions) ;
- le portrait par l'IA si `AI_PROFILE_MODE=ai`.

Chaque appel est estimé avant d'être lancé puis enregistré en base (table
`AiSpend`). Une fois le plafond atteint, chaque fonction passe à sa version sans
IA jusqu'au mois suivant.

Le tableau de bord (vue d'ensemble, administrateurs) affiche les deux
compteurs :

- « IA ce mois-ci » : le plafond mensuel ;
- « IA des parcours payés » : le suivi des parcours.

| Usage dans le plafond mensuel | Coût d'un appel | Appels pour 10 € |
|---|---|---|
| Modération d'un message long ou suspect | ≈ 0,0001 € | ≈ 80 000 |

## 5. Ce qui n'est pas de l'IA

À 1 000 000 d'inscrits, la dépense principale ne sera pas l'IA. Ce seront :

- l'hébergement de l'API (Render) ;
- la base de données (Supabase) ;
- l'envoi des e-mails.

Il faudra des offres payantes adaptées au volume, à prévoir à part.

## 6. Variables Render (service `Boligo-back`)

| Variable | Défaut | Effet |
|---|---|---|
| `OPENROUTER_API_KEY` | absente | active Claude (rédaction) et GPT (relecture) pour les parcours payés |
| `AI_JOURNEY_BUDGET_EUR` | `3` | budget IA de chaque parcours payé ; `0` coupe ce suivi |
| `AI_JOURNEY_MONTHLY_CAP_EUR` | aucun | plafond mensuel facultatif de tous les parcours payés |
| `OPENROUTER_QUALITY_MODEL` | Claude Opus (5.5 puis 5), puis Sonnet | rédacteur OpenRouter |
| `OPENROUTER_CRITIC_MODEL` | GPT-5.5, puis 5.1 et 5, puis Gemini 2.5 Pro | relecteur OpenRouter |
| `OPENROUTER_MAX_PRICE_PROMPT` / `_COMPLETION` | `15` / `75` | prix plafond d'un modèle, en dollars par million de jetons |
| `GROQ_QUALITY_MODEL` | gpt-oss-120b puis Llama 3.3 70B | rédacteur de secours sur Groq |
| `GROQ_CRITIC_MODEL` | Llama 3.3 70B puis gpt-oss-120b | relecteur de secours sur Groq |
| `AI_MONTHLY_BUDGET_EUR` | `10` | plafond mensuel du reste ; `0` coupe ces usages |
| `AI_PROFILE_MODE` | sans IA | `ai` pour faire rédiger les portraits par l'IA (dans le plafond mensuel) |
| `HARMONY_QUESTIONS_SOURCE` | `ai` | `bank` pour des questions du Sondeur sans IA |

Seule `OPENROUTER_API_KEY` est à ajouter ; les autres valeurs par défaut
conviennent. Si `AI_JOURNEY_BUDGET_EUR` ou `AI_JOURNEY_MONTHLY_CAP_EUR` ont été
renseignées sur Render avec les anciennes valeurs (1 € et 100 €), supprimez-les
pour revenir aux nouvelles.

Prix de référence : [eesel.ai — Groq pricing](https://eesel.ai/blog/groq-pricing),
[Trevor Fox — Llama 3.3 70B sur Groq](https://trevorfox.com/tools/calculators/llm-cost/groq/llama-3.3-70b/),
[Trevor Fox — gpt-oss-120b sur Groq](https://trevorfox.com/tools/calculators/llm-cost/groq/gpt-oss-120b/).
