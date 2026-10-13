# ─────────────────────────────────────────────────────────────────────────────
# BOLIGO — RECETTE LOCALE en une commande (Windows PowerShell). Voir docs/RECETTE_LOCALE.md.
#
#   .\recette.ps1                  démarre tout avec Docker Desktop (base, API, web, admin)
#   .\recette.ps1 -FauxIA          idem + faux OpenRouter local (aucun appel réel)
#   .\recette.ps1 -SansDocker      Postgres local existant + Node.js 22 (npm)
#   .\recette.ps1 -Arreter         arrête la recette (les données sont gardées)
#   .\recette.ps1 -Reinitialiser   supprime la base de recette puis relance tout
#   .\recette.ps1 -SansBuild       (Docker) réutilise les images déjà construites
#
# Si Windows refuse le script : powershell -ExecutionPolicy Bypass -File .\recette.ps1
#
# Garanties : base LOCALE uniquement, secrets FACTICES (.env.recette), aucun
# e-mail réel, aucune IA réelle, Stripe en mode TEST seulement (clé sk_test_)
# ou paiement indisponible / code promo gratuit ; toute clé « live » est refusée.
# ─────────────────────────────────────────────────────────────────────────────
[CmdletBinding()]
param(
  [switch]$SansDocker,
  [switch]$FauxIA,
  [switch]$Arreter,
  [switch]$Reinitialiser,
  [switch]$SansBuild
)
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$EnvFile = '.env.recette'
$Project = 'boligo-recette'
$StateDir = '.recette'
$StateAbs = Join-Path $Root $StateDir

function Die([string]$msg) { Write-Host "ERREUR : $msg" -ForegroundColor Red; exit 2 }
function Info([string]$msg) { Write-Host "> $msg" -ForegroundColor Cyan }
function Rand() {
  $b = New-Object byte[] 24
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  return ($b | ForEach-Object { $_.ToString('x2') }) -join ''
}

# ─── .env.recette (secrets factices) ────────────────────────────────────────
if (-not (Test-Path $EnvFile)) {
  Info "Création de $EnvFile (secrets factices, jamais versionné)"
  $date = Get-Date -Format 'yyyy-MM-dd HH:mm'
  $content = @"
# BOLIGO — environnement de RECETTE LOCALE, généré par recette.ps1 le $date.
# Secrets FACTICES. Ne jamais y mettre de clé de production (clés live refusées).
# Supprimer ce fichier pour en générer un nouveau.

# ── Docker Compose ──
POSTGRES_USER=boligo
POSTGRES_PASSWORD=$(Rand)
POSTGRES_DB=boligo_recette
POSTGRES_IMAGE=postgres:16
DB_PORT=55432
API_PORT=3000
WEB_PORT=8080
ADMIN_PORT=8081
PUBLIC_API_URL=http://localhost:3000/api
PUBLIC_WEB_URL=http://localhost:8080
APP_VERSION=recette

# ── Mode -SansDocker : base Postgres LOCALE existante (localhost uniquement) ──
SANS_DOCKER_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/boligo_recette?schema=public

# ── API ──
PORT=3000
JWT_SECRET=recette-factice-$(Rand)
JWT_EXPIRES_IN=7d
# Code de vérification 1234 accepté et renvoyé (inscriptions de test sans e-mail).
OTP_DEBUG=true
WEB_APP_URL=http://localhost:8080
PUBLIC_WEB_URL=http://localhost:8080
APP_URL=http://localhost:8080
ADMIN_ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3001
INTERVIEW_VERSION=8.2
HARMONY_QUESTIONS_SOURCE=bank
GHOSTING_MONITOR=observe
VIDEO_TEST_UNLOCK=false
BILLING_ENABLED=false
EMAIL_FROM="BOLIGO Recette <no-reply@recette.boligo.test>"

# ── Stripe : vide = paiement par carte indisponible (utiliser le code RECETTE100).
# Mode TEST seulement : sk_test_… / pk_test_… du compte de TEST BOLIGO.
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
"@
  # UTF-8 sans BOM, fins de ligne LF (lu par Docker Compose).
  [IO.File]::WriteAllText((Join-Path $Root $EnvFile), ($content -replace "`r`n", "`n"), (New-Object Text.UTF8Encoding($false)))
}

