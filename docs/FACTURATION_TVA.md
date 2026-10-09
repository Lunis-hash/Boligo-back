# Paiement, factures et TVA

Document interne de BOLIGO, 7 octobre 2026. Il décrit ce que fait le code et
ce qui reste à décider. **Les règles fiscales sont à valider par
l'expert-comptable, les points juridiques par un avocat.** Stripe reste en
mode test : aucun paiement réel n'a été fait.

## 1. Ce qui est en place

| Sujet | Ce que fait BOLIGO | Réglage |
|---|---|---|
| Prix | 15,00 € TTC par membre, affiché « TTC » dans l'app et sur le bouton « Payer 15,00 € TTC » | — |
| Demande de commencement | Case non cochée au départ, obligatoire pour payer. Le serveur garde la date et la version du texte | `BILLING_EARLY_START_CONSENT_REQUIRED` |
| Adresse de facturation | Nom et adresse relevés sur la feuille de paiement Stripe | `BILLING_ADDRESS_REQUIRED` |
| Facture | Une facture Stripe par paiement : numéro, TVA du pays, mentions légales, payée hors Stripe. Création unique, même en cas de nouvel essai | toujours |
| TVA | Règle locale (section 3), ou Stripe Tax une fois les enregistrements faits | `BILLING_STRIPE_TAX` |
| Registre | Paiements, factures et avoirs gardés 10 ans en base, même après la suppression du compte | `BILLING_ENABLED` |
| Remboursement | Avoir automatique, crédit retiré s'il n'a pas servi, trace dans le journal des crédits | `BILLING_ENABLED` |
| Litige bancaire | Paiement marqué « contesté », e-mail à l'équipe | `BILLING_ALERT_EMAILS` |
| Rétractation | Bouton « Se rétracter du contrat ici » (Profil, Mes achats et factures) pendant 14 jours, accusé de réception par e-mail, décision et remboursement depuis le tableau de bord | `BILLING_ENABLED` |
| Reçu par e-mail | Montant TTC, part de TVA, numéro de facture, rappel de la demande de commencement et de la rétractation, identité du vendeur | `BILLING_SELLER_*` |
| Comptabilité | Journal des ventes (CSV) : date, numéro, pays, régime et taux de TVA, HT, TVA, TTC, avoirs en négatif | tableau de bord, Facturation |
| Partenaires | Les ventes payées avec un code partenaire comptent enfin dans les commissions ; un achat remboursé n'en donne plus | toujours |

