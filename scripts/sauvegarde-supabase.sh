#!/bin/bash
# Sauvegarde chiffrée et vérifiable de la base Supabase BOLIGO (projet
# « Lunis-hash's Project », hhnnsevawhhtzdffnomv — jamais oweke-staging).
#
# À lancer sur un POSTE DE CONFIANCE, jamais dans un conteneur partagé :
#   bash scripts/sauvegarde-supabase.sh [dossier]   (défaut : ~/boligo-sauvegardes)
#
# Prérequis : pg_dump / pg_restore 17 (même version majeure que Supabase), gpg.
# Paramètres de connexion : Supabase → Connect → « Session pooler »
# (hôte aws-…pooler.supabase.com, port 5432, utilisateur postgres.hhnnsevawhhtzdffnomv).
# Le mot de passe est demandé au clavier : jamais en argument, jamais affiché.
#
# Garanties :
#   - lecture seule sur Supabase (pg_dump ne modifie rien) ;
#   - aucun fichier en clair conservé : seul le fichier chiffré (AES-256) reste ;
#   - refuse d'écrire dans un dépôt git (aucune donnée personnelle dans GitHub) ;
#   - vérification : contrôle d'intégrité SHA-256, liste du contenu, tables clés.
set -euo pipefail
umask 077

DEST=${1:-"$HOME/boligo-sauvegardes"}
REF=hhnnsevawhhtzdffnomv
mkdir -p "$DEST"; chmod 700 "$DEST"
if git -C "$DEST" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ARRÊT : $DEST est dans un dépôt git. Choisir un dossier hors dépôt." >&2; exit 2
fi
for t in pg_dump pg_restore gpg sha256sum; do
  command -v "$t" >/dev/null || { echo "ARRÊT : $t introuvable." >&2; exit 2; }
done
MAJOR=$(pg_dump --version | grep -oE '[0-9]+' | head -1)
[ "$MAJOR" -ge 17 ] || { echo "ARRÊT : pg_dump $MAJOR < 17 (version du serveur Supabase)." >&2; exit 2; }

read -r -p "Hôte du « Session pooler » (ex. aws-0-eu-central-1.pooler.supabase.com) : " PGHOST
case "$PGHOST" in *pooler.supabase.com|db.$REF.supabase.co) ;; *) echo "ARRÊT : hôte inattendu." >&2; exit 2 ;; esac
export PGHOST PGPORT=5432 PGDATABASE=postgres PGSSLMODE=require
if [ "$PGHOST" = "db.$REF.supabase.co" ]; then export PGUSER=postgres; else export PGUSER="postgres.$REF"; fi
read -r -s -p "Mot de passe de la base (non affiché) : " PGPASSWORD; echo
export PGPASSWORD

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$DEST/boligo-$STAMP.dump.gpg"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"; unset PGPASSWORD' EXIT

echo "Export (lecture seule, schéma public)…"
pg_dump --format=custom --no-owner --no-privileges --schema=public --file="$TMP/boligo.dump"
echo "Chiffrement AES-256 (une phrase de passe va être demandée ; la conserver hors de cet ordinateur)…"
gpg --symmetric --cipher-algo AES256 --output "$OUT" "$TMP/boligo.dump"
rm -f "$TMP/boligo.dump"
( cd "$DEST" && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256" )

echo "Vérification : intégrité, puis lecture du contenu depuis le fichier chiffré…"
( cd "$DEST" && sha256sum -c "$(basename "$OUT").sha256" )
gpg --decrypt "$OUT" 2>/dev/null > "$TMP/check.dump"
pg_restore --list "$TMP/check.dump" > "$TMP/list.txt"
rm -f "$TMP/check.dump"
TABLES=$(grep -c " TABLE DATA public " "$TMP/list.txt" || true)
MISSING=""
for t in User InterviewIA Journey HarmonyQuestion Payment CreditTransaction Invoice; do
  grep -q " TABLE DATA public \"\?$t\"\? " "$TMP/list.txt" || MISSING="$MISSING $t"
done
echo "Tables avec données dans la sauvegarde : $TABLES"
if [ -n "$MISSING" ]; then echo "ÉCHEC : tables clés absentes :$MISSING" >&2; exit 1; fi
echo "✅ Sauvegarde vérifiée : $OUT ($(du -h "$OUT" | cut -f1)), empreinte dans $OUT.sha256"
echo "Restauration (si besoin) : gpg -d $OUT > boligo.dump && pg_restore --clean --if-exists --no-owner -d <base cible> boligo.dump"
echo "(Sur une base neuve, l'avertissement « schema public already exists » est attendu et sans effet.)"
