#!/usr/bin/env bash
# BOLIGO : vérification des migrations partenaires sur une base JETABLE locale.
#   prisma/sql/2026-10-14_partenaires_suspension_conversions.sql
#   prisma/sql/2026-10-15_partenaires_registre_commissions.sql
#
# Usage : scripts/verifier-migrations-partenaires.sh
#   PGHOST (127.0.0.1 OBLIGATOIRE), PGPORT (5433), PGUSER (boligo), REF (origin/main)
#
# Étapes : (a) base au schéma d'AVANT (schema.prisma de REF + scripts SQL
# antérieurs au 2026-10-14) ; (b) données réalistes ; (c) migrations dans
# l'ordre, deux fois ; (d) données intactes + aucun écart avec schema.prisma ;
# (e) ordre inverse sur une 2e base jetable. Les deux bases sont supprimées à
# la fin. Aucune autre base n'est touchée.
set -euo pipefail

PGHOST="${PGHOST:-127.0.0.1}"
PGPORT="${PGPORT:-5433}"
PGUSER="${PGUSER:-boligo}"
REF="${REF:-origin/main}"
DB1=boligo_jetable_migr_part
DB2=boligo_jetable_migr_part_inverse

# ── Garde-fou : 127.0.0.1 seulement, bases jetables au nom réservé.
if [ "$PGHOST" != "127.0.0.1" ]; then
  echo "REFUS : PGHOST doit être 127.0.0.1 (reçu : $PGHOST)" >&2
  exit 2
fi
export PGHOST PGPORT PGUSER
unset PGDATABASE PGPASSWORD DATABASE_URL DIRECT_URL || true

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
M14=prisma/sql/2026-10-14_partenaires_suspension_conversions.sql
M15=prisma/sql/2026-10-15_partenaires_registre_commissions.sql
url() { echo "postgresql://$PGUSER@127.0.0.1:$PGPORT/$1"; }
q() { psql -X -v ON_ERROR_STOP=1 -d "$1" -tAq -c "$2"; }
run_sql() { psql -X -v ON_ERROR_STOP=1 -q -d "$1" -f "$2"; }
FAIL=0
ok() { echo "OK    $*"; }
ko() { echo "ÉCHEC $*"; FAIL=1; }

make_old_db() {
  local db="$1"
  dropdb --if-exists "$db" 2>/dev/null
  createdb "$db"
  git show "$REF:prisma/schema.prisma" > "$WORK/schema-avant.prisma"
  DATABASE_URL="$(url "$db")" DIRECT_URL="$(url "$db")" \
    npx prisma db push --schema "$WORK/schema-avant.prisma" --skip-generate --accept-data-loss >/dev/null
  for f in $(git ls-tree --name-only "$REF" prisma/sql/ | sort); do
    case "$(basename "$f")" in
      2026-10-14*|2026-10-15*) ;;
      *) git show "$REF:$f" > "$WORK/ant.sql"; PGOPTIONS="-c client_min_messages=warning" run_sql "$db" "$WORK/ant.sql" ;;
    esac
  done
}