Sur le site web, le paiement passe par la page Stripe Checkout : même prix,
même demande de commencement, même crédit (webhook `payment_intent.succeeded`
ou vérification au retour dans l'app). Adresse de retour : `WEB_APP_URL`
(par défaut https://boligo-web.onrender.com).

Corrections faites en passant :
- le faux numéro de TVA et l'adresse écrite en dur ont été retirés du reçu ;
- l'adresse e-mail du membre n'est plus écrite dans les journaux ;
- la feuille de paiement montre le vrai nom du membre au lieu de « Client BOLIGO ».

## 2. Parcours d'un paiement

1. Le membre coche la demande de commencement, puis paie sur la feuille Stripe
   (carte, nom, adresse).
2. Le serveur relit le paiement chez Stripe et crédite le compte une seule
   fois, que la confirmation vienne de l'app ou du webhook.
3. Il détermine le pays du client, puis la TVA :
   - le pays vient de l'adresse de facturation, sinon du lieu du profil ;
   - le pays de la carte est gardé comme seconde preuve ;
   - si les deux pays diffèrent, une alerte part dans les journaux.
4. Il émet la facture chez Stripe et l'enregistre. En cas d'échec, une
   relance a lieu toutes les 15 minutes ; au bout de 8 essais, l'équipe est
   prévenue.
5. Le reçu part par e-mail. La facture se télécharge depuis l'app.

Un remboursement fait depuis Stripe ou depuis le tableau de bord produit un
avoir rattaché à la facture. Le crédit n'est retiré que s'il n'a pas servi.

## 3. TVA appliquée sans Stripe Tax

Prix toujours 15,00 € TTC : seule la part de TVA change.

| Pays du client | TVA sur la facture | Mention |
|---|---|---|
| France, Monaco | 20 % (2,50 €) | — |
| Guadeloupe, Martinique, La Réunion | 8,5 % (1,18 €) | — |
| Guyane, Mayotte | aucune | TVA non applicable, art. 294 du CGI |
| Autre pays de l'UE, tant que les ventes à distance dans l'UE restent sous 10 000 € HT par an | 20 % française | — |
| Hors UE (Afrique, Royaume-Uni, Suisse, Canada, États-Unis…) | aucune TVA française | TVA non applicable, art. 259 B du CGI |
| Franchise en base (si l'entreprise y est) | aucune | TVA non applicable, art. 293 B du CGI |

**Dès que les ventes à distance dans l'UE dépassent 10 000 € HT par an**,
la TVA est due dans le pays du client. Il faut alors :
- s'inscrire au guichet unique OSS (impots.gouv) ;
- déclarer cette inscription dans Stripe ;
- activer `BILLING_STRIPE_TAX`.

Stripe calcule alors le bon taux pays par pays, et le journal des ventes sert
à la déclaration OSS trimestrielle.

## 4. TVA locale hors UE

Plusieurs pays taxent les services numériques vendus par une entreprise
étrangère à leurs habitants, souvent dès la première vente. Stripe Tax ne
calcule cette taxe que dans les pays où BOLIGO est enregistré. Tant que ce
n'est pas fait, la facture ne porte pas de taxe locale.

Certitude : E élevée, M moyenne, F faible. Tout ce qui n'est pas E est à
vérifier avec un fiscaliste avant d'ouvrir la vente dans le pays.

| Pays | Taux | Seuil | Depuis | Stripe Tax | Cert. |
|---|---|---|---|---|---|
| Royaume-Uni | 20 % | aucun : dès la 1re vente | 2015 | oui | E |
| Suisse | 8,1 % | 100 000 CHF de chiffre d'affaires mondial | 2019 | oui | E |
| Norvège | 25 % | 50 000 NOK | 2011 | oui | E |
| Canada | TPS 5 %, TVH 13 à 15 %, TVQ 9,975 % | 30 000 CAD sur 12 mois | 2021 (Québec 2019) | oui | E (fédéral) |
| États-Unis | selon l'État | souvent 100 000 $ par État | — | oui | M |
| Sénégal | 18 % | aucun connu | 1er juillet 2024 | oui | E |
| Côte d'Ivoire | 18 % | aucun | 2022, précisé en 2023 | non confirmé | M |
| Cameroun | 19,25 % | aucun | loi de finances 2020 | oui | M |
| Bénin | 18 % | aucun | 1er octobre 2023 | oui | M |
| Burkina Faso | 18 % | aucun connu | 1er janvier 2025 | oui | M |
| Togo | 18 % | aucun connu | 19 février 2026 | ? | M |
| Maroc | 20 % | aucun connu | 11 juin 2026 | ? | M |
| Congo (Brazzaville) | 18 % | aucun | 1er juillet 2026 | ? | M |
| Gabon | 18 % | aucun | 2026 | ? | F |
| Algérie | 19 %, représentant fiscal | aucun | 2022 | ? | F |
| RD Congo, Mali, Guinée, Tunisie, Haïti | règle générale ou régime non trouvé | ? | ? | ? | F |

Sources détaillées : rapport d'audit de la facturation du 7 octobre 2026
(Stripe, administrations fiscales, cabinets spécialisés).

**À décider** : vendre partout dès le départ (et s'enregistrer dans chaque
pays concerné), ou ouvrir la vente pays par pays.

## 5. Réglages à faire dans le tableau de bord Stripe (propriétaire)

1. Activer le compte BOLIGO (identité, SIREN, IBAN). Ne jamais utiliser un
   autre compte Stripe.
2. Paramètres, Factures :
   - numérotation **sur tout le compte**, avec un préfixe BOLIGO, avant la
     première facture réelle ;
   - langue française et logo ;
   - numéro de TVA du compte.
3. Tax :
   - adresse d'origine ;
   - code par défaut `txcd_10000000` (service fourni par voie électronique) ;
   - prix « taxe incluse » ;
   - enregistrements (France, OSS, puis chaque pays ouvert à la vente).
4. Webhooks, abonner l'adresse `/api/payment/webhook` à :
   - `payment_intent.succeeded` ;
   - `charge.refunded` ;
   - `charge.dispute.created` et `charge.dispute.closed`.
5. E-mails clients : reçus et avoirs.

## 6. Ordre d'activation

1. Appliquer `prisma/sql/2026-10-07_facturation.sql` sur la base BOLIGO,
   **avant** le déploiement.
2. Renseigner `BILLING_SELLER_*`, `BILLING_MEDIATOR` et `BILLING_ALERT_EMAILS`
   sur Render.
3. `BILLING_ENABLED=true`. Faire un paiement de test avec la carte de test
   Stripe, puis un remboursement de test, et vérifier la facture, l'avoir et
   le journal des ventes.
4. Publier la nouvelle version de l'app, puis activer
   `BILLING_EARLY_START_CONSENT_REQUIRED=true` et
   `BILLING_ADDRESS_REQUIRED=true`.
5. `BILLING_STRIPE_TAX=true` une fois les enregistrements faits chez Stripe.

Au démarrage, l'API écrit dans ses journaux ce qui manque. Le tableau de bord
l'affiche aussi, page Facturation.

## 7. Points bloquants avant d'encaisser pour de vrai

Ces points ne se règlent pas dans le code.

- **Apple et Google.** Vendre dans l'app des crédits utilisés dans l'app,
  payés par carte via Stripe, est en principe interdit sur l'App Store
  (règle 3.1.1) et sur Google Play. Les exceptions sont limitées : lien
  externe aux États-Unis, paiement alternatif dans l'UE. Les achats intégrés
  ont un avantage : Apple et Google collectent et reversent eux-mêmes la TVA
  dans la plupart des pays. Il faut choisir le canal avant la publication.
- **Courtage matrimonial (loi du 23 juin 1989).** Un service de rencontres
  « sérieuses » peut y être soumis, avec trois conséquences :
  - contrat écrit ;
  - 7 jours de rétractation ;
  - aucun paiement exigé pendant ces 7 jours.

  À faire trancher par un avocat. Si la loi s'applique, le paiement immédiat
  doit changer.
- **Identité légale.** Il manque :
  - raison sociale, forme, capital, SIREN, adresse et numéro de TVA ;
  - les variables `BILLING_SELLER_*` ;
  - les champs `company` des textes légaux.
- **Médiateur de la consommation.** Il faut en désigner un et l'indiquer
  (CGU section 13 et `BILLING_MEDIATOR`).
- **Fait le 7 octobre 2026, à faire relire par un avocat :**
  - mention de la plateforme européenne de règlement des litiges, fermée le
    20 juillet 2025, retirée des CGU ;
  - clause de rétractation réécrite : 14 jours, remboursement total si le
    crédit n'a pas servi, montant proportionnel après le début, perte du
    droit une fois le parcours entièrement exécuté, bouton de rétractation ;
  - facture à chaque paiement et garantie légale de conformité ajoutées.
- **Facturation électronique.** Depuis le 1er septembre 2026, l'entreprise
  doit pouvoir recevoir des factures électroniques. L'e-reporting des ventes
  aux particuliers commence le 1er septembre 2027 pour les PME. Il faut
  choisir une plateforme agréée.

## 8. Plus tard

- Passer la version de l'API Stripe à une version récente.
- Prix en devises locales (XOF, XAF, CAD, GBP, USD).
- Paiement mobile en Afrique (Orange Money, Wave, MTN) : Stripe ne le propose
  pas dans ces pays. Pistes : CinetPay, PayDunya, FedaPay, Flutterwave.
- Commission des partenaires calculée sur le HT, à fixer dans leur contrat.
