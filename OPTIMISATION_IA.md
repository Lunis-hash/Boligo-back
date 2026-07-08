# Optimisation des coûts IA (Groq)

## Où l’IA est appelée

| Moment | Fréquence | Cache / optimisation |
|--------|-----------|----------------------|
| Fin d’entretien → carte mentale | 1× / utilisateur | Résultat en base, jamais regénéré |
| Questions Sondeur couple | 1× / journey | En base après 1er chargement |
| Modération message | Chaque message | Filtre local **toujours** ; Groq **si besoin** |
| Sélection questions banque (fallback) | Rare | — |

## Modération messages (économie ~60–80 %)

1. **Liste de mots** côté serveur (gratuit, instantané).
2. **Groq** seulement si `shouldRunAiModeration()` :
   - mots à risque détectés,
   - lien URL,
   - message long (> 120 caractères ou ≥ 18 mots).
3. **Cache mémoire 1 h** : même texte = pas de second appel Groq.

Messages courts type « Bonjour, comment vas-tu ? » → **0 appel Groq**.

## Carte mentale

- Un seul appel après les 11 modules.
- Pas de regénération à chaque ouverture profil.

## Matching Discover

- Score calculé **sans IA** (`compatibility.scorer.ts`) à partir des cartes mentales.
- Tri des profils par % décroissant.

## Pistes futures

- Stocker les `signals` du questionnaire dans `MentalMap.signals` → score encore plus fin sans Groq.
- Groq uniquement pour explication texte « Pourquoi ce match » (optionnel, 1× par proposition).