function EnvVal([string]$name) {
  $line = Get-Content $EnvFile -Encoding UTF8 | Where-Object { $_ -match "^$name=" } | Select-Object -Last 1
  if (-not $line) { return '' }
  return ($line.Substring($name.Length + 1)).Trim('"')
}

# ─── Garde-fous Stripe et base ──────────────────────────────────────────────
$active = Get-Content $EnvFile -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*#' }
if ($active -match '(sk|rk|pk)_live_') { Die "$EnvFile contient une clé Stripe LIVE : refusé. La recette n'accepte que le mode TEST." }
$SK = EnvVal 'STRIPE_SECRET_KEY'
$PK = EnvVal 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
if ($SK -and -not $SK.StartsWith('sk_test_')) { Die 'STRIPE_SECRET_KEY doit commencer par sk_test_ (ou rester vide).' }
if ($PK -and -not $PK.StartsWith('pk_test_')) { Die 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY doit commencer par pk_test_ (ou rester vide).' }
if ($SK) { $Paiement = 'Stripe mode TEST (carte 4242 4242 4242 4242)' } else { $Paiement = 'carte indisponible (aucune clé) : code promo RECETTE100 = parcours offert' }

$RApi = EnvVal 'API_PORT'; if (-not $RApi) { $RApi = '3000' }
$RWeb = EnvVal 'WEB_PORT'; if (-not $RWeb) { $RWeb = '8080' }
$RAdmin = EnvVal 'ADMIN_PORT'; if (-not $RAdmin) { $RAdmin = '8081' }

function Show-Access([string]$adminUrl) {
  Write-Host @"

====================================================================
 RECETTE BOLIGO prête (données FICTIVES, base locale)
--------------------------------------------------------------------
 Application web     http://localhost:$RWeb
 Espace partenaire   http://localhost:$RWeb/espace-partenaire  (EN : /partner-space)
 API                 http://localhost:$RApi/api   (santé : /api/health, doc : /docs)
 Admin               $adminUrl
--------------------------------------------------------------------
 Mot de passe de tous les membres : Recette2026!
   adam.termine@recette.boligo.test    Grand Entretien V8.2 terminé, a invité Bella
   bella.termine@recette.boligo.test   Grand Entretien V8.2 terminé, invitation à accepter
   cyril.sondeur@recette.boligo.test   Parcours en cours : Sondeur (attend Diane)
   diane.sondeur@recette.boligo.test   Parcours en cours : Sondeur (à elle de répondre)
   emma.entretien@recette.boligo.test  Grand Entretien V8.2 en cours (modules 0-3, 4 à moitié)
   felix.nouveau@recette.boligo.test   Nouveau membre, rien de commencé, 0 crédit
 Partenaires (recette partenaires) :
   membre@boligo-demo.example / Demo-Membre-2026!   (membre, codes DEMO…)
 Admin : admin@recette.boligo.test / RecetteAdmin2026!
         admin@boligo-demo.example / Demo-Admin-2026!   (programme partenaires)
         marketing@boligo-demo.example / Demo-Marketing-2026!   (équipe marketing)
 Espaces partenaires : liens privés ci-dessus (seed partenaires) et dans
   docs/RECETTE_LOCALE.md, section 4
 Codes promo : RECETTE100 (offert), RECETTE50 (-50 %), codes partenaires DEMO…
 Paiement : $Paiement
 Inscription d'un nouveau compte : code de vérification 1234 (aucun e-mail envoyé)
--------------------------------------------------------------------
 Arrêter : .\recette.ps1 -Arreter    Repartir de zéro : .\recette.ps1 -Reinitialiser
====================================================================
"@ -ForegroundColor Green
}

function Wait-Api {
  Info "Attente de l'API (http://localhost:$RApi/api/health)…"
  for ($i = 0; $i -lt 120; $i++) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 "http://localhost:$RApi/api/health"
      if ($r.StatusCode -eq 200) { return $true }
    } catch { }
    Start-Sleep -Seconds 2
  }
  return $false
}

