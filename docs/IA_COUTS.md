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

**Les garde-fous contre les erreurs et les répétitions** :

1. **Relecture par une autre famille d'IA.** Le relecteur n'est jamais de la
   même famille que le rédacteur, pour ne pas reproduire ses erreurs :
   - avec OpenRouter : Claude Sonnet (Anthropic) rédige, GPT (OpenAI) relit ;
   - sans OpenRouter, ou en secours : gpt-oss-120b (OpenAI) rédige, Llama 3.3 70B
     (Meta) relit.

   Le relecteur refuse une question au moindre défaut :
   - question orientée, morale ou jugeante ;
   - jargon, étiquette ou diagnostic ;
   - corps, couleur de peau, santé, coordonnées ;
   - plusieurs idées ou question abstraite ;
   - répétition (même sens, autres mots) ;
   - question banale ;
   - faute de français, oubli du vouvoiement, ou question qui dit qui a répondu
     quoi ;
   - options manquantes, orientées ou qui se recoupent ;
   - fait sur le couple absent de l'analyse fournie (invention).

   Les questions refusées sont écartées.
2. **Priorité à l'IA seulement après relecture.** Les questions de l'IA passent
   avant les questions modèles de BOLIGO uniquement si la relecture a eu lieu et
   en garde au moins la moitié. Sinon, les questions modèles gardent la priorité
   sur les écarts réels.
3. **Contrôles faits par le code**, qui s'appliquent même si une IA se trompe :
   - jargon clinique interdit dans tout texte montré ;
   - question trop proche d'une question déjà posée à l'un des deux membres
     (12 derniers parcours) ou d'une autre question du même Sondeur : écartée ;
   - grille fixe : 21 questions, 7 thèmes chaque jour.
4. **Question d'approfondissement** : elle n'est posée que si le relecteur
   l'accepte et qu'elle ne ressemble à aucune question du Sondeur. Sinon, la
   question prévue reste en place.
5. **Aucune invention dans les lectures et le bilan.** Avant d'être montrée,
   chaque lecture est comparée par le relecteur aux réponses réelles. Elle est
   refusée si une seule phrase :
   - invente ou exagère un fait, un sentiment ou un souvenir ;
   - attribue à l'un la réponse de l'autre ;
   - présente une interprétation comme une vérité ou pose une étiquette ;
   - prédit l'avenir du couple ;
   - juge l'un des membres.

   Refusée ou non vérifiée, la lecture n'est pas publiée : la version des
   règles s'affiche. Les températures sont basses (0,6 pour les questions, 0,4
   pour les lectures, 0 pour les relectures) : moins de fantaisie, plus de
   fidélité.

Ce qui est en place pour chaque **parcours payé** :

1. **Questions du Sondeur** : rédigées avec ce regard clinique par le modèle
   « qualité », à partir des écarts réels des deux entretiens, puis relues. Si
   l'IA échoue, les questions modèles de BOLIGO complètent.
2. **Lecture du jour** : dès que les deux membres ont fini une journée, l'IA
   écrit une lecture visible par les deux :
   - une phrase de synthèse ;
   - jusqu'à 3 accords réels ;
   - jusqu'à 3 nuances à explorer ;
   - une question pour en parler.
3. **Question d'approfondissement** : après les jours 1 et 2, l'IA écrit une
   question qui approfondit l'écart le plus important.
   - Elle remplace la question du même thème de la journée suivante.
   - Elle ne remplace rien si un membre a déjà commencé cette journée.
   - Le Sondeur garde toujours 21 questions, 7 par jour.
   - Dans l'app, la question porte la mention « Question écrite pour vous deux
     après la lecture de la journée précédente ».
4. **Bilan Harmonie** : à la fin des trois jours, quand le chat s'ouvre :
   - les points forts ;
   - les sujets à aborder en priorité ;
   - trois premiers messages possibles ;
   - un conseil pour le premier échange.

Garde-fous :

- **Données** : l'IA reçoit les prénoms, les questions et les réponses du
  Sondeur, jamais l'e-mail ni le téléphone.
  - Les réponses sont traitées comme des données : une consigne glissée dans
    une réponse est ignorée.
- **Contrôle du texte de l'IA** : il est vérifié avant d'être montré.
  - Le format doit être correct.
  - Liens, adresses et numéros sont refusés, ainsi que les insultes, via le
    filtre de modération.
  - Un texte trop long est écarté plutôt que coupé.
