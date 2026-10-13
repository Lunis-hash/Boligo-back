# BOLIGO — Checklist de recette utilisateur (14 octobre 2026)

Environnement : recette locale lancée par `./recette.sh` (Mac/Linux) ou
`.\recette.ps1` (Windows). Voir `docs/RECETTE_LOCALE.md`. Tout est fictif :
aucun e-mail, aucune IA ni aucun paiement réel.

- Webapp : http://localhost:8080 (tester aussi sur téléphone, ou dans l'outil
  « appareil mobile » du navigateur, en **360 px** et **390 px** de large)
- Admin : http://localhost:8081 (sans Docker : http://localhost:3001)
- Espace partenaire : http://localhost:8080/espace-partenaire (anglais : `/partner-space`)
- API : http://localhost:3000/api (documentation : `/docs`)

Comptes fictifs (mot de passe `Recette2026!`) :

| Compte | Situation au départ |
|---|---|
| `adam.termine@recette.boligo.test` | Grand Entretien V8.2 terminé, a invité Bella |
| `bella.termine@recette.boligo.test` | Grand Entretien V8.2 terminé, invitation à accepter |
| `cyril.sondeur@recette.boligo.test` | Sondeur en cours (questions 1 et 2 répondues, attend Diane) |
| `diane.sondeur@recette.boligo.test` | Sondeur en cours (question 1 révélée, doit répondre à la question 2) |
| `emma.entretien@recette.boligo.test` | Grand Entretien V8.2 en cours (modules 0 à 3 faits, module 4 à moitié) |
| `felix.nouveau@recette.boligo.test` | Nouveau membre, rien de commencé, 0 crédit |
| `admin@recette.boligo.test` | Administrateur (mot de passe `RecetteAdmin2026!`) |

Programme partenaires (même recette, mêmes adresses) :

| Compte | Mot de passe | Rôle |
|---|---|---|
| `admin@boligo-demo.example` | `Demo-Admin-2026!` | Administrateur (partenaires) |
| `marketing@boligo-demo.example` | `Demo-Marketing-2026!` | Équipe marketing |
| `membre@boligo-demo.example` | `Demo-Membre-2026!` | Membre (codes partenaires `DEMO…`) |

Les 14 liens privés des espaces partenaires « [DÉMO] » sont imprimés à la fin
de `./recette.sh` et listés dans `docs/RECETTE_LOCALE.md` (section 4), par
exemple Clara Fontenay :
http://localhost:8080/espace-partenaire#zG1NzM7mQ0bhCa7qL0-iKzpx_ZYJlAlpmhrRdeROrFw

Codes : `RECETTE100` (parcours offert), `RECETTE50` (-50 %), codes partenaires
`DEMO…`. Code de vérification d'inscription : `1234`.

Cocher chaque case ; noter le numéro et une capture si ça ne va pas.

## 1. Inscription
- [ ] 1.1 Créer un compte depuis l'accueil : 6 écrans courts (identité ; naissance et métier ; ville ; rencontres ; compte ; récapitulatif et CGU).
- [ ] 1.2 Le navigateur propose le remplissage automatique (prénom, e-mail, téléphone, mot de passe).
- [ ] 1.3 Sur téléphone, le bon clavier s'ouvre : @ pour l'e-mail, chiffres pour le téléphone et la date.
- [ ] 1.4 Date de naissance en 3 cases JJ / MM / AAAA : le curseur avance tout seul ; une date impossible (31/02) est signalée sous le champ.
- [ ] 1.5 L'indicatif téléphonique suit le pays choisi (France +33, RD Congo +243, Cameroun +237, Côte d'Ivoire +225, Canada +1, Belgique +32) et reste modifiable.
- [ ] 1.6 Revenir en arrière entre les écrans, puis recharger la page : les données saisies sont conservées (sauf le mot de passe).
- [ ] 1.7 Erreurs affichées sous le champ concerné, jamais en fenêtre (e-mail déjà utilisé : lien « Se connecter avec cet e-mail »).
- [ ] 1.8 Aucun champ ne déborde à 360 px ; les boutons disent « Valider », « Annuler », « Continuer » (jamais « Validateur » ni « Annuleur »).
- [ ] 1.9 Le code `1234` valide l'e-mail.

## 2. Choix de la ville
- [ ] 2.1 Géolocalisation à Bezons : la ville proposée est **Bezons**, pas Argenteuil.
- [ ] 2.2 La ville détectée reste modifiable à la main.
- [ ] 2.3 Recherche avec fautes : « Beson » propose Bezons (95) en premier.
- [ ] 2.4 Rechercher Argenteuil, Kinshasa, Douala, Abidjan, Montréal, Bruxelles : chaque ville est trouvée dans le bon pays.
- [ ] 2.5 Sans réseau (mode avion), la recherche propose encore les villes de la liste du pays.
- [ ] 2.6 Profil > Modifier : la ville se change avec la même recherche.

