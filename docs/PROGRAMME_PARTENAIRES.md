# Programme Partenaires BOLIGO

BOLIGO est international : le programme est **unique**, en français et en
anglais, et il s'adresse à trois profils. Un seul formulaire, un seul suivi dans
le tableau de bord, des règles identiques partout.

## 1. Les trois profils

| Profil | Pour qui | Ce que BOLIGO propose | Rémunération par défaut |
|---|---|---|---|
| **Marque / annonceur** | entreprises, événements, médias, associations proches des valeurs BOLIGO | sponsoring, contenus partagés, visibilité auprès des membres | aucune commission : contrat et facture au cas par cas |
| **Ambassadeur commercial** | apporteurs d'affaires, coachs, agences, réseaux professionnels | code personnel, supports de présentation | **20 %** des achats réalisés avec son code |
| **Créateur de contenu / influenceur** | créateurs sur les réseaux, podcasts, blogs | code personnel qui offre **10 %** de réduction à son audience | **15 %** des achats réalisés avec son code |

Les taux et la réduction sont des valeurs par défaut : l'équipe peut les
changer pour chaque partenaire dans le tableau de bord (commission de 0 à 50 %,
réduction de 0 à 50 %).

**Choix de produit** : pas de profil « grand public » ni de parrainage entre
membres. BOLIGO parle de rencontres sérieuses ; la promotion passe par des
personnes identifiées, liées par un accord écrit, et jamais par la diffusion des
profils ou des données des membres.

## 2. Le parcours d'un partenaire

1. **Candidature** sur la page publique :
   - français : `/partenaires`
   - anglais : `/partners`

   La langue s'adapte aussi au navigateur et se change d'un clic. Le lien
   « Devenir partenaire » est en pied de page de l'accueil.
2. **Accusé de réception** automatique par e-mail au candidat, dans sa langue,
   et **alerte à l'équipe** à l'adresse `PARTNERS_NOTIFY_EMAIL` (par défaut
   `contact@boligo.fr`). Une même adresse ne peut pas déposer deux fois la même
   candidature en 24 heures, et le formulaire est limité à 8 envois par adresse
   toutes les 10 minutes.
3. **Étude** dans le tableau de bord, page **Partenaires** :
   - statut : Nouveau → En cours → Accepté ou Refusé ;
   - notes internes ;
   - taux de commission.
4. **Accord écrit** signé hors de l'application (voir § 4).
5. **Code partenaire** créé depuis la fiche (bouton « Créer le code ») :
   - BOLIGO propose un code tiré du nom, par exemple `CAMILLE42` ; l'équipe
     peut aussi saisir le sien ;
   - le code est un code promo BOLIGO ordinaire, réservé au partenaire ;
   - la candidature passe alors à « Accepté ».
