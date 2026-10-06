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
3. **Vérification de l'entreprise**, automatique dès la candidature (voir § 3).
   Sans entreprise vérifiée, le code ne peut pas être créé.
4. **Étude** dans le tableau de bord, page **Partenaires** :
   - statut : Nouveau → En cours → Accepté ou Refusé ;
   - notes internes ;
   - taux de commission.
5. **Accord écrit** signé hors de l'application (voir § 5).
6. **Code partenaire** créé depuis la fiche (bouton « Créer le code ») :
   - BOLIGO propose un code tiré du nom, par exemple `CAMILLE42` ; l'équipe
     peut aussi saisir le sien ;
   - le code est un code promo BOLIGO ordinaire, réservé au partenaire ;
   - la candidature passe alors à « Accepté » ;
   - le partenaire reçoit aussitôt un e-mail de bienvenue, dans sa langue, avec
     son code et le lien vers son **Espace partenaire** (voir § 4).
7. **Suivi** :
   - l'équipe voit, pour chaque partenaire, le nombre d'achats payés avec son
     code, le montant encaissé et la commission due ;
   - le partenaire voit les mêmes chiffres dans son Espace partenaire, mois par
     mois ;
   - le paiement des commissions se fait à la main, sur facture du partenaire
     (mensuelle ou trimestrielle, selon l'accord).

Un code se met en pause ou se réactive depuis la fiche du partenaire (bouton
« Mettre en pause » / « Réactiver ») ou depuis la page **Codes promo**, par
exemple à la fin d'un partenariat.

## 3. Vérification de l'entreprise (obligatoire)

BOLIGO ne travaille qu'avec des professionnels immatriculés : un créateur de
contenu sans statut (par exemple sans SIRET en France) ne peut pas devenir
partenaire. Toute personne qui perçoit régulièrement des commissions doit
déclarer cette activité ; le statut de micro-entrepreneur se crée gratuitement
en ligne (formalites.entreprises.gouv.fr).

**Sur le formulaire**, le candidat choisit le type de numéro et le saisit. La
forme du numéro est contrôlée tout de suite (clé de contrôle des SIREN et
SIRET, préfixe de pays des numéros de TVA…).

**Vérification automatique**, auprès des registres publics officiels et
gratuits :

| Pays | Numéro demandé | Registre consulté | Résultat |
|---|---|---|---|
| France | SIREN (9 chiffres) ou SIRET (14 chiffres) | Annuaire des entreprises de l'État (données INSEE Sirene) | active, cessée ou introuvable ; nom officiel et commune du siège |
| Union européenne (27 pays) et Irlande du Nord | numéro de TVA intracommunautaire | VIES, Commission européenne | valide ou non ; nom officiel quand le pays le communique |
| Royaume-Uni | company number | Companies House (avec une clé gratuite `COMPANIES_HOUSE_API_KEY`, sinon contrôle manuel) | active ou non ; nom officiel |
| Tous les autres pays | numéro officiel d'immatriculation (RCCM, ICE, NEQ, EIN…) | contrôle manuel | voir ci-dessous |

Chaque dossier porte un état : **Vérifiée**, **À vérifier** ou **Rejetée**.
Le tableau de bord affiche le nom officiel renvoyé par le registre à côté du
nom déclaré : il reste à l'équipe de vérifier qu'ils correspondent.

**Contrôle manuel** (pays sans registre interrogeable, entreprise française non
diffusible, registre indisponible) :

1. demander au partenaire un extrait officiel et récent de son immatriculation
   (Kbis ou avis de situation INSEE en France, extrait RCCM dans l'espace
   OHADA, certificat d'immatriculation ailleurs) ;
2. le comparer au registre public du pays. Le lien « voir le registre » de la
   fiche ouvre l'annuaire officiel français, VIES ou Companies House, ou une
   recherche OpenCorporates (agrégateur des registres officiels de plus de 140
   pays) pour les autres pays ;
3. un **administrateur** valide ou rejette l'entreprise en notant la source
   consultée. Son nom et la date sont enregistrés.

Le numéro peut être corrigé depuis la fiche : la vérification repart de zéro.
Ces contrôles n'utilisent que des registres publics, consultés pour vérifier
un statut professionnel déclaré par le candidat lui-même. La politique de
confidentialité le mentionne.

## 4. L'Espace partenaire

Chaque partenaire accepté a une page privée, en français
(`/espace-partenaire`) ou en anglais (`/partner-space`), sur le site BOLIGO :

- son code, la réduction offerte à son audience et l'état du code (actif ou en
  pause) ;
- le nombre de Parcours payés avec son code, le montant encaissé et sa
  commission ;
- l'historique des douze derniers mois ;
- le rappel des règles de publication (§ 5).

**Accès par lien privé, sans mot de passe** :

- le lien est envoyé par e-mail à l'acceptation ; il contient une clé
  aléatoire de 256 bits, placée après « # » pour qu'elle ne parte jamais dans
  les journaux du site ;
- BOLIGO n'enregistre que l'empreinte de cette clé : même avec un accès à la
  base, on ne peut pas reconstituer le lien ;
- depuis la fiche du partenaire, l'équipe peut **envoyer un nouveau lien**
  (l'ancien cesse aussitôt de fonctionner) ou **couper l'accès** ;
- le lien s'affiche une seule fois à l'équipe, pour le copier si l'e-mail
  n'est pas configuré ;
- une candidature passée à « Refusé » perd son accès ;
- la page est limitée à 60 consultations par adresse IP toutes les 10 minutes.

**Ce que le partenaire ne voit jamais** : aucune donnée sur les membres, ni
nom, ni profil, ni e-mail, ni fiche de compatibilité, ni date précise d'achat.
Il ne voit que des totaux par mois.
La politique de confidentialité (`mobile-steve/constants/legal.json` et
`mobile-steve/docs/legal/POLITIQUE_CONFIDENTIALITE.md`) décrit les données des
partenaires et leur durée de conservation :

- candidature non retenue : 2 ans après le dernier échange ;
- partenaire retenu : durée du partenariat puis 5 ans ;
- pièces comptables : 10 ans.

## 5. Règles à inscrire dans chaque accord

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

## 6. La page Codes promo

Tous les codes de réduction, partenaires ou non (promotion de lancement, salon,
offre ponctuelle), dans le menu **Codes promo** du tableau de bord :

- **créer** un code : 3 à 30 lettres ou chiffres ;
- **choisir la réduction** :
  - pourcentage (1 à 100 %) ;
  - montant fixe (0,01 € à 1 000 €) ;
  - Parcours offert ;
- **limiter** si besoin le nombre d'utilisations et la date de fin ;
- **modifier**, **mettre en pause** ou **réactiver** un code ;
- **supprimer** un code jamais utilisé. Un code déjà utilisé est conservé pour
  l'historique des paiements et mis en pause. Le code d'un partenaire ne se
  supprime pas : il se met en pause.

Chaque ligne montre les utilisations, les ventes réalisées avec le code et, le
cas échéant, le partenaire à qui il appartient. Les membres saisissent le code
sur l'écran de paiement du Parcours, dans l'application. Un membre ne peut
utiliser un même code qu'une fois.

## 7. Accès de l'équipe au tableau de bord

Le tableau de bord (`https://boligo-admin.onrender.com`) affiche un menu
différent selon le rôle. L'API applique les mêmes règles : un rôle ne peut pas
contourner le menu en appelant directement une adresse.

| Rôle | Accès | Interdit |
|---|---|---|
| **Administrateur** (`ADMIN`) | tout, dont finances, exports, notifications, codes promo, partenaires et équipe | — |
| **Modération** (`MODERATOR`) | vue d'ensemble, membres, rencontres, parcours, signalements, messages bloqués, appels vidéo ; peut suspendre un membre | finances, crédits, certification, partenaires, codes promo, exports, équipe |
| **Marketing** (`MARKETING`) | vue d'ensemble (chiffres globaux), partenaires, Espace partenaire (liens), page Codes promo | toutes les données des membres, y compris l'identité de ceux qui utilisent un code ; finances, exports, équipe |

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

## 8. Variables Render (service `Boligo-back`)

| Variable | Rôle | Valeur |
|---|---|---|
| `ADMIN_BOOTSTRAP_EMAIL` | adresse du premier administrateur (voir § 7) | adresse du titulaire |
| `PARTNERS_NOTIFY_EMAIL` | adresse qui reçoit les nouvelles candidatures | facultatif, `contact@boligo.fr` par défaut |
| `COMPANIES_HOUSE_API_KEY` | vérification automatique des sociétés britanniques | facultatif, clé gratuite à créer sur developer.company-information.service.gov.uk |
| `PUBLIC_WEB_URL` | adresse du site utilisée dans les liens de l'Espace partenaire | facultatif, `https://boligo-web.onrender.com` par défaut (à changer le jour où le site passe sur `boligo.fr`) |

Les e-mails (accusé de réception, alerte à l'équipe, bienvenue et lien de
l'Espace partenaire) partent par le SMTP
BOLIGO décrit dans `docs/EMAIL_ZOHO_BOLIGO.md`. Tant que ce SMTP n'est pas
configuré, les candidatures sont bien enregistrées et visibles dans le tableau
de bord ; seuls les e-mails ne partent pas. Le lien de l'Espace partenaire
s'affiche alors à l'équipe pour l'envoyer à la main.

## 9. Base de données

Ajouts dans la base BOLIGO (Supabase, projet « Lunis-hash's Project ») :

- table `PartnerApplication` ;
- types `PartnerType` et `PartnerStatus` ;
- valeurs `MODERATOR` et `MARKETING` du type `UserRole` ;
- colonnes `portalTokenHash` (empreinte du lien privé) et `portalLinkSentAt`
  de `PartnerApplication` ;
- colonnes de vérification d'entreprise (`registrationType`,
  `registrationNumber`, `verificationStatus`, `verificationMethod`,
  `verifiedName`, `verificationNote`, `verifiedAt`, `verifiedBy`).

Ces ajouts ne modifient aucune donnée existante. La table est protégée par la
sécurité par ligne, comme les autres : seule l'API y accède.