# ═════════════════════════════════════════════════════════════════════════════
# Mode Docker
# ═════════════════════════════════════════════════════════════════════════════
if (-not $SansDocker) {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Die 'Docker est introuvable : installez Docker Desktop (docs/RECETTE_LOCALE.md), ou utilisez -SansDocker.' }
  & docker compose version *> $null; if ($LASTEXITCODE -ne 0) { Die '« docker compose » est introuvable : mettez Docker Desktop à jour.' }
  & docker info *> $null; if ($LASTEXITCODE -ne 0) { Die 'Docker ne répond pas : démarrez Docker Desktop puis relancez.' }
  $cv = (& docker compose version --short) -replace '^v', ''
  $parts = $cv.Split('.')
  if ([int]$parts[0] -lt 2 -or ([int]$parts[0] -eq 2 -and [int]$parts[1] -lt 24)) { Die "Docker Compose $cv trop ancien (2.24 minimum) : mettez Docker Desktop à jour." }

  # Les variables du shell priment sur --env-file : on les retire.
  foreach ($v in 'API_DATABASE_URL','API_DIRECT_URL','API_ENV_FILE','DATABASE_URL','DIRECT_URL','POSTGRES_USER','POSTGRES_PASSWORD','POSTGRES_DB','POSTGRES_IMAGE','DB_PORT','API_PORT','WEB_PORT','ADMIN_PORT','PUBLIC_API_URL','PUBLIC_WEB_URL','APP_VERSION','EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY','RECETTE_OPENROUTER_API_KEY','RECETTE_OPENROUTER_BASE_URL','RECETTE_HARMONY_QUESTIONS_SOURCE') {
    Remove-Item "Env:$v" -ErrorAction SilentlyContinue
  }
  $profiles = @('--profile', 'admin')
  if ($FauxIA) {
    $profiles += @('--profile', 'faux-ia')
    $env:RECETTE_OPENROUTER_API_KEY = 'stub-local'
    $env:RECETTE_OPENROUTER_BASE_URL = 'http://faux-openrouter:8799/api/v1'
    $env:RECETTE_HARMONY_QUESTIONS_SOURCE = 'ai'
  }
  $base = @('compose', '-p', $Project, '--env-file', $EnvFile, '-f', 'docker-compose.yml', '-f', 'docker-compose.recette.yml') + $profiles

  if ($Arreter) {
    Info 'Arrêt de la recette (données gardées)'
    & docker @base --profile faux-ia down
    exit $LASTEXITCODE
  }
  if ($Reinitialiser) {
    Info "Suppression des conteneurs et de la base de recette (volume ${Project}_recette_pgdata)"
    & docker @base --profile faux-ia down -v --remove-orphans
  }
  Info 'Démarrage : base, création du schéma + membres fictifs, API, web, admin'
  $up = @('up', '-d', '--remove-orphans')
  if (-not $SansBuild) { Info 'Construction des images (premier lancement : 5 à 15 minutes)…'; $up += '--build' }
  & docker @base @up
  if ($LASTEXITCODE -ne 0) {
    & docker @base logs --no-color --tail 60 recette-init
    Die 'Démarrage impossible (voir ci-dessus).'
  }
  if (-not (Wait-Api)) { & docker @base logs --no-color --tail 60 api; Die "L'API ne répond pas." }
  Show-Access "http://localhost:$RAdmin"
  exit 0
}