# Données d'avant : 4 partenaires (accepté avec code, accepté sans commission,
# refusé, nouveau), 4 offres, 3 codes, 4 membres, 4 paiements, transactions
# d'achat, 1 remboursement partiel, 1 total, 1 activation gratuite, statistiques.
seed_old_data() {
  psql -X -v ON_ERROR_STOP=1 -q -d "$1" <<'SQL'
INSERT INTO "PromoCode"(id,code,"discountType","discountValue","maxUses","usedCount","isActive",description,"createdAt") VALUES
 ('pc-clara','MIGCLARA','percent',10,NULL,3,true,'Code ambassadrice','2026-09-01 10:00'),
 ('pc-lumen','MIGLUMEN','percent',15,100,1,true,'Code marque','2026-09-02 10:00'),
 ('pc-nora','MIGNORA','free',100,3,1,true,'Jeu concours','2026-09-03 10:00'),
 ('pc-hors','RENTREE','fixed',300,NULL,0,true,'Code promo sans partenaire','2026-08-20 10:00');
INSERT INTO "User"(id,email,"firstName","lastName","birthDate",gender,city,"creditBalance","isVerified","createdAt","updatedAt","referralCodeId","referredAt") VALUES
 ('u1','u1@migr.example','Ana','Test','1990-01-01','F','Paris',1,true,'2026-09-05','2026-09-05','pc-clara','2026-09-05'),
 ('u2','u2@migr.example','Ben','Test','1989-02-02','H','Lyon',0,true,'2026-09-06','2026-09-06','pc-clara','2026-09-06'),
 ('u3','u3@migr.example','Cléo','Test','1992-03-03','F','Nantes',1,true,'2026-09-07','2026-09-07','pc-lumen','2026-09-07'),
 ('u4','u4@migr.example','Dan','Test','1991-04-04','H','Lille',1,true,'2026-09-08','2026-09-08',NULL,NULL);
INSERT INTO "PartnerApplication"(id,type,status,name,email,company,country,city,message,"commissionRate","promoCodeId","verificationStatus","createdAt","updatedAt") VALUES
 ('pa-clara','AMBASSADEUR','ACCEPTE','Clara','clara@migr.example',NULL,'France','Paris','Ambassadrice',20,'pc-clara','VERIFIE','2026-08-30','2026-09-01'),
 ('pa-lumen','ANNONCEUR','ACCEPTE','Lumen','lumen@migr.example','Atelier Lumen','France','Lyon','Marque',NULL,'pc-lumen','VERIFIE','2026-08-30','2026-09-02'),
 ('pa-nora','CREATEUR','REFUSE','Nora','nora@migr.example',NULL,'Belgique','Liège','Créatrice',12,'pc-nora','VERIFIE','2026-08-31','2026-09-10'),
 ('pa-new','CREATEUR','NOUVEAU','Zoé','zoe@migr.example',NULL,'France','Lille','Candidature',NULL,NULL,'A_VERIFIER','2026-09-12','2026-09-12');
INSERT INTO "PartnerOffer"(id,"partnerId",placement,title,perk,description,url,"perkCode","isActive","startsAt","endsAt","createdAt","updatedAt") VALUES
 ('of-a','pa-lumen','PARTENAIRE_DU_MOIS','Atelier poterie','-20 %','Duo','https://lumen.example/a','BOLIGO20',true,NULL,NULL,'2026-09-02 12:00','2026-09-03 08:00'),
 ('of-b','pa-lumen','OFFRES','Cours','-10 %','Cours','https://lumen.example/b',NULL,false,NULL,NULL,'2026-09-02 13:00','2026-09-02 13:00'),
 ('of-c','pa-lumen','OFFRES','Programmée','-5 %','Future','https://lumen.example/c',NULL,true,'2026-12-01',NULL,'2026-09-04 09:00','2026-09-04 09:00'),
 ('of-d','pa-nora','OFFRES','Expirée','-5 %','Passée','https://nora.example/d',NULL,true,NULL,'2026-09-15','2026-09-05 09:00','2026-09-05 09:00');
INSERT INTO "PartnerOfferStat"(id,"offerId",day,impressions,clicks) VALUES
 ('st1','of-a','2026-09-10',120,7),('st2','of-a','2026-09-11',80,3),('st3','of-d','2026-09-10',40,1);
INSERT INTO "Payment"(id,"userId","stripePaymentIntentId",status,"planId",credits,currency,"listAmountCents","discountCents","totalAmountCents","promoCodeId","refundedCents","createdAt","succeededAt","updatedAt") VALUES
 ('pay1','u1','pi_mig_1','reussi','parcours_harmonie',1,'EUR',1500,150,1350,'pc-clara',0,'2026-09-05','2026-09-05','2026-09-05'),
 ('pay2','u2','pi_mig_2','rembourse_partiel','parcours_harmonie',1,'EUR',1500,150,1350,'pc-clara',675,'2026-09-06','2026-09-06','2026-09-20'),
 ('pay3','u3','pi_mig_3','rembourse','parcours_harmonie',1,'EUR',1500,225,1275,'pc-lumen',1275,'2026-09-07','2026-09-07','2026-09-21'),
 ('pay4','u4','pi_mig_4','reussi','parcours_harmonie',1,'EUR',1500,300,1200,'pc-hors',0,'2026-09-08','2026-09-08','2026-09-08');
INSERT INTO "CreditTransaction"(id,"userId","promoCodeId",type,"creditAmount","euroAmount","paymentRef",date,description) VALUES
 ('t1','u1','pc-clara','achat',1,13.5,'pi_mig_1','2026-09-05','Achat'),
 ('t2','u2','pc-clara','achat',1,13.5,'pi_mig_2','2026-09-06','Achat'),
 ('t3','u3','pc-lumen','achat',1,12.75,'pi_mig_3','2026-09-07','Achat'),
 ('t4','u4','pc-hors','achat',1,12.0,'pi_mig_4','2026-09-08','Achat'),
 ('t5','u2','pc-clara','remboursement_paiement',0,-6.75,'pi_mig_2:remboursement:675','2026-09-20','Remboursement partiel'),
 ('t6','u3','pc-lumen','remboursement_paiement',-1,-12.75,'pi_mig_3:remboursement:1275','2026-09-21','Remboursement total'),
 ('t7','u4','pc-nora','achat',1,0,'PROMO_pc-nora_u4','2026-09-09','Activation gratuite'),
 ('t8','u1',NULL,'consommation',-1,NULL,NULL,'2026-09-10','Parcours');
SQL
}

