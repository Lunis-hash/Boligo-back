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

Ce qui est en place pour chaque **parcours payé** :

1. **Questions du Sondeur** : rédigées par le modèle « qualité », à partir des
   écarts réels des deux entretiens. Les gabarits de BOLIGO gardent la priorité
   sur les écarts nets et complètent si l'IA échoue.
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

Le modèle « qualité » est `openai/gpt-oss-120b` (0,15 $ par million de jetons
lus, 0,60 $ par million écrits), puis `llama-3.3-70b-versatile` s'il n'est pas
disponible.

| Tâche | Appels | Jetons lus / écrits par appel | Coût |
|---|---|---|---|
| Questions du Sondeur | 1 | ≈ 3 000 / 3 000 | ≈ 0,002 € |
| Lectures du jour (avec la question d'approfondissement) | 3 | ≈ 1 500 / 650 | ≈ 0,002 € |
| Bilan Harmonie | 1 | ≈ 3 500 / 800 | ≈ 0,001 € |
| **Total par parcours** | **5** | | **≈ 0,005 €** |

Avec des réponses très longues (500 caractères chacune), le total monte à
≈ 0,01 €. Avec Llama 3.3 70B, il est d'environ 0,01 €.

**Un parcours payé coûte donc environ 0,5 à 1 centime d'IA**, pour un budget
autorisé de 1 € (`AI_JOURNEY_BUDGET_EUR`) et une recette de 30 € (15 € par
membre). Pour 1 000 000 de parcours payés : 5 000 € à 10 000 € d'IA.

Le budget de 1 € par parcours est un plafond de sécurité : chaque appel est
estimé avant d'être lancé (réponse de longueur maximale) puis compté au réel
dans `Journey.aiCostMicroEur`.

- Un appel qui dépasserait le budget n'est pas lancé : la version sans IA prend
  le relais.
- Ces dépenses sont comptées à part, sans entamer le plafond mensuel de 10 €
  qui couvre le reste.
- Un parcours est « payé » quand au moins un crédit a été dépensé pour lui.

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
| `GROQ_QUALITY_MODEL` | gpt-oss-120b puis Llama 3.3 70B | modèle des parcours payés (un ou plusieurs, séparés par des virgules) |
| `AI_MONTHLY_BUDGET_EUR` | `10` | plafond mensuel du reste ; `0` coupe ces usages |
| `AI_PROFILE_MODE` | sans IA | `ai` pour faire rédiger les portraits par l'IA (dans le plafond mensuel) |
| `HARMONY_QUESTIONS_SOURCE` | `ai` | `bank` pour des questions du Sondeur sans IA |

Aucune variable n'est à ajouter : les valeurs par défaut conviennent.

Prix de référence : [eesel.ai — Groq pricing](https://eesel.ai/blog/groq-pricing),
[Trevor Fox — Llama 3.3 70B sur Groq](https://trevorfox.com/tools/calculators/llm-cost/groq/llama-3.3-70b/),
[Trevor Fox — gpt-oss-120b sur Groq](https://trevorfox.com/tools/calculators/llm-cost/groq/gpt-oss-120b/).
