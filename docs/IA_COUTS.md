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
   défaut, selon 14 règles :
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
   - méthode absente.

   Dans chaque créneau, il désigne la meilleure des deux propositions.
4. **Sécurité d'abord.** Un écart sur la violence ou les insultes reçoit
   toujours la question de limite écrite et vérifiée à l'avance, jamais une
   question de l'IA.
5. **Priorité à l'IA seulement si elle couvre au moins les deux tiers des
   créneaux** (14 sur 21), et jamais sans relecture. Sinon, les questions
   modèles de BOLIGO gardent la priorité sur les écarts réels.
6. **Contrôles du code qui s'appliquent toujours** :
   - question trop proche d'une question déjà posée à l'un des deux membres
     (12 derniers parcours) ou du même Sondeur : écartée ;
   - grille fixe : 21 questions, 7 thèmes chaque jour.
7. **Lectures et bilan ancrés dans les réponses.**
   - Chaque accord et chaque point à explorer cite le numéro de la question et
     deux extraits recopiés mot pour mot. Le code vérifie que ces extraits
     figurent vraiment dans les réponses, sinon le point est supprimé.
   - Le code supprime aussi toute phrase qui interprète (« au fond… »), évalue
     la relation (« compatibles », « prometteuse ») ou prête une émotion à un
     prénom (« Karim semble craindre… »).
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
10. **Températures basses** : 0,6 pour les questions, 0,3 pour les lectures,
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

**Parcours sans paiement** : aucun appel d'IA pour le Sondeur. Les questions
modèles de BOLIGO et les lectures écrites par les règles s'affichent.

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
| Questions du Sondeur (3 jours, 2 propositions par créneau) | 3 | ≈ 0,26 € |
| Relecture du Sondeur (42 propositions) | 1 | ≈ 0,07 € |
| Lectures du jour | 3 | ≈ 0,12 € |
| Vérifications anti-invention (3 lectures + bilan) | 4 | ≈ 0,13 € |
| Questions d'approfondissement : rédaction et relecture | 4 | ≈ 0,16 € |
| Bilan Harmonie | 1 | ≈ 0,07 € |
| **Total par parcours** | **16** | **≈ 0,80 €** |

Selon la longueur des réponses, le total va de **0,60 € à 0,90 €** environ.
Une relance après un échec peut l'augmenter un peu : le budget de **3 € par
parcours** laisse une large marge.

Pour la recette d'un parcours (30 €, 15 € par membre), l'IA représente donc
environ 3 %. Pour 1 000 000 de parcours payés, cela fait 600 000 € à 900 000 €
d'IA, pour 30 millions d'euros de recette.

Le Sondeur est préparé en arrière-plan dès que le parcours est accepté. Rédigé
puis relu, il prend une à trois minutes. Il est presque toujours prêt quand les
membres ouvrent l'application ; sinon, l'app recharge toute seule pendant
quatre minutes.

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
  dépense monte, toujours à moins de 3 € par parcours. Pour en fixer un quand
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
  parcours attendus, par exemple 1 € par parcours prévu dans le mois.

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
