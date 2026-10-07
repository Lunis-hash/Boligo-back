# Coût réel d'un parcours Harmonie

Document interne de BOLIGO, 7 octobre 2026. Chiffres tirés du code et des
grilles publiques des prestataires à cette date ; à revoir si un prix change.

## 1. Recette

Chaque membre paie **15 € TTC** (un crédit), soit **30 € TTC par parcours**
(`src/payment/payment.service.ts`, `amount: 1500`). Ce sont deux paiements
Stripe distincts.

## 2. Ce que coûte un parcours

| Poste | Membres en France (carte UE) | Membres hors UE (carte internationale) |
|---|---|---|
| TVA comprise dans le prix | 5,00 € (20 % de 25 € HT) | selon le pays : voir docs/FACTURATION_TVA.md |
| Frais Stripe, 2 paiements | 0,95 € (1,5 % + 0,25 € chacun) | 1,48 € (3,25 % + 0,25 € chacun) |
| IA du parcours (rédaction, relecture, lectures, bilan, sécurité) | 1,55 € en moyenne (1,15 à 1,75 €) | idem |
| Appel vidéo de 7 minutes (2 personnes, 14 minutes-participant) | 0,05 € (gratuit sous 10 000 minutes par mois) | idem |
| Modération du chat, e-mails, notifications | moins de 0,01 € | idem |
| **Total des coûts variables, hors TVA** | **≈ 2,55 €** | **≈ 3,08 €** |
| **Reste pour BOLIGO, sur 25 € HT** | **≈ 22,45 €** | voir la note TVA |

Plafond garanti par le code : l'IA d'un parcours ne dépasse jamais **3 €**
(`AI_JOURNEY_BUDGET_EUR`). Dans le pire cas (IA à 3 €, cartes
internationales), les coûts variables restent sous **4,55 €**.

Ne sont pas comptés ici, car ils ne dépendent pas du nombre de parcours :
l'hébergement (Render, Supabase), le nom de domaine, la messagerie, la
comptabilité, l'astreinte de modération.

## 3. Cas particuliers

- **Parcours offert par un code promo** : la recette est nulle mais l'IA
  coûte autant (≈ 1,55 €). Un code à 100 % coûte donc environ 1,60 € par
  parcours, plus la vidéo.
- **Parcours clos après un signalement confirmé** : le crédit est rendu au
  membre mis en danger, et les deux en cas de détresse ou de mineur. L'IA déjà
  dépensée reste à la charge de BOLIGO.
- **Remboursement Stripe** : Stripe ne rend pas ses frais fixes sur un
  remboursement.

## 4. Le Grand Entretien est gratuit, et sans IA

Vérifié dans le code le 7 octobre 2026 :

- aucun paiement ni crédit n'est demandé pour passer l'entretien
  (`src/interview` ne lit ni crédit ni paiement) ;
- la seule fonction d'IA appelée depuis l'entretien est
  `generateProfileSynthesis` (`src/ai/ai.service.ts`), qui rédige le portrait
  **par des règles, sans IA**, tant que `AI_PROFILE_MODE` n'est pas réglé sur
  `ai` (vide par défaut) ;
- les scores de compatibilité sont calculés par des règles
  (`src/matching`), sans IA.

Coût de l'IA pour le Grand Entretien : **0 €**, quel que soit le nombre
d'inscrits.

**Pourquoi pas une IA gratuite ?** Les offres gratuites d'IA peuvent conserver
les textes ou s'en servir pour entraîner leurs modèles. Les réponses à
l'entretien touchent à la vie intime, à la religion et aux violences subies
(données sensibles, art. 9 du RGPD). Les envoyer à une IA gratuite exposerait
les membres et BOLIGO. Le code refuse donc tout modèle gratuit
(`src/ai/openrouter.config.ts`). Les règles actuelles font le même travail
pour 0 €.

À vérifier sur Render : la variable `AI_PROFILE_MODE` doit rester vide.

## Sources

- Tarifs Stripe France : https://stripe.com/fr/pricing
- Tarifs Daily : https://www.daily.co/pricing/video-sdk/
- Coût de l'IA par tâche : docs/IA_COUTS.md, section 3
