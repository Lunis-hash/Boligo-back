# E-mails BOLIGO : boligo.fr (Hostinger) et Zoho Mail

Objectif : **une seule adresse BOLIGO pour tous les sites**, `contact@boligo.fr`
(application, site web, tableau de bord, mentions légales et données
personnelles). Les codes d'inscription et de mot de passe partent de
`no-reply@boligo.fr`, un alias de cette même boîte.

## 1. État des lieux (relevé DNS public du 6 octobre 2026)

| Élément | Situation |
|---|---|
| Domaine `boligo.fr` | enregistré chez **Hostinger** (serveurs DNS `*.dns-parking.com`), aucune messagerie ni site configuré |
| Compte Zoho Mail | offre **payante** existante (compte `stevebandama@gmail.com`, centre de données européen `zoho.eu`), qui héberge déjà `oweke.fr` |
| `oweke.fr` (pour comparaison) | DNS Hostinger → MX Zoho EU, SPF `zohomail.eu`, DKIM `zmail`, vérification Zoho |
| API BOLIGO (Render) | envoi en SMTP déjà en place ; il suffit de changer cinq variables |

## 2. Possibilités étudiées

| Option | Coût | Séparation BOLIGO / OWEKE | Retenue |
|---|---|---|---|
| Ajouter `boligo.fr` comme **second domaine** du compte Zoho payant | gratuit | oui (domaines distincts) | **oui** |
| Adresses BOLIGO en **alias de la boîte OWEKE** | gratuit | **non** : le serveur BOLIGO détiendrait le mot de passe d'une boîte OWEKE | non |
| **Une boîte dédiée** `contact@boligo.fr` dans ce compte Zoho | une licence Zoho (de l'ordre d'1 € par mois, à vérifier dans la console) | oui : boîte, mot de passe et courrier propres à BOLIGO | **oui** |
| Nouveau compte Zoho gratuit séparé | gratuit | oui | non : l'offre gratuite se limite au web et aux applications Zoho (pas d'accès IMAP/POP) ; l'envoi par l'API n'y est pas garanti |
| Boîtes mail Hostinger | payant | oui | non : double emploi avec Zoho, déjà payé |

**Retenu** : `boligo.fr` ajouté au compte Zoho existant (gratuit), une boîte
`contact@boligo.fr` (la seule dépense, à régler par le titulaire), l'alias
`no-reply@boligo.fr` (gratuit) pour les envois automatiques.

## 3. Étapes

Légende : 🆓 gratuit · 💶 paiement par le titulaire du compte.

### Zoho (mailadmin.zoho.eu, compte stevebandama@gmail.com)

1. 🆓 **Domaines → Ajouter un domaine** : `boligo.fr`. Zoho affiche un code
   `zoho-verification=…` (étape 2 ci-dessous, puis « Vérifier »).
2. 💶 **Abonnement → Ajouter un utilisateur** : une licence supplémentaire.
3. 🆓 **Utilisateurs → Ajouter** : `contact@boligo.fr` (prénom « BOLIGO »,
   nom « Contact »).
4. 🆓 Sur cet utilisateur → **Alias e-mail** : ajouter `no-reply@boligo.fr`.
5. 🆓 **Domaines → boligo.fr → Authentification e-mail → DKIM** : créer le
   sélecteur `zmail`, copier la clé affichée (étape 2), puis « Vérifier ».
6. 🆓 Se connecter une fois à `contact@boligo.fr` → **Mon compte → Sécurité →
   Mots de passe spécifiques à l'application** → en créer un nommé
   « BOLIGO API ». Il sert uniquement à l'API ; il se révoque à tout moment.

### Hostinger (hPanel → Domaines → boligo.fr → Zone DNS)

Mêmes enregistrements que pour `oweke.fr`, avec les valeurs propres à
`boligo.fr` :