6. **Suivi** : pour chaque partenaire, le tableau de bord affiche le nombre
   d'achats payés avec son code, le montant encaissé et la commission due.
   Le paiement des commissions se fait à la main, sur facture du partenaire
   (mensuelle ou trimestrielle, selon l'accord).

Un code se met en pause ou se réactive depuis la fiche du partenaire (bouton
« Mettre en pause » / « Réactiver »), par exemple à la fin d'un partenariat.

## 3. Ce que voit un partenaire, et ce qu'il ne voit jamais

- Il reçoit son code, son taux, et sur demande le nombre d'achats et le montant
  réalisés avec son code.
- Il ne reçoit **jamais** de données sur les membres : ni nom, ni profil, ni
  e-mail, ni fiche de compatibilité. Le tableau de bord ne relie pas les achats
  aux personnes dans la vue partenaire.
- La politique de confidentialité (`mobile-steve/constants/legal.json` et
  `mobile-steve/docs/legal/POLITIQUE_CONFIDENTIALITE.md`) décrit ces données et
  leur durée de conservation :
  - candidature non retenue : 2 ans après le dernier échange ;
  - partenaire retenu : durée du partenariat puis 5 ans ;
  - pièces comptables : 10 ans.

## 4. Règles à inscrire dans chaque accord

À faire valider par un conseil juridique avant le premier partenariat.

- **Transparence publicitaire** :
  - **France** : la loi n° 2023-451 du 9 juin 2023 impose la mention
    « Publicité » ou « Collaboration commerciale », claire et visible pendant
    toute la durée du contenu.
  - **Ailleurs** : les règles locales s'appliquent, par exemple `#ad` au
    Royaume-Uni (ASA/CMA), *disclosure* aux États-Unis (guides de la FTC),
    directive européenne sur les pratiques commerciales déloyales.
  - L'accord renvoie à la règle du pays où le contenu est diffusé.
- **Contenus** :
  - aucune promesse de résultat (« vous trouverez l'amour ») ;
  - aucun faux témoignage ;
  - aucun visuel ou profil de membre ;
  - aucun ciblage d'un public mineur : BOLIGO est réservé aux majeurs.
- **Ciblage** : pas de publicité ciblée sur des données sensibles, notamment la
  religion, l'orientation sexuelle ou la santé, même si les réseaux sociaux le
  permettent.
- **Marque** : respect de la charte BOLIGO (nom écrit en capitales, couleurs,
  logo fourni par l'équipe).
- **Rémunération** :
  - taux appliqué au montant encaissé avec le code ; l'accord précise HT ou
    TTC ;
  - période de paiement ;
  - pas de commission sur un achat remboursé (le tableau de bord compte les
    achats payés : un remboursement se déduit à la main) ;
  - le partenaire est responsable de ses déclarations fiscales et sociales.
    Pour un partenaire hors de France, faire valider la facturation et la TVA
    par l'expert-comptable.
- **Fin** : résiliation possible à tout moment par écrit, le code est alors mis
  en pause.

## 5. Accès de l'équipe au tableau de bord

Le tableau de bord (`https://boligo-admin.onrender.com`) affiche un menu
différent selon le rôle. L'API applique les mêmes règles : un rôle ne peut pas
contourner le menu en appelant directement une adresse.

| Rôle | Accès | Interdit |
|---|---|---|
| **Administrateur** (`ADMIN`) | tout, dont finances, exports, notifications, codes promo, partenaires et équipe | — |
| **Modération** (`MODERATOR`) | vue d'ensemble, membres, rencontres, parcours, signalements, messages bloqués, appels vidéo ; peut suspendre un membre | finances, crédits, certification, partenaires, codes promo, exports, équipe |
| **Marketing** (`MARKETING`) | vue d'ensemble (chiffres globaux), partenaires et leurs codes | toutes les données des membres, y compris l'identité de ceux qui utilisent un code ; finances, exports, équipe |

- Les rôles se donnent et se retirent depuis la page **Équipe**
  (administrateurs seulement). La personne doit d'abord avoir créé et vérifié
  son compte dans l'application BOLIGO.
- « Retirer l'accès » rend la personne simple membre. Son accès s'arrête
  immédiatement, même si elle avait une session ouverte, car le rôle est relu à
  chaque requête.
- Un administrateur ne peut pas modifier son propre rôle.
- Il reste toujours au moins un administrateur.
- Un compte de l'équipe n'apparaît jamais dans la Découverte des membres.

### Premier administrateur

Sans aucun mot de passe écrit nulle part :

1. Créer un compte normal dans l'application BOLIGO avec l'adresse de
   l'administrateur, puis valider le code reçu par e-mail.
2. Sur Render, service `Boligo-back` → **Environment**, ajouter
   `ADMIN_BOOTSTRAP_EMAIL` avec cette adresse.
3. Au redémarrage de l'API, ou à la première connexion sur le tableau de bord
   avec cette adresse, le compte devient administrateur.

La variable ne sert que tant qu'il n'existe **aucun** administrateur. Dès que
le premier existe, elle n'a plus d'effet et peut être retirée. Les autres
membres de l'équipe sont ensuite nommés depuis la page **Équipe**.

## 6. Variables Render (service `Boligo-back`)

| Variable | Rôle | Valeur |
|---|---|---|
| `ADMIN_BOOTSTRAP_EMAIL` | adresse du premier administrateur (voir § 5) | adresse du titulaire |
| `PARTNERS_NOTIFY_EMAIL` | adresse qui reçoit les nouvelles candidatures | facultatif, `contact@boligo.fr` par défaut |

Les e-mails (accusé de réception et alerte à l'équipe) partent par le SMTP
BOLIGO décrit dans `docs/EMAIL_ZOHO_BOLIGO.md`. Tant que ce SMTP n'est pas
configuré, les candidatures sont bien enregistrées et visibles dans le tableau
de bord ; seuls les e-mails ne partent pas.

## 7. Base de données

Ajouts dans la base BOLIGO (Supabase, projet « Lunis-hash's Project ») :

- table `PartnerApplication` ;
- types `PartnerType` et `PartnerStatus` ;
- valeurs `MODERATOR` et `MARKETING` du type `UserRole`.

Ces ajouts ne modifient aucune donnée existante. La table est protégée par la
sécurité par ligne, comme les autres : seule l'API y accède.
