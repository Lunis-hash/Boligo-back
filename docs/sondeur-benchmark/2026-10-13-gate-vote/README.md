# Seuil de 99 % — NOUVEAU lot final tenu à l'écart (mesuré une seule fois)

Corpus `corpus-heldout2/corpus.json` : 290 questions étiquetées (150 fautives, 140 valides ; 75 % FR, 25 % EN ; 26 fautes présentes seulement dans la version anglaise), couples inédits T90xxx (graines 90 000). Le corpus a été rédigé par un annotateur indépendant (agent séparé, sans accès au code ni aux règles) et commité (32c978e) avant toute mesure. Couples synthétiques uniquement. Dépense : 0,072 $.

Chaîne mesurée (routeur `config/sondeur-models.json`) : rédacteur Sonnet 5.5 → contrôle déterministe → relecteur GLM 5.3 Flash → second avis GPT‑5.6 Luna sur chaque refus (refus maintenu seulement si le second refuse aussi, pour une faute nette citée mot pour mot).

| Chaîne | Fautives rejetées | Valides acceptées | Fuites acceptées |
|---|---|---|---|
| Contrôle seul | 82,0 % | 70,0 % | 3 |
| Contrôle + relecteur + second avis | **98,0 %** | **58,6 %** | **1** |
| Cible | ≥ 99 % | ≥ 90 % | 0 |

**Cible non atteinte**, aucun réglage fait sur ce lot.

Fautives qui passent toute la chaîne (3) : 1 fuite de réponse, 1 hypothèse retournée, 1 présupposé.
Valides refusées (58) :
- par le contrôle (42) : forme P8 17, compromis sur un non-négociable 6, possessif P13 6, lien à l'écart P17 6, EN4 3, P14 2, P7 2 ;
- par la relecture (16) : règle 12 (compromis sur un non-négociable) 12, règles 3, 5, 6 : 4.
Second avis : 7 refus annulés sur 47.

Lecture : une grande partie des refus de questions valides vient de la règle « aucun arrangement sur un point non négociable » (18 sur 58), que l'annotateur a jugée trop stricte pour des questions du type « combien de… accepteriez-vous ». C'est un choix produit à trancher, pas un réglage à faire sur ce lot.

Historique :
- ancien lot final (consommé, mesure corrigée) : contrôle seul 75,2 % / 58,3 %, chaîne 97,3 % / 47,5 %, 0 fuite ;
- mise au point après réglage (`2026-10-13-gate-vote-dev`) : contrôle seul 94,6 % / 90,4 %, 0 fuite.