| Type | Nom | Valeur | Priorité |
|---|---|---|---|
| TXT | `@` | `zoho-verification=…` (code donné par Zoho pour boligo.fr) | |
| MX | `@` | `mx.zoho.eu` | 10 |
| MX | `@` | `mx2.zoho.eu` | 20 |
| MX | `@` | `mx3.zoho.eu` | 50 |
| TXT | `@` | `v=spf1 include:zohomail.eu ~all` | |
| TXT | `zmail._domainkey` | clé DKIM donnée par Zoho pour boligo.fr | |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:contact@boligo.fr` | |

Supprimer d'éventuels enregistrements MX par défaut de Hostinger sur `@`.

### Render (service `Boligo-back` → Environment)

| Variable | Valeur |
|---|---|
| `SMTP_HOST` | `smtp.zoho.eu` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `contact@boligo.fr` |
| `SMTP_PASS` | le mot de passe d'application de l'étape 6 (collé directement dans Render, jamais dans le dépôt ni dans une conversation) |
| `EMAIL_FROM` | `BOLIGO <no-reply@boligo.fr>` |

## 4. Vérification

1. DNS : `boligo.fr` doit répondre avec les trois MX Zoho, le SPF, la clé
   `zmail._domainkey` et le DMARC (contrôle possible depuis n'importe quel
   outil DNS public).
2. Journaux Render au redémarrage : `[EMAIL] Mode d'envoi : smtp`.
3. Inscription de test avec une adresse que vous lisez : le code arrive en
   boîte de réception (pas en indésirables), expéditeur « BOLIGO
   <no-reply@boligo.fr> ».
4. Un message envoyé à `contact@boligo.fr` arrive dans la boîte BOLIGO.
5. Erreurs courantes : `535` = mot de passe d'application incorrect ; `553` =
   `EMAIL_FROM` n'est pas l'adresse ou un alias de `SMTP_USER`.

## 5. Adresse unique dans les sites

`contact@boligo.fr` est l'adresse de contact et de protection des données dans
les CGU, la politique de confidentialité (`mobile-steve/constants/legal.json`,
`mobile-steve/docs/legal/`) et le site web. L'expéditeur par défaut de l'API
est `no-reply@boligo.fr`.

## 6. Envoi automatique par Resend (10 octobre 2026)

Test du 10 octobre : l'API n'arrive pas à joindre `smtp.zoho.eu` (délai
dépassé). Le service Render `Boligo-back` est sur l'offre **gratuite**, qui
bloque les ports SMTP sortants (25, 465, 587). Zoho reste la **boîte de
réception** de `contact@boligo.fr` ; les e-mails automatiques (codes,
reçus, alertes) partent par l'**API Resend** (HTTPS, port 443).

Règle : un compte Resend **propre à BOLIGO**. Le compte Resend qui contient
`oweke.fr` appartient à OWEKE et n'est jamais utilisé pour BOLIGO.

1. Créer un compte Resend avec une adresse BOLIGO (gratuit : 3 000 e-mails
   par mois, 100 par jour).
2. Domains → Add domain → `boligo.fr`, région **eu-west-1** (Irlande).
3. Hostinger → Zone DNS de `boligo.fr` : ajouter les enregistrements affichés
   par Resend. Ils sont sur `resend._domainkey` et sur le sous-domaine
   `send` : ils ne touchent ni aux MX ni au SPF de Zoho sur `@`.
4. Quand le domaine est « Verified » : API Keys → clé « BOLIGO API »,
   permission « Sending access », domaine `boligo.fr`.
5. Render → `Boligo-back` → Environment : `RESEND_API_KEY` = cette clé
   (collée directement dans Render). `EMAIL_FROM` reste
   `BOLIGO <no-reply@boligo.fr>`. Option : `EMAIL_REPLY_TO` =
   `contact@boligo.fr`.

Au redémarrage, les journaux affichent `[EMAIL] Mode d'envoi : resend`.
Resend passe avant le SMTP quand `RESEND_API_KEY` est présente. Passer le
service à l'offre payante Starter rendrait aussi le SMTP Zoho utilisable.