- **Sans IA** (parcours non payé, IA indisponible, budget atteint) :
  - la lecture et le bilan sont rédigés par les règles ;
  - le bilan reprend les écarts des deux entretiens.
  - Après un échec, l'IA est relancée au plus 3 fois, à 10 minutes d'écart.
- **Confidentialité** : une lecture n'existe que lorsque les deux membres ont
  répondu à toute la journée, donc personne ne lit la réponse de l'autre avant
  d'avoir donné la sienne.
- **Effacement** : les lectures sont effacées avec le parcours, et donc avec le
  compte.
- **Accès** : un membre extérieur au parcours reçoit un refus (403).

## 3. Coût d'un parcours payé

Avec OpenRouter (clé `OPENROUTER_API_KEY`), le rédacteur est Claude Sonnet
(≈ 2 $ par million de jetons lus, 10 $ par million écrits) et le relecteur est
GPT (≈ 1,25 $ / 10 $). Les prix réels sont relus en direct sur OpenRouter.

| Tâche | Appels | Avec OpenRouter | Groq seul |
|---|---|---|---|
| Questions du Sondeur (hypothèses + 21 questions) | 1 | ≈ 0,043 € | ≈ 0,003 € |
| Relecture du Sondeur | 1 | ≈ 0,017 € | ≈ 0,003 € |
| Lectures du jour (avec la question d'approfondissement) | 3 | ≈ 0,036 € | ≈ 0,003 € |
| Vérification anti-invention (3 lectures + bilan) | 4 | ≈ 0,036 € | ≈ 0,003 € |
| Relecture des 2 questions d'approfondissement | 2 | ≈ 0,018 € | ≈ 0,002 € |
| Bilan Harmonie | 1 | ≈ 0,018 € | ≈ 0,001 € |
| **Total par parcours** | **12** | **≈ 0,17 €** | **≈ 0,015 €** |

Avec des réponses très longues (500 caractères chacune), le total avec
OpenRouter monte à ≈ 0,25 €.

**Un parcours payé coûte donc environ 0,17 à 0,25 € d'IA avec OpenRouter**
(1,5 à 2 centimes avec Groq seul), pour un budget autorisé de 1 €
(`AI_JOURNEY_BUDGET_EUR`) et une recette de 30 € (15 € par membre). Pour
1 000 000 de parcours payés : 170 000 € à 250 000 € avec OpenRouter, soit
moins de 1 % de la recette.

Le Sondeur est préparé en arrière-plan dès que le parcours est accepté : rédigé
puis relu, il prend environ une minute et il est prêt quand les membres ouvrent
l'application. Si ce n'est pas le cas, l'app recharge toute seule.

## Les limites de dépense

| Limite | Valeur par défaut | Où |
|---|---|---|
| Budget d'un parcours payé | 1 € | `AI_JOURNEY_BUDGET_EUR` |
| Plafond mensuel de tous les parcours payés | 100 € | `AI_JOURNEY_MONTHLY_CAP_EUR` |
| Plafond mensuel du reste (modération…) | 10 € | `AI_MONTHLY_BUDGET_EUR` |
| Prix plafond d'un modèle OpenRouter | 5 $ lus / 25 $ écrits par million de jetons | `OPENROUTER_MAX_PRICE_PROMPT` / `_COMPLETION` |
| Plafond de la clé OpenRouter | à régler par vous | tableau de bord OpenRouter |

Fonctionnement des limites :

- **Avant chaque appel** :
  - le coût est estimé au prix réel du modèle, avec une réponse de longueur
    maximale ;
  - si l'appel ferait dépasser une limite, il n'est pas lancé et la version
    sans IA prend le relais.
- **Après chaque appel** : le coût réel facturé par OpenRouter est enregistré,
  pas une estimation.
- **Modèles autorisés** :
  - jamais de modèle gratuit ;
  - uniquement des fournisseurs qui n'utilisent pas les données pour entraîner
    leurs modèles (réglage `data_collection: deny`) ;
  - jamais au-dessus du prix plafond : OpenRouter refuse lui-même tout
    fournisseur plus cher.
- **Plafond mensuel de 100 €** : il correspond à environ 500 parcours payés par
  mois avec OpenRouter, soit 15 000 € de recette.
  - À 80 % du plafond, un avertissement apparaît dans les journaux.
  - Au-delà, les parcours passent aux versions sans IA jusqu'au mois suivant.
  - Augmentez-le avec la croissance.
- **Plafond sur la clé OpenRouter** : à régler vous-même dans le tableau de bord
  OpenRouter, par exemple 100 $ par mois. C'est un second verrou, indépendant de
  BOLIGO.

## 4. Plafond mensuel pour le reste

`AI_MONTHLY_BUDGET_EUR` (**10 €** par défaut, `0` coupe ces usages) couvre tout ce
qui n'est pas le suivi d'un parcours payé :

- la modération des messages longs ou suspects (modèle économique, réponse
  limitée à 400 jetons, température 0, mémoire de 5 000 décisions) ;
- les questions du Sondeur d'un parcours sans paiement ;
- le portrait par l'IA si `AI_PROFILE_MODE=ai`.

Chaque appel est estimé avant d'être lancé puis enregistré en base (table
`AiSpend`). Une fois le plafond atteint, chaque fonction passe à sa version sans
IA jusqu'au mois suivant.