TABLES='"User" "PromoCode" "PartnerApplication" "PartnerOffer" "PartnerOfferStat" "Payment" "CreditTransaction"'
# Empreinte de chaque table sur ses colonnes D'AVANT : nombre de lignes + md5.
fingerprint() {
  local db="$1" out="$2"; : > "$out"
  for t in $TABLES; do
    local name="${t//\"/}"
    local cols
    cols=$(q "$db" "SELECT string_agg(quote_ident(column_name)||'::text', ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='$name' AND column_name IN (SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='$name')" )
    [ -f "$WORK/cols-$name" ] || echo "$cols" > "$WORK/cols-$name"   # colonnes figées au 1er appel
    cols=$(cat "$WORK/cols-$name")
    echo "$name $(q "$db" "SELECT count(*)||' '||md5(coalesce(string_agg(r, '|' ORDER BY r),'')) FROM (SELECT concat_ws('§',$cols) r FROM $t) s")" >> "$out"
  done
}
enum_values() { q "$1" "SELECT t.typname||'='||string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid WHERE t.typname IN ('PartnerStatus','PartnerCommissionKind') GROUP BY t.typname ORDER BY 1"; }
counts_new() { q "$1" "SELECT (SELECT count(*) FROM \"PartnerCommission\")||' commissions, '||(SELECT count(*) FROM \"PartnerOfferConversion\")||' conversions, '||(SELECT count(*) FROM \"PartnerOffer\" WHERE \"publishedAt\" IS NOT NULL)||' offres publiées'"; }

echo "══ (a) Base au schéma d'avant ($REF) : $DB1"
make_old_db "$DB1"
if q "$DB1" "SELECT 1 FROM information_schema.tables WHERE table_name IN ('PartnerCommission','PartnerOfferConversion')" | grep -q 1; then ko "la base d'avant contient déjà les nouvelles tables"; else ok "schéma d'avant sans PartnerCommission ni PartnerOfferConversion"; fi

echo "══ (b) Données existantes"
seed_old_data "$DB1"
fingerprint "$DB1" "$WORK/avant.txt"
cat "$WORK/avant.txt"

echo "══ (c) Migrations dans l'ordre (1er passage)"
run_sql "$DB1" "$M14" 2>"$WORK/err1" && ok "2026-10-14 appliquée" || ko "2026-10-14 : $(cat "$WORK/err1")"
run_sql "$DB1" "$M15" 2>"$WORK/err2" && ok "2026-10-15 appliquée" || ko "2026-10-15 : $(cat "$WORK/err2")"
P1="$(counts_new "$DB1")"; E1="$(enum_values "$DB1")"
SNAP1=$(q "$DB1" "SELECT md5(string_agg(concat_ws('§',\"idempotencyKey\",\"partnerId\",kind,\"amountCents\",\"ratePercent\",\"commissionCents\",\"saleId\"),'|' ORDER BY \"idempotencyKey\")) FROM \"PartnerCommission\"")
echo "      après 1er passage : $P1"
echo "══ (c) 2e passage (idempotence)"
run_sql "$DB1" "$M14" 2>"$WORK/err3" && ok "2026-10-14 rejouée sans erreur" || ko "2026-10-14 rejouée : $(cat "$WORK/err3")"
run_sql "$DB1" "$M15" 2>"$WORK/err4" && ok "2026-10-15 rejouée sans erreur" || ko "2026-10-15 rejouée : $(cat "$WORK/err4")"
grep -v '^\s*$' "$WORK"/err3 "$WORK"/err4 2>/dev/null | sed 's/^/      avis : /' || true
P2="$(counts_new "$DB1")"; E2="$(enum_values "$DB1")"
SNAP2=$(q "$DB1" "SELECT md5(string_agg(concat_ws('§',\"idempotencyKey\",\"partnerId\",kind,\"amountCents\",\"ratePercent\",\"commissionCents\",\"saleId\"),'|' ORDER BY \"idempotencyKey\")) FROM \"PartnerCommission\"")
[ "$P1" = "$P2" ] && ok "aucun doublon : $P2" || ko "doublons : $P1 → $P2"
[ "$E1" = "$E2" ] && ok "énumérations inchangées : $(echo $E2)" || ko "énumérations : $E1 → $E2"
[ "$SNAP1" = "$SNAP2" ] && ok "registre identique après rejeu" || ko "registre modifié par le rejeu"

