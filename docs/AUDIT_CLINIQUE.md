# Audit clinique des questionnaires BOLIGO

6 octobre 2026. Deux audits indépendants, en lecture seule, détaillés en annexe :

- [Grand Entretien](audit-clinique/grand-entretien.md) : 139 questions, 11 modules ;
- [Sondeur](audit-clinique/sondeur.md) : 175 gabarits, consignes de l'IA, lectures du jour.
  Il s'appuie sur une simulation de 900 parcours avec le vrai code d'assemblage.

## 1. Verdict : pas encore « ultra clinique »

| Partie | Note | En une phrase |
|---|---|---|
| Grand Entretien | 5,5 / 10 | Les bons concepts (attachement, Gottman, cinq traits, régulation des émotions), mais une mesure trop mince : souvent une seule question pour décider d'une divergence majeure. |
| Gabarits du Sondeur | 4 / 10 | Ils redemandent surtout des positions déjà connues, au lieu d'explorer leur sens et la façon de les vivre. |
| Consigne clinique de l'IA | 6 / 10 | Bonne base multi-écoles, mais trop générale. Elle supposait que les deux membres se connaissent déjà. |

**Ce qui est déjà solide** :

- les cadres choisis ;
- l'ancrage culturel (religion, famille, argent envoyé à la famille) ;
- l'éthique : pas de diagnostic, pas de question sur le corps ;
- les questions sur la famille d'origine dans le Sondeur ;
- le thème « communication et émotions ».

## 2. Corrigé le 6 octobre (sécurité et erreurs)

Les défauts vérifiés par une nouvelle simulation de 300 parcours (6 300 questions) :

| Défaut | Avant | Après |
|---|---|---|
| Violence physique traitée comme un écart à « rendre vivable » | présent | 0. À la place, des questions de limite : « à quel moment ne seriez-vous plus en sécurité ? », « qui vous a appris à vous disputer sans vous faire de mal ? », « quel signal pour arrêter ? » |
| Questions grammaticalement cassées (« sur « même réponse sur « … » » ») | 227 | 0 |
| Scores d'échelle cités comme des réponses (« Se fermer en dispute : très marqué ») | 97 | 0 |
| Aveux d'entretien (auto-évaluations) cités à l'autre membre | présent | jamais cités |
| Consigne de l'IA : « comment votre partenaire décrirait-il… » à deux inconnus | présent | « comment un proche qui vous connaît bien… » ; contexte « vous ne vous êtes encore jamais parlé » |
| Questions de l'IA servies sans relecture (parcours sans paiement) | possible | jamais |
| Relecteur | 9 règles | 12 règles : passé commun supposé, sécurité négociée, score ou aveu cité |

## 3. Ce que je propose pour atteindre la précision clinique

Trois étapes, de la plus rentable à la plus lourde. Les exemples et le coût de
chaque point sont dans les annexes.

### Étape 1 : rapide (1 à 2 jours), Sondeur et IA

1. **Questions « même mot, même sens ? »** C'est la technique la plus révélatrice
   pour deux personnes qui se croient d'accord, et elle est absente aujourd'hui.
   Exemple : « Vous vous dites tous les deux pratiquant(e)s. Dans une semaine
   ordinaire, qu'est-ce que cela change concrètement à votre emploi du temps ? »
2. **Consigne de l'IA réécrite.** La technique est choisie selon le signal
   observé. Les sujets imposés trop banals et l'exigence d'options disparaissent.
3. **Relecteur durci.** 14 règles, il reçoit la méthode et la cible de chaque
   question, et doit en garder au moins deux tiers.
4. **Lectures du jour ancrées.** Chaque point doit citer la réponse sur laquelle
   il s'appuie, et le code vérifie que la citation existe vraiment.
5. **Grand Entretien.** Correction des fausses incompatibilités :
   - « les tentations existent » face à « fidélité absolue » est classé critique ;
   - tabac, alcool et substances sont dans une même question ;
   - une même question est comptée deux fois.

   Plus une dizaine de gains rapides (options manquantes, doublons, zone neutre
   pour l'attachement).

### Étape 2 : 1 semaine, le Sondeur devient un vrai entretien clinique

6. **Supprimer la citation mécanique des deux réponses.** La question porte sur
   le sens, plus sur l'écart lui-même, et elle reste courte, sans guillemets.
7. **Questions ouvertes.** Les options ne sont jamais affichées dans l'app : les
   questions fermées s'ouvrent.
8. **Une soixantaine de nouvelles formulations**, couvrant les techniques
   manquantes, adaptées à deux inconnus :
   - échelle ;
   - exception ;
   - question miracle ;
   - besoin caché ;
   - réparation après une dispute ;
   - problème qui revient toujours ;
   - question circulaire par un proche.
9. **Pudeur graduée.** Sous chaque question : « Vous pouvez aussi écrire :
   J'aimerais en parler de vive voix. » Les questions les plus intimes sont
   gardées pour le jour 3.

### Étape 3 : 1 à 2 semaines, Grand Entretien V7

10. **Déclarer ce qui est non négociable.** C'est ce qui permet enfin de
    distinguer une vraie divergence d'une nuance.
11. **Religion en trois questions** : appartenance, pratique, attente de
    conversion. Le croyant non pratiquant n'a aujourd'hui aucune réponse.
12. **Échelles plus longues** là où une seule affirmation décide d'une
    divergence majeure (attachement, quatre cavaliers).
13. **Nouveaux thèmes** :
    - le cycle « l'un relance, l'autre se ferme » ;
    - l'intimité avant le mariage et l'écart de désir ;
    - ce que chacun appelle « tromper » ;
    - la famille d'origine et la capacité à garder sa position ;
    - le versant positif de Gottman ;
    - la hiérarchie des valeurs de vie.

## 4. À trancher par vous (hors clinique)

- **Questionnaires protégés.**
  - M7_Q09 à M7_Q18 reprennent presque mot pour mot les dix items d'un
    questionnaire de personnalité connu (BFI-10).
  - M2_Q13 à M2_Q16 sont proches d'un questionnaire d'attachement (ECR-R).
  - Ces outils sont libres pour la recherche, pas forcément pour un usage
    commercial : à faire vérifier par un juriste. Les réécrire en situations
    concrètes (étape 3) règle la question et améliore la mesure.
- **RGPD, article 9.** La religion (M1_Q05, M1_Q06) et la vie sexuelle (M6_Q06 à
  M6_Q08) sont des données sensibles, qui demandent un consentement explicite au
  moment de répondre. La question sur les violences subies (M3_Q08) doit avoir
  une finalité justifiée, ou être retirée.
- **Violence « selon les circonstances ».** Un membre qui répond « ça dépend des
  circonstances » sur la violence physique ne produit aujourd'hui qu'une
  divergence « majeure ». Faut-il en faire un critère d'incompatibilité
  automatique ?