Les tarifs sont comptés au-dessus des prix publics de Groq : la dépense réelle
est toujours inférieure au compteur. Le tableau de bord (vue d'ensemble,
administrateurs) affiche les deux compteurs :

- « IA ce mois-ci » : le plafond mensuel ;
- « IA des parcours payés » : le suivi des parcours.

| Usage dans le plafond mensuel | Coût d'un appel | Appels pour 10 € |
|---|---|---|
| Modération d'un message long ou suspect | ≈ 0,0001 € | ≈ 80 000 |
| Questions du Sondeur d'un parcours sans paiement | ≈ 0,002 € | ≈ 5 000 |

## 5. Ce qui n'est pas de l'IA

À 1 000 000 d'inscrits, la dépense principale ne sera pas l'IA. Ce seront :

- l'hébergement de l'API (Render) ;
- la base de données (Supabase) ;
- l'envoi des e-mails.

Il faudra des offres payantes adaptées au volume, à prévoir à part.

## 6. Variables Render (service `Boligo-back`)

| Variable | Défaut | Effet |
|---|---|---|
| `AI_JOURNEY_BUDGET_EUR` | `1` | budget IA de chaque parcours payé ; `0` coupe ce suivi |
| `GROQ_QUALITY_MODEL` | gpt-oss-120b puis Llama 3.3 70B | rédacteur des parcours payés (un ou plusieurs, séparés par des virgules) |
| `GROQ_CRITIC_MODEL` | Llama 3.3 70B puis gpt-oss-120b | relecteur indépendant sur Groq (jamais de la même famille que le rédacteur) |
| `OPENROUTER_API_KEY` | absente | active Claude (rédaction) et GPT (relecture) pour les parcours payés |
| `OPENROUTER_QUALITY_MODEL` | Claude Sonnet (5.5, 5 puis 4.6) | rédacteur OpenRouter |
| `OPENROUTER_CRITIC_MODEL` | GPT (5.1 puis 5) puis Gemini 2.5 Pro | relecteur OpenRouter |
| `OPENROUTER_MAX_PRICE_PROMPT` / `_COMPLETION` | `5` / `25` | prix plafond d'un modèle, en dollars par million de jetons |
| `AI_JOURNEY_MONTHLY_CAP_EUR` | `100` | plafond mensuel de tous les parcours payés ; `0` coupe ce suivi |
| `AI_MONTHLY_BUDGET_EUR` | `10` | plafond mensuel du reste ; `0` coupe ces usages |
| `AI_PROFILE_MODE` | sans IA | `ai` pour faire rédiger les portraits par l'IA (dans le plafond mensuel) |
| `HARMONY_QUESTIONS_SOURCE` | `ai` | `bank` pour des questions du Sondeur sans IA |

Seule `OPENROUTER_API_KEY` est à ajouter pour passer à Claude et GPT ; les autres valeurs par défaut conviennent.

Prix de référence : [eesel.ai — Groq pricing](https://eesel.ai/blog/groq-pricing),
[Trevor Fox — Llama 3.3 70B sur Groq](https://trevorfox.com/tools/calculators/llm-cost/groq/llama-3.3-70b/),
[Trevor Fox — gpt-oss-120b sur Groq](https://trevorfox.com/tools/calculators/llm-cost/groq/gpt-oss-120b/).