echo "══ (d) Données d'avant intactes"
fingerprint "$DB1" "$WORK/apres.txt"
if diff -u "$WORK/avant.txt" "$WORK/apres.txt"; then ok "7 tables : mêmes nombres de lignes et mêmes sommes md5 (colonnes d'avant)"; else ko "données d'avant modifiées"; fi
PUB=$(q "$DB1" "SELECT string_agg(id||':'||coalesce(to_char(\"publishedAt\",'YYYY-MM-DD HH24:MI'),'—'),' ' ORDER BY id) FROM \"PartnerOffer\"")
[ "$PUB" = "of-a:2026-09-02 12:00 of-b:— of-c:2026-09-04 09:00 of-d:2026-09-05 09:00" ] && ok "publishedAt = createdAt pour les offres actives seulement ($PUB)" || ko "publishedAt inattendu : $PUB"
REG=$(q "$DB1" "SELECT string_agg(\"paymentRef\"||'/'||kind||'/'||\"amountCents\"||'/'||\"ratePercent\"||'/'||\"commissionCents\",' ' ORDER BY \"paymentRef\",kind) FROM \"PartnerCommission\"")
EXP="pi_mig_1/VENTE/1350/20/270 pi_mig_2/VENTE/1350/20/270 pi_mig_2/REPRISE/675/20/-135 pi_mig_3/VENTE/1275/0/0 pi_mig_3/REPRISE/1275/0/0"
[ "$REG" = "$EXP" ] && ok "reprise de l'historique : $REG" || ko "registre inattendu : $REG (attendu $EXP)"
DIFF=$(DATABASE_URL="$(url "$DB1")" DIRECT_URL="$(url "$DB1")" npx prisma migrate diff --from-url "$(url "$DB1")" --to-schema-datamodel prisma/schema.prisma --script 2>&1)
SIG=$(echo "$DIFF" | grep -vE '^\s*$|^--' || true)
if [ -z "$SIG" ]; then ok "prisma migrate diff → schema.prisma : aucun écart ($(echo "$DIFF" | head -1))"; else ko "écart avec schema.prisma :"; echo "$DIFF"; fi

echo "══ (e) Ordre inverse (2026-10-15 puis 2026-10-14) : $DB2"
make_old_db "$DB2"
seed_old_data "$DB2"
if run_sql "$DB2" "$M15" 2>"$WORK/err5"; then echo "      2026-10-15 en premier : acceptée"; INV15=ok; else echo "      2026-10-15 en premier : ÉCHEC $(cat "$WORK/err5")"; INV15=ko; fi
if run_sql "$DB2" "$M14" 2>"$WORK/err6"; then echo "      2026-10-14 ensuite : acceptée"; INV14=ok; else echo "      2026-10-14 ensuite : ÉCHEC $(cat "$WORK/err6")"; INV14=ko; fi
if [ "$INV15$INV14" = okok ]; then
  REG2=$(q "$DB2" "SELECT string_agg(\"paymentRef\"||'/'||kind||'/'||\"amountCents\"||'/'||\"ratePercent\"||'/'||\"commissionCents\",' ' ORDER BY \"paymentRef\",kind) FROM \"PartnerCommission\"")
  DIFF2=$(npx prisma migrate diff --from-url "$(url "$DB2")" --to-schema-datamodel prisma/schema.prisma --script 2>&1 | grep -vE '^\s*$|^--' || true)
  [ "$REG2" = "$REG" ] && [ -z "$DIFF2" ] && echo "      résultat identique à l'ordre normal (registre et schéma)" || echo "      résultat DIFFÉRENT : $REG2 / $DIFF2"
fi

dropdb --if-exists "$DB1"; dropdb --if-exists "$DB2"
echo "Bases jetables supprimées."
[ $FAIL = 0 ] && echo "RÉSULTAT : tous les contrôles réussis" || echo "RÉSULTAT : au moins un contrôle en échec"
exit $FAIL