# ═════════════════════════════════════════════════════════════════════════════
# Mode sans Docker : Postgres local existant + Node.js 22
# ═════════════════════════════════════════════════════════════════════════════
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
function Stop-Local {
  Get-ChildItem -Path $StateDir -Filter '*.pid' -ErrorAction SilentlyContinue | ForEach-Object {
    $procId = (Get-Content $_.FullName | Select-Object -First 1)
    if ($procId) { & taskkill /PID $procId /T /F *> $null }
    Remove-Item $_.FullName -Force
  }
}
if ($Arreter) { Info 'Arrêt de la recette sans Docker'; Stop-Local; exit 0 }
Stop-Local

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Die 'Node.js 22 est requis (https://nodejs.org).' }
$nodeMajor = [int](& node -p 'process.versions.node.split(''.'')[0]')
if ($nodeMajor -lt 20) { Die "Node.js 22 est requis (trouvé : $(& node -v))." }

$DbUrl = EnvVal 'SANS_DOCKER_DATABASE_URL'
$DbHost = & node -e 'try{console.log(new URL(process.argv[1]).hostname)}catch(e){console.log()}' $DbUrl
if ($DbHost -ne 'localhost' -and $DbHost -ne '127.0.0.1') { Die "SANS_DOCKER_DATABASE_URL doit viser localhost ou 127.0.0.1 (reçu « $DbHost »)." }
$DbName = & node -e 'console.log(new URL(process.argv[1]).pathname.slice(1))' $DbUrl
$AdminUrl = & node -e 'const u=new URL(process.argv[1]);u.pathname=''/postgres'';u.search='''';console.log(u.toString())' $DbUrl
if (Get-Command psql -ErrorAction SilentlyContinue) {
  if ($Reinitialiser) {
    if ($DbName -notmatch 'recette') { Die "Par sécurité, seule une base dont le nom contient « recette » peut être réinitialisée (reçu « $DbName »)." }
    Info "Suppression puis recréation de la base « $DbName »"
    & psql $AdminUrl -v ON_ERROR_STOP=1 -c "drop database if exists $DbName" -c "create database $DbName"
    if ($LASTEXITCODE -ne 0) { Die 'Réinitialisation de la base impossible.' }
  } else {
    $exists = & psql $AdminUrl -Atc "select 1 from pg_database where datname='$DbName'" 2>$null
    if ($exists -ne '1') { Info "Création de la base « $DbName »"; & psql $AdminUrl -c "create database $DbName" *> $null }
  }
} elseif ($Reinitialiser) { Die '-Reinitialiser sans Docker demande psql.' }

foreach ($d in '.', 'mobile-steve', 'admin') {
  if (-not (Test-Path (Join-Path $d 'node_modules'))) {
    Info "Installation des dépendances ($d)"
    Push-Location $d
    & npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/ --replace-registry-host=registry.npmmirror.com
    $code = $LASTEXITCODE; Pop-Location
    if ($code -ne 0) { Die "npm ci a échoué dans $d." }
  }
}

# Environnement de l'API : .env.recette, puis valeurs forcées (base, sécurité).
Get-Content $EnvFile -Encoding UTF8 | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
  $i = $_.IndexOf('='); Set-Item -Path ("Env:" + $_.Substring(0, $i)) -Value ($_.Substring($i + 1).Trim('"'))
}
$env:DATABASE_URL = $DbUrl; $env:DIRECT_URL = $DbUrl; $env:NODE_ENV = 'production'; $env:PORT = $RApi; $env:INTERVIEW_VERSION = '8.2'
foreach ($v in 'DB_TRANSFER_TARGET_URL','RESEND_API_KEY','SENDGRID_API_KEY','BREVO_API_KEY','SENDINBLUE_API_KEY','SMTP_HOST','SAFETY_ALERT_EMAILS','BILLING_ALERT_EMAILS','GROQ_API_KEY','OPENROUTER_AUTH','NODE_USE_ENV_PROXY','DAILY_API_KEY','COMPANIES_HOUSE_API_KEY','GOOGLE_CLIENT_IDS','FACEBOOK_APP_ID','FACEBOOK_APP_SECRET','OPENROUTER_API_KEY','OPENROUTER_BASE_URL') {
  Remove-Item "Env:$v" -ErrorAction SilentlyContinue
}
$env:HARMONY_QUESTIONS_SOURCE = 'bank'
if ($FauxIA) {
  Info 'Faux OpenRouter local sur le port 8799'
  $p = Start-Process -PassThru -WindowStyle Hidden node -ArgumentList 'mobile-steve/e2e/fake-openrouter.js', '8799' -RedirectStandardOutput "$StateAbs/faux-openrouter.log" -RedirectStandardError "$StateAbs/faux-openrouter.err.log"
  $p.Id | Set-Content "$StateDir/faux-openrouter.pid"
  $env:OPENROUTER_API_KEY = 'stub-local'; $env:OPENROUTER_BASE_URL = 'http://localhost:8799/api/v1'; $env:HARMONY_QUESTIONS_SOURCE = 'ai'
}

Info "Client Prisma et compilation de l'API"
& node node_modules/prisma/build/index.js generate | Out-Null; if ($LASTEXITCODE -ne 0) { Die 'prisma generate a échoué.' }
& node node_modules/@nestjs/cli/bin/nest.js build; if ($LASTEXITCODE -ne 0) { Die "Compilation de l'API impossible." }

Info 'Schéma (base vide uniquement) et membres fictifs'
& node deploy/recette-init.js; if ($LASTEXITCODE -ne 0) { Die 'Initialisation de la base impossible.' }

Info "Démarrage de l'API (journal : $StateDir\api.log)"
$p = Start-Process -PassThru -WindowStyle Hidden node -ArgumentList 'dist/main.js' -RedirectStandardOutput "$StateAbs/api.log" -RedirectStandardError "$StateAbs/api.err.log"
$p.Id | Set-Content "$StateDir/api.pid"

Info "Export de l'application web (1 à 3 minutes)…"
$env:EXPO_PUBLIC_API_URL = "http://localhost:$RApi/api"; $env:EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = $PK; $env:CI = '1'; $env:EXPO_NO_TELEMETRY = '1'
Push-Location mobile-steve
& npx expo export --platform web --output-dir "../$StateDir/web" *> "../$StateDir/web-export.log"
$code = $LASTEXITCODE; Pop-Location
if ($code -ne 0) { Die "Export web impossible (voir $StateDir\web-export.log)." }
$p = Start-Process -PassThru -WindowStyle Hidden node -ArgumentList 'mobile-steve/e2e/static-server.js', "$StateAbs/web", $RWeb -RedirectStandardOutput "$StateAbs/web.log" -RedirectStandardError "$StateAbs/web.err.log"
$p.Id | Set-Content "$StateDir/web.pid"

Info "Démarrage de l'admin (Next.js, port 3001 ; journal : $StateDir\admin.log)"
$env:NEXT_PUBLIC_API_URL = "http://localhost:$RApi/api"; $env:NEXT_PUBLIC_WEB_URL = "http://localhost:$RWeb"; $env:NEXT_TELEMETRY_DISABLED = '1'
$p = Start-Process -PassThru -WindowStyle Hidden -WorkingDirectory admin node -ArgumentList 'node_modules/next/dist/bin/next', 'dev', '-p', '3001' -RedirectStandardOutput "$StateAbs/admin.log" -RedirectStandardError "$StateAbs/admin.err.log"
$p.Id | Set-Content "$StateDir/admin.pid"

if (-not (Wait-Api)) { Die "L'API ne répond pas (voir $StateDir\api.log)." }
Show-Access 'http://localhost:3001'