## 3. Grand Entretien V8.2 (comptes Félix ou nouveau compte, puis Emma)
- [ ] 3.1 Le navigateur ne propose plus de traduire la page ; les textes français sont corrects.
- [ ] 3.2 Question 1 : « Quelle tranche d'âge vous attire le plus… », saisie « Entre __ et __ ans », sans débordement à 360 px.
- [ ] 3.3 Âges inversés (45 et 30) : message sous les champs, bouton « Valider » grisé.
- [ ] 3.4 Question 2 (âges acceptés) : préremplie avec la tranche idéale. Saisir une plage plus étroite : message clair (« nous enregistrerons … »), **jamais** « Sauvegarde impossible ».
- [ ] 3.5 La question sur les familles est claire : « Si vos familles s'opposaient à votre union…, quelle place donneriez-vous à leur avis dans votre décision ? ».
- [ ] 3.6 Bascule FR ⇄ EN en cours de module : les réponses sont conservées, l'anglais est naturel.
- [ ] 3.7 Les questions sensibles demandent l'accord avant la première ; « Je préfère passer » les saute.
- [ ] 3.8 Relire au calme les libellés (voir `docs/CLARTE_GRAND_ENTRETIEN.md`, 87 corrections) ; noter tout ce qui reste peu clair.

## 4. Retour en arrière dans le Grand Entretien
- [ ] 4.1 « Question précédente » rouvre la question d'avant, avec la réponse actuelle cochée.
- [ ] 4.2 Changer cette réponse : on repart à la première question sans réponse, sans doublon.
- [ ] 4.3 Toucher une réponse du fil de discussion (« Modifier ») la rouvre directement.
- [ ] 4.4 Au début d'un module, « Question précédente » ramène à la dernière question du module précédent, même s'il est terminé.
- [ ] 4.5 Changer une réponse qui ouvrait une question de suite (« Que recherchez-vous ? » → « Faire connaissance… ») : la question de suite (« dans quel délai… ») disparaît, et la progression reste cohérente.
- [ ] 4.6 Fermer l'onglet au milieu d'un module (Emma), se reconnecter : reprise exactement à la première question sans réponse, réponses déjà données visibles.
- [ ] 4.7 Une fois l'entretien terminé (Adam), il n'est plus modifiable.

## 5. Sondeur (Cyril et Diane, dans deux navigateurs)
- [ ] 5.1 Diane répond à la question 2 ; la réponse de Cyril n'est révélée qu'après la sienne.
- [ ] 5.2 Une réponse révélée ne peut plus être modifiée.
- [ ] 5.3 La journée suivante reste fermée jusqu'au lendemain ; aucun contenu sensible dans les notifications.
- [ ] 5.4 Adam et Bella : accepter l'invitation et commencer un parcours.

## 6. Paiement TEST
- [ ] 6.1 Félix : écran de paiement, prix affiché 15,00 € TTC.
- [ ] 6.2 Sans clé Stripe : message « Paiement indisponible » clair, aucun crédit.
- [ ] 6.3 Avec une clé `sk_test_` dans `.env.recette` : carte 4242 4242 4242 4242 acceptée, crédit ajouté ; carte 4000 0000 0000 0002 refusée proprement.
- [ ] 6.4 Profil > Achats : l'achat apparaît avec sa date limite de rétractation.

## 7. Partenaires (données « [DÉMO] », base locale)
- [ ] 7.1 Page Partenaires locale : seules les offres marquées « [DÉMO] » apparaissent (rien sur le site public).
- [ ] 7.2 Espace d'un partenaire accepté (lien de Clara) : visites, inscriptions, ventes et commissions affichées, avec les mêmes chiffres que dans sa fiche admin.
- [ ] 7.3 Espace d'un partenaire suspendu (Spa Nacre) : accès bloqué avec un message clair ; un lien d'un partenaire refusé ne fonctionne pas.
- [ ] 7.4 Admin (`admin@boligo-demo.example`) > Partenaires : synthèse, fiches, vérification, suspension ; création d'un partenaire avec code et lien privé envoyé.
- [ ] 7.5 Équipe marketing (`marketing@boligo-demo.example`) : accès limité aux partenaires et aux offres.
- [ ] 7.6 Commissions : taux figé à la vente ; un remboursement reprend la commission au prorata.
- [ ] 7.7 Membre `membre@boligo-demo.example` : un code `DEMO…` appliqué au paiement est attribué au bon partenaire.

## 8. Codes et réductions
- [ ] 8.1 `RECETTE50` : prix affiché divisé par deux avant paiement.
- [ ] 8.2 `RECETTE100` : parcours offert, crédité sans carte.
- [ ] 8.3 Un code inconnu ou déjà utilisé donne un message clair.

## 9. Administration (`admin@recette.boligo.test`)
- [ ] 9.1 Connexion, tableau de bord avec les chiffres des membres fictifs.
- [ ] 9.2 Liste des membres, fiche d'Emma : entretien en cours, version 8.2.
- [ ] 9.3 Parcours (Cyril et Diane), signalements, messages bloqués : les pages s'ouvrent sans erreur.
- [ ] 9.4 Codes promo : `RECETTE100` et `RECETTE50` visibles, avec leur utilisation.
- [ ] 9.5 Finances : l'achat de test apparaît ; export CSV téléchargeable.

## 10. Général
- [ ] 10.1 Toutes les pages à 360 et 390 px : pas de défilement horizontal, boutons accessibles au pouce.
- [ ] 10.2 Libellés FR et EN : aucune faute ni traduction mot à mot repérée.
- [ ] 10.3 Arrêter avec `./recette.sh --arreter`, relancer : les données sont conservées.

Déjà vérifié automatiquement le 13/10/2026 (rapport de la PR) : jest backend
(1437 tests) et application (155 tests), intégrations V7.1, V8.2, sécurité et
Sondeur sur 3 jours, partenaires (registre des commissions), e2e V8.2 complet,
e2e mobile du retour arrière à 360 et 390 px, e2e des interfaces partenaires,
paiement Stripe TEST (livemode=false). Détail dans la PR #43.
