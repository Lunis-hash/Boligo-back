# E-mails BOLIGO avec Zoho Mail

Objectif : que les codes d'inscription et de mot de passe partent d'une boîte
**dédiée à BOLIGO** (par exemple `no-reply@<domaine-boligo>`), et pas d'une boîte
personnelle, avec un domaine authentifié pour ne pas tomber en spam.

Aucun changement de code n'est nécessaire : l'API envoie déjà en SMTP (port 465
chiffré pris en charge) et écrit au démarrage `[EMAIL] Mode d'envoi : smtp`.

## 1. Créer le compte Zoho Mail (à faire par le titulaire)

La création d'un compte Zoho demande l'identité et le téléphone du titulaire
ainsi que l'acceptation des conditions Zoho : elle ne peut pas être faite à sa
place.

1. Pré-requis : un nom de domaine BOLIGO (par exemple acheté chez OVH, Gandi ou
   Namecheap). L'offre gratuite de Zoho Mail exige un domaine personnalisé.
2. Aller sur zoho.com/mail → offre **Forever Free** (jusqu'à 5 boîtes) ou **Mail
   Lite**, inscription avec le domaine BOLIGO.
3. Prouver la propriété du domaine : ajouter l'enregistrement **TXT** que Zoho
   affiche, chez le registraire du domaine.
4. Créer deux boîtes :
   - `contact@<domaine>` : la boîte que les membres peuvent écrire ;
   - `no-reply@<domaine>` : l'expéditeur des codes (ou un alias de `contact@`).

## 2. Enregistrements DNS (chez le registraire)

Zoho affiche les valeurs exactes de votre centre de données (`zoho.eu` pour un
compte européen, `zoho.com` sinon) :

| Type | Nom | Rôle |
|---|---|---|
| MX | `@` | réception : `mx.zoho.eu`, `mx2.zoho.eu`, `mx3.zoho.eu` |
| TXT | `@` | SPF : `v=spf1 include:zoho.eu ~all` |
| TXT | `zmail._domainkey` | DKIM : clé fournie par Zoho (Paramètres → Authentification e-mail) |
| TXT | `_dmarc` | DMARC : `v=DMARC1; p=none; rua=mailto:contact@<domaine>` |

## 3. Mot de passe d'application

Activer la double authentification sur la boîte `no-reply@`, puis Mon compte →
Sécurité → **Mots de passe spécifiques à l'application** → en générer un nommé
« BOLIGO API ». C'est lui, et non le mot de passe de connexion, qui sert au SMTP.

## 4. Variables Render (service `Boligo-back`)

| Variable | Valeur |
|---|---|
| `SMTP_HOST` | `smtp.zoho.eu` (ou `smtp.zoho.com` pour un compte non européen) |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `no-reply@<domaine>` |
| `SMTP_PASS` | le mot de passe d'application de l'étape 3 |
| `EMAIL_FROM` | `BOLIGO <no-reply@<domaine>>` (doit être l'adresse de `SMTP_USER` ou un de ses alias, sinon Zoho refuse l'envoi) |

Ces valeurs remplacent l'actuelle configuration SMTP. Le mot de passe ne doit
jamais être mis dans le dépôt ni dans l'app.

## 5. Vérification

1. Après le redémarrage de l'API, les journaux affichent `[EMAIL] Mode d'envoi : smtp`.
2. Créer un compte de test avec une adresse dont vous lisez la boîte (une
   adresse Gmail avec `+boligo-test` fonctionne) : le code doit arriver dans la
   boîte de réception, pas dans les spams.
3. Journaux attendus : `[EMAIL] Email sent successfully via SMTP to …`. En cas
   d'erreur `535` : mot de passe d'application incorrect ; `553` : `EMAIL_FROM`
   ne correspond pas à la boîte authentifiée.
4. Outil de contrôle de délivrabilité : envoyer un code à l'adresse fournie par
   mail-tester.com et viser une note d'au moins 9/10 (SPF, DKIM, DMARC valides).
