# Coût de l'IA chez BOLIGO : objectif 10 € pour 1 000 000 d'inscrits

## 1. Le constat

Un appel d'IA par membre coûte trop cher pour cet objectif :

| Usage | Taille d'un appel | Coût d'un appel (Groq, modèle le moins cher → modèle actuel) | Pour 1 000 000 de membres |
|---|---|---|---|
| Portrait rédigé par l'IA, à la fin de l'entretien | ≈ 5 000 jetons envoyés, ≈ 1 000 reçus | 0,0003 € → 0,001 € | **330 € à 1 000 €** |
| Objectif fixé | | 0,00001 € | **10 €** |

Même le modèle le moins cher coûte 33 fois trop. Un portrait rédigé par l'IA
pour chaque membre est donc incompatible avec 10 € pour 1 000 000 d'inscrits.

Et l'IA n'apportait presque rien au portrait. L'analyse du code montre qu'elle
ne produisait au final que deux éléments :

- le texte « À propos » ;
- un score d'« alchimie ».

Tout le reste du profil était déjà calculé par des règles, sans IA :

- la synthèse, les valeurs, les besoins, les lignes rouges, les trois mots et
  le profil relationnel ;
- les cartes des modules ;
- les pourcentages de compatibilité, les divergences et les sujets à aborder.

## 2. Ce qui est en place

1. **Le portrait est rédigé sans IA par défaut.**
   - Le texte « À propos » vient du moteur de rédaction de BOLIGO : il est
     fluide, à la première personne, fidèle aux réponses et sans phrase coupée.
   - Coût par membre : **0 €**, quel que soit le nombre d'inscrits.
   - La fin de l'entretien devient aussi immédiate. Avant, le membre pouvait
     attendre jusqu'à plusieurs dizaines de secondes que l'IA réponde.
   - Pour réactiver la rédaction par l'IA : variable Render
     `AI_PROFILE_MODE=ai`. Elle reste soumise au plafond (point 2).
2. **Plafond de dépense IA mensuel**, réglé par `AI_MONTHLY_BUDGET_EUR` (**10 €**
   par défaut, `0` coupe toute IA).
   - Chaque appel est estimé avant d'être lancé, puis sa consommation réelle est
     enregistrée en base (table `AiSpend`) : le compteur survit aux
     redémarrages.
   - Quand le plafond est atteint, chaque fonction passe à sa version sans IA
     jusqu'au mois suivant :
     - questions du Sondeur construites sur modèles ;
     - modération par le filtre local de mots et de liens.
   - Les tarifs sont comptés au-dessus des prix publics de Groq : la dépense
     réelle est toujours inférieure au compteur.
     - Si plusieurs appels partent en même temps, le dépassement possible est
       de quelques centimes.
     - Avec l'offre gratuite de Groq, la dépense réelle est nulle et le compteur
       sert de limite d'usage.
   - Le tableau de bord (vue d'ensemble, administrateurs) affiche la dépense du
     mois, le plafond et le nombre d'appels.
3. **Modération moins coûteuse et plus stable.**
   - Réponse limitée à 400 jetons au lieu de 4 096.
   - Température 0 : la même décision pour le même message.
   - Mémoire des décisions bornée à 5 000 messages : avec un million de membres,
     elle pouvait grossir sans limite.
   - Les messages courts et anodins ne passent toujours pas par l'IA.
4. **Sondeur** : le plafond de réponse d'OpenRouter passe de 2 500 à 4 000
   jetons. À 2 500, les 21 questions au format JSON étaient coupées et toujours
   rejetées.

## 3. Ce que permettent 10 € par mois

Chiffres au tarif compté (modèle actuel `openai/gpt-oss-20b`) :

| Usage | Coût d'un appel | Nombre d'appels pour 10 € |
|---|---|---|
| Portrait | 0 € (sans IA) | illimité |
| Questions du Sondeur (une fois par parcours) | ≈ 0,002 € | ≈ 5 000 parcours |
| Modération d'un message long ou suspect | ≈ 0,0001 € | ≈ 80 000 messages |

Au-delà, BOLIGO fonctionne entièrement sans IA, sans interruption de service.

## 4. Ce qui n'est pas de l'IA

À 1 000 000 d'inscrits, la dépense principale ne sera pas l'IA : ce seront
l'hébergement de l'API (Render), la base de données (Supabase) et l'envoi des
e-mails, qui demanderont des offres payantes adaptées au volume. Ces coûts
sont à prévoir à part.

## 5. Variables Render (service `Boligo-back`)

| Variable | Défaut | Effet |
|---|---|---|
| `AI_MONTHLY_BUDGET_EUR` | `10` | plafond de dépense IA par mois ; `0` coupe toute IA |
| `AI_PROFILE_MODE` | sans IA | `ai` pour faire rédiger les portraits par l'IA (dans le plafond) |
| `HARMONY_QUESTIONS_SOURCE` | `ai` | `bank` pour un Sondeur sans IA |
