# ─────────────────────────────────────────────────────────────────────────────
# BOLIGO — RECETTE LOCALE en une commande (Windows PowerShell). Voir docs/RECETTE_LOCALE.md.
#
#   .\recette.ps1                  démarre tout avec Docker Desktop (base, API, web, admin)
#   .\recette.ps1 -FauxIA          idem + faux OpenRouter local (aucun appel réel)
#   .\recette.ps1 -SansDocker      Postgres local existant + Node.js 22 (npm)
#   .\recette.ps1 -Arreter         arrête la recette (les données sont gardées)
#   .\recette.ps1 -Reinitialiser   supprime la base de recette puis relance tout
#   .\recette.ps1 -SansBuild       (Docker) réutilise les images déjà construites
#   .\recette.ps1 -Aide            affiche cette aide
#
# Si Windows refuse le script : powershell -ExecutionPolicy Bypass -File .\recette.ps1
# Compatible Windows PowerShell 5.1 et PowerShell 7. Ce fichier est en UTF-8
# AVEC BOM et fins de ligne CRLF (voir .gitattributes) : sans BOM,
# PowerShell 5.1 lirait mal les accents.
#
# Ports (modifiables dans .env.recette) : API 3000, web 8080, admin 8081,
# base DB_PORT (55432), faux OpenRouter 8799 ; tous liés à 127.0.0.1 seulement.
#
# Garanties : base LOCALE uniquement, secrets FACTICES (.env.recette), aucun
# e-mail réel, aucune IA réelle, Stripe en mode TEST seulement (clé sk_test_)
# ou paiement indisponible / code promo gratuit ; toute clé « live » est refusée.
# ─────────────────────────────────────────────────────────────────────────────
[Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSAvoidUsingWriteHost', '', Justification = 'Script interactif : messages en couleur pour la personne qui lance la recette.')]
[CmdletBinding()]
param(
  [switch]$SansDocker,
  [switch]$FauxIA,
  [switch]$Arreter,
  [switch]$Reinitialiser,
  [switch]$SansBuild,
  [Alias('Help')]
  [switch]$Aide
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

$Root = $PSScriptRoot
if (-not $Root) { $Root = Split-Path -Parent $MyInvocation.MyCommand.Path }

if ($Aide) {
  Write-Host @'
BOLIGO, recette locale (Windows PowerShell 5.1 ou PowerShell 7)

  .\recette.ps1                  démarre tout avec Docker Desktop (base, API, web, admin)
  .\recette.ps1 -FauxIA          idem + faux OpenRouter local (aucun appel réel)
  .\recette.ps1 -SansDocker      Postgres local existant + Node.js 22 (npm)
  .\recette.ps1 -Arreter         arrête la recette (les données sont gardées)
  .\recette.ps1 -Reinitialiser   supprime la base de recette puis relance tout
  .\recette.ps1 -SansBuild       (Docker) réutilise les images déjà construites
  .\recette.ps1 -Aide            affiche cette aide

Si Windows refuse le script : powershell -ExecutionPolicy Bypass -File .\recette.ps1
Ports : API 3000, web 8080, admin 8081, base 55432 (modifiables dans .env.recette).
Documentation : docs\RECETTE_LOCALE.md
'@
  exit 0
}

$EstWindows = [Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT
$Project = 'boligo-recette'
$EnvFile = Join-Path $Root '.env.recette'
$StateDir = Join-Path $Root '.recette'
$ComposeBase = Join-Path $Root 'docker-compose.yml'
$ComposeRecette = Join-Path $Root 'docker-compose.recette.yml'
$AdminDevPort = 3001

function Fail([string]$msg) { Write-Host "ERREUR : $msg" -ForegroundColor Red; exit 2 }
function Info([string]$msg) { Write-Host "> $msg" -ForegroundColor Cyan }
function Rand() {
  $b = New-Object byte[] 24
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($b) } finally { $rng.Dispose() }
  return ($b | ForEach-Object { $_.ToString('x2') }) -join ''
}
# Chemin construit pièce par pièce (Join-Path n'accepte que deux morceaux en 5.1).
function Chemin([string]$Base, [string[]]$Suite) {
  $p = $Base
  foreach ($s in $Suite) { $p = Join-Path $p $s }
  return $p
}
# Argument de ligne de commande pour Start-Process (chemins avec espaces).
function Arg([string]$s) {
  if ($s -match '[\s"]') { return '"' + ($s -replace '"', '\"') + '"' }
  return $s
}
# Commande native dont la sortie d'erreur est redirigée : en Windows
# PowerShell 5.1, avec ErrorActionPreference = Stop, la moindre ligne sur
# stderr (avertissement de docker, psql, taskkill…) arrêterait le script.
# Le code de retour reste lisible dans $LASTEXITCODE.
function Invoke-Natif([scriptblock]$Bloc) {
  $ancien = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try { & $Bloc } finally { $ErrorActionPreference = $ancien }
}

# Port déjà en écoute sur cette machine ? Get-NetTCPConnection (Windows 8+),
# puis, en repli, tentative de connexion locale IPv4 et IPv6.
function Test-PortOccupe([int]$Port) {
  if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    $ecoute = $null
    try { $ecoute = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue } catch { $ecoute = $null }
    if ($ecoute) { return $true }
  }
  $cibles = @(
    @{ Hote = '127.0.0.1'; Famille = [Net.Sockets.AddressFamily]::InterNetwork },
    @{ Hote = '::1'; Famille = [Net.Sockets.AddressFamily]::InterNetworkV6 }
  )
  foreach ($c in $cibles) {
    $client = $null
    try {
      $client = New-Object Net.Sockets.TcpClient($c.Famille)
      $essai = $client.BeginConnect($c.Hote, $Port, $null, $null)
      if ($essai.AsyncWaitHandle.WaitOne(400) -and $client.Connected) { return $true }
    } catch {
      Write-Verbose "Port $Port sur $($c.Hote) : $($_.Exception.Message)"
    } finally {
      if ($client) { $client.Close() }
    }
  }
  return $false
}

# Vérifie une liste de ports ; message clair et solution si l'un est pris.
function Assert-PortLibre([object[]]$Ports) {
  $pris = @($Ports | Where-Object { Test-PortOccupe ([int]$_.Port) })
  if ($pris.Count -eq 0) { return }
  foreach ($p in $pris) {
    Write-Host "ERREUR : le port $($p.Port) ($($p.Role)) est déjà utilisé sur cette machine." -ForegroundColor Red
    Write-Host "  Solution : fermer le programme qui l'occupe, ou choisir un autre port dans .env.recette : $($p.Solution)" -ForegroundColor Yellow
  }
  Write-Host '  Pour voir qui occupe un port : Get-NetTCPConnection -State Listen -LocalPort <port> | Select-Object OwningProcess' -ForegroundColor Yellow
  Write-Host '  puis Get-Process -Id <OwningProcess>. Relancer ensuite .\recette.ps1' -ForegroundColor Yellow
  exit 2
}

# ─── Contexte : dossier, encodage de la console, environnement ──────────────
# Tout est rétabli à la fin (bloc finally), même en cas d'erreur.
$EnvAvant = @{}
Get-ChildItem Env: | ForEach-Object { $EnvAvant[$_.Name] = $_.Value }
$EncodageAvant = $null
try { $EncodageAvant = [Console]::OutputEncoding; [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false) } catch { $EncodageAvant = $null }
Push-Location -LiteralPath $Root
try {

# ─── .env.recette (secrets factices) ────────────────────────────────────────
if (-not (Test-Path -LiteralPath $EnvFile)) {
  Info 'Création de .env.recette (secrets factices, jamais versionné)'
  $date = Get-Date -Format 'yyyy-MM-dd HH:mm'
  $content = @"
# BOLIGO — environnement de RECETTE LOCALE, généré par recette.ps1 le $date.
# Secrets FACTICES. Ne jamais y mettre de clé de production (clés live refusées).
# Supprimer ce fichier pour en générer un nouveau.

# ── Docker Compose (ports publiés sur 127.0.0.1 seulement) ──
POSTGRES_USER=boligo
POSTGRES_PASSWORD=$(Rand)
POSTGRES_DB=boligo_recette
POSTGRES_IMAGE=postgres:16
DB_PORT=55432
API_PORT=3000
WEB_PORT=8080
ADMIN_PORT=8081
FAUX_IA_PORT=8799
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
  [IO.File]::WriteAllText($EnvFile, ($content -replace "`r`n", "`n"), (New-Object Text.UTF8Encoding($false)))
}

function EnvVal([string]$name) {
  $line = Get-Content -LiteralPath $EnvFile -Encoding UTF8 | Where-Object { $_ -match "^$name=" } | Select-Object -Last 1
  if (-not $line) { return '' }
  return ($line.Substring($name.Length + 1)).Trim().Trim('"')
}
function PortVal([string]$name, [int]$defaut) {
  $v = EnvVal $name
  if (-not $v) { return $defaut }
  if ($v -notmatch '^\d{1,5}$' -or [int]$v -lt 1 -or [int]$v -gt 65535) { Fail "$name=$v dans .env.recette : un numéro de port (1 à 65535) est attendu." }
  return [int]$v
}

# ─── Garde-fous Stripe et base ──────────────────────────────────────────────
$active = @(Get-Content -LiteralPath $EnvFile -Encoding UTF8 | Where-Object { $_ -notmatch '^\s*#' })
if (@($active -match '(sk|rk|pk)_live_').Count -gt 0) { Fail ".env.recette contient une clé Stripe LIVE (sk_live_/rk_live_/pk_live_) : refusé. La recette n'accepte que le mode TEST." }
$SK = EnvVal 'STRIPE_SECRET_KEY'
$PK = EnvVal 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY'
if ($SK -and -not $SK.StartsWith('sk_test_')) { Fail 'STRIPE_SECRET_KEY doit commencer par sk_test_ (ou rester vide).' }
if ($PK -and -not $PK.StartsWith('pk_test_')) { Fail 'EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY doit commencer par pk_test_ (ou rester vide).' }
if ($SK) { $Paiement = 'Stripe mode TEST (carte 4242 4242 4242 4242)' } else { $Paiement = 'carte indisponible (aucune clé) : code promo RECETTE100 = parcours offert' }

$RApi = PortVal 'API_PORT' 3000
$RWeb = PortVal 'WEB_PORT' 8080
$RAdmin = PortVal 'ADMIN_PORT' 8081
$RDb = PortVal 'DB_PORT' 55432
$RFauxIA = PortVal 'FAUX_IA_PORT' 8799

function Show-Access([string]$adminUrl) {
  Write-Host @"

====================================================================
 RECETTE BOLIGO prête (données FICTIVES, base locale)
--------------------------------------------------------------------
 Application web     http://localhost:$RWeb
 Espace partenaire   http://localhost:$RWeb/espace-partenaire  (EN : /partner-space)
 API                 http://localhost:$RApi/api   (santé : /api/health, doc : /docs)
 Admin               $adminUrl
 (ports ouverts sur 127.0.0.1 seulement : invisibles depuis le réseau)
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
   docs\RECETTE_LOCALE.md, section 4
 Codes promo : RECETTE100 (offert), RECETTE50 (-50 %), codes partenaires DEMO…
 Paiement : $Paiement
 Inscription d'un nouveau compte : code de vérification 1234 (aucun e-mail envoyé)
--------------------------------------------------------------------
 Arrêter : .\recette.ps1 -Arreter    Repartir de zéro : .\recette.ps1 -Reinitialiser
====================================================================
"@ -ForegroundColor Green
}

function Wait-Api {
  # 127.0.0.1 plutôt que localhost : les ports ne sont publiés qu'en IPv4.
  $url = "http://127.0.0.1:$RApi/api/health"
  Info "Attente de l'API ($url)…"
  for ($i = 0; $i -lt 120; $i++) {
    try {
      $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 3 -Uri $url
      if ($r.StatusCode -eq 200) { return $true }
    } catch {
      Write-Verbose "API pas encore prête : $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 2
  }
  return $false
}

# ═════════════════════════════════════════════════════════════════════════════
# Mode Docker
# ═════════════════════════════════════════════════════════════════════════════
if (-not $SansDocker) {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Fail 'Docker est introuvable : installez Docker Desktop (docs\RECETTE_LOCALE.md), ou utilisez -SansDocker.' }
  $cv = Invoke-Natif { & docker compose version --short 2>$null }
  if ($LASTEXITCODE -ne 0 -or -not $cv) { Fail '« docker compose » est introuvable : mettez Docker Desktop à jour.' }
  Invoke-Natif { & docker info *> $null }
  if ($LASTEXITCODE -ne 0) { Fail 'Docker ne répond pas : démarrez Docker Desktop (moteur WSL 2), attendez « Engine running », puis relancez.' }
  $cv = ([string]($cv | Select-Object -First 1)).Trim() -replace '^v', ''
  if ($cv -notmatch '^(\d+)\.(\d+)') { Fail "Version de Docker Compose illisible (« $cv ») : mettez Docker Desktop à jour." }
  if ([int]$Matches[1] -lt 2 -or ([int]$Matches[1] -eq 2 -and [int]$Matches[2] -lt 24)) { Fail "Docker Compose $cv trop ancien (2.24 minimum) : mettez Docker Desktop à jour." }

  # Les variables du shell priment sur --env-file : on les retire (pour ce
  # script seulement, elles sont rétablies à la fin).
  foreach ($v in 'API_DATABASE_URL','API_DIRECT_URL','API_ENV_FILE','DATABASE_URL','DIRECT_URL','POSTGRES_USER','POSTGRES_PASSWORD','POSTGRES_DB','POSTGRES_IMAGE','DB_PORT','API_PORT','WEB_PORT','ADMIN_PORT','FAUX_IA_PORT','PUBLIC_API_URL','PUBLIC_WEB_URL','PUBLIC_ADMIN_URL','APP_VERSION','EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY','RECETTE_OPENROUTER_API_KEY','RECETTE_OPENROUTER_BASE_URL','RECETTE_HARMONY_QUESTIONS_SOURCE') {
    Remove-Item "Env:$v" -ErrorAction SilentlyContinue
  }
  $profiles = @('--profile', 'admin')
  if ($FauxIA) {
    $profiles += @('--profile', 'faux-ia')
    $env:RECETTE_OPENROUTER_API_KEY = 'stub-local'
    $env:RECETTE_OPENROUTER_BASE_URL = 'http://faux-openrouter:8799/api/v1'
    $env:RECETTE_HARMONY_QUESTIONS_SOURCE = 'ai'
  }
  $base = @('compose', '-p', $Project, '--env-file', $EnvFile, '-f', $ComposeBase, '-f', $ComposeRecette) + $profiles

  if ($Arreter) {
    Info 'Arrêt de la recette (données gardées)'
    & docker @base --profile faux-ia down
    exit $LASTEXITCODE
  }
  if ($Reinitialiser) {
    Info "Suppression des conteneurs et de la base de recette (volume ${Project}_recette_pgdata)"
    & docker @base --profile faux-ia down -v --remove-orphans
    if ($LASTEXITCODE -ne 0) { Fail 'Suppression de la recette impossible (voir ci-dessus).' }
  }

  # Ports libres ? Inutile si la recette tourne déjà (ils sont alors à elle).
  $enCours = Invoke-Natif { & docker @base --profile faux-ia ps -q 2>$null }
  if (-not $enCours) {
    $ports = @(
      @{ Port = $RApi; Role = 'API'; Solution = 'API_PORT=3010 et PUBLIC_API_URL=http://localhost:3010/api' },
      @{ Port = $RWeb; Role = 'application web'; Solution = 'WEB_PORT=8090 et PUBLIC_WEB_URL, WEB_APP_URL, APP_URL=http://localhost:8090' },
      @{ Port = $RAdmin; Role = 'admin'; Solution = 'ADMIN_PORT=8091 et ADMIN_ALLOWED_ORIGINS=http://localhost:8091,http://localhost:3001' },
      @{ Port = $RDb; Role = 'base Postgres'; Solution = 'DB_PORT=55433' }
    )
    if ($FauxIA) { $ports += @{ Port = $RFauxIA; Role = 'faux OpenRouter'; Solution = 'FAUX_IA_PORT=8798' } }
    Assert-PortLibre $ports
  }

  Info 'Démarrage : base, création du schéma + membres fictifs, API, web, admin'
  $up = @('up', '-d', '--remove-orphans')
  if (-not $SansBuild) { Info 'Construction des images (premier lancement : 5 à 15 minutes)…'; $up += '--build' }
  & docker @base @up
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host "Journal de l'initialisation :"
    Invoke-Natif { & docker @base logs --no-color --tail 60 recette-init }
    Fail 'Démarrage impossible (voir ci-dessus). Message « ports are not available » : voir docs\RECETTE_LOCALE.md, Windows.'
  }
  # Liens et comptes imprimés par les seeds (comme recette.sh).
  $journal = @(Invoke-Natif { & docker @base logs --no-color recette-init 2>$null })
  $debut = -1
  for ($i = 0; $i -lt $journal.Count; $i++) { if ("$($journal[$i])" -match 'Données de recette prêtes') { $debut = $i; break } }
  if ($debut -ge 0) { $journal[$debut..($journal.Count - 1)] | ForEach-Object { "$_" -replace '^[^|]*\| ', '' } | Write-Host }
  if (-not (Wait-Api)) { Invoke-Natif { & docker @base logs --no-color --tail 60 api }; Fail "L'API ne répond pas." }
  Show-Access "http://localhost:$RAdmin"
  exit 0
}

# ═════════════════════════════════════════════════════════════════════════════
# Mode sans Docker : Postgres local existant + Node.js 22
# ═════════════════════════════════════════════════════════════════════════════
New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
function Invoke-ArretLocal {
  Get-ChildItem -LiteralPath $StateDir -Filter '*.pid' -ErrorAction SilentlyContinue | ForEach-Object {
    $procId = Get-Content -LiteralPath $_.FullName | Select-Object -First 1
    if ($procId -match '^\d+$') {
      # Le processus et ses enfants (node → next, etc.).
      if ($EstWindows) { Invoke-Natif { & taskkill /PID $procId /T /F *> $null } }
      else { Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item -LiteralPath $_.FullName -Force
  }
}
if ($Arreter) { Info 'Arrêt de la recette sans Docker'; Invoke-ArretLocal; exit 0 }
Invoke-ArretLocal

$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $NodeCmd) { Fail 'Node.js 22 est requis (https://nodejs.org).' }
$NodeExe = $NodeCmd.Source
$nodeMajor = [int](& $NodeExe -p 'process.versions.node.split(''.'')[0]')
if ($nodeMajor -lt 20) { Fail "Node.js 22 est requis (trouvé : $(& $NodeExe -v))." }
if ($EstWindows) { $Npm = 'npm.cmd' } else { $Npm = 'npm' }

$ports = @(
  @{ Port = $RApi; Role = 'API'; Solution = 'API_PORT=3010' },
  @{ Port = $RWeb; Role = 'application web'; Solution = 'WEB_PORT=8090 et WEB_APP_URL, APP_URL, PUBLIC_WEB_URL=http://localhost:8090' },
  @{ Port = $AdminDevPort; Role = 'admin (Next.js)'; Solution = "port fixe : libérer le port $AdminDevPort" }
)
if ($FauxIA) { $ports += @{ Port = 8799; Role = 'faux OpenRouter'; Solution = 'port fixe : libérer le port 8799' } }
Assert-PortLibre $ports

$DbUrl = EnvVal 'SANS_DOCKER_DATABASE_URL'
if (-not $DbUrl) { Fail 'SANS_DOCKER_DATABASE_URL est vide dans .env.recette.' }
$DbHost = & $NodeExe -e 'try{console.log(new URL(process.argv[1]).hostname)}catch(e){console.log()}' $DbUrl
if ($DbHost -ne 'localhost' -and $DbHost -ne '127.0.0.1') { Fail "SANS_DOCKER_DATABASE_URL doit viser localhost ou 127.0.0.1 (reçu « $DbHost »)." }
$DbName = & $NodeExe -e 'console.log(new URL(process.argv[1]).pathname.slice(1))' $DbUrl
if ($DbName -notmatch '^[A-Za-z0-9_]+$') { Fail "Nom de base « $DbName » refusé : lettres, chiffres et _ seulement." }
$AdminUrl = & $NodeExe -e 'const u=new URL(process.argv[1]);u.pathname=''/postgres'';u.search='''';console.log(u.toString())' $DbUrl
if (Get-Command psql -ErrorAction SilentlyContinue) {
  if ($Reinitialiser) {
    if ($DbName -notmatch 'recette') { Fail "Par sécurité, seule une base dont le nom contient « recette » peut être réinitialisée (reçu « $DbName »)." }
    Info "Suppression puis recréation de la base « $DbName »"
    Invoke-Natif { & psql $AdminUrl -v ON_ERROR_STOP=1 -c "drop database if exists $DbName" -c "create database $DbName" }
    if ($LASTEXITCODE -ne 0) { Fail 'Réinitialisation de la base impossible.' }
  } else {
    $exists = Invoke-Natif { & psql $AdminUrl -Atc "select 1 from pg_database where datname='$DbName'" 2>$null }
    if ("$exists".Trim() -ne '1') {
      Info "Création de la base « $DbName »"
      Invoke-Natif { & psql $AdminUrl -c "create database $DbName" *> $null }
    }
  }
} elseif ($Reinitialiser) { Fail '-Reinitialiser sans Docker demande psql.' }

foreach ($d in '.', 'mobile-steve', 'admin') {
  $dossier = Join-Path $Root $d
  if (-not (Test-Path -LiteralPath (Join-Path $dossier 'node_modules'))) {
    Info "Installation des dépendances ($d)"
    Push-Location -LiteralPath $dossier
    try {
      Invoke-Natif { & $Npm ci --no-audit --no-fund --registry=https://registry.npmjs.org/ --replace-registry-host=registry.npmmirror.com }
      $code = $LASTEXITCODE
    } finally { Pop-Location }
    if ($code -ne 0) { Fail "npm ci a échoué dans $d." }
  }
}

# Environnement de l'API : .env.recette, puis valeurs forcées (base, sécurité).
# Ces variables ne valent que pour ce script et les processus qu'il lance.
Get-Content -LiteralPath $EnvFile -Encoding UTF8 | Where-Object { $_ -match '^[A-Za-z_][A-Za-z0-9_]*=' } | ForEach-Object {
  $i = $_.IndexOf('=')
  $valeur = $_.Substring($i + 1).Trim().Trim('"')
  $nom = $_.Substring(0, $i)
  if ($valeur) { Set-Item -LiteralPath "Env:$nom" -Value $valeur } else { Remove-Item -LiteralPath "Env:$nom" -ErrorAction SilentlyContinue }
}
$env:DATABASE_URL = $DbUrl; $env:DIRECT_URL = $DbUrl; $env:NODE_ENV = 'production'; $env:PORT = "$RApi"; $env:INTERVIEW_VERSION = '8.2'
# Écoute sur 127.0.0.1 : effective pour l'admin (next dev -H). LISTEN_HOST est
# préparé pour l'API et les serveurs mobile-steve/e2e, qui ne le lisent pas encore.
$env:LISTEN_HOST = '127.0.0.1'
foreach ($v in 'DB_TRANSFER_TARGET_URL','RESEND_API_KEY','SENDGRID_API_KEY','BREVO_API_KEY','SENDINBLUE_API_KEY','SMTP_HOST','SAFETY_ALERT_EMAILS','BILLING_ALERT_EMAILS','GROQ_API_KEY','OPENROUTER_AUTH','NODE_USE_ENV_PROXY','DAILY_API_KEY','COMPANIES_HOUSE_API_KEY','GOOGLE_CLIENT_IDS','FACEBOOK_APP_ID','FACEBOOK_APP_SECRET','OPENROUTER_API_KEY','OPENROUTER_BASE_URL') {
  Remove-Item "Env:$v" -ErrorAction SilentlyContinue
}
$env:HARMONY_QUESTIONS_SOURCE = 'bank'

# Processus Node en arrière-plan ; PID et journaux dans .recette\.
function Invoke-NodeFond([string]$Nom, [string]$Dossier, [string[]]$Arguments) {
  $params = @{
    FilePath = $NodeExe
    ArgumentList = (($Arguments | ForEach-Object { Arg $_ }) -join ' ')
    WorkingDirectory = $Dossier
    RedirectStandardOutput = (Join-Path $StateDir "$Nom.log")
    RedirectStandardError = (Join-Path $StateDir "$Nom.err.log")
    PassThru = $true
  }
  if ($EstWindows) { $params.WindowStyle = 'Hidden' }
  $p = Start-Process @params
  Set-Content -LiteralPath (Join-Path $StateDir "$Nom.pid") -Value $p.Id
}

if ($FauxIA) {
  Info 'Faux OpenRouter local sur le port 8799 (127.0.0.1)'
  Invoke-NodeFond -Nom 'faux-openrouter' -Dossier $Root -Arguments @((Chemin $Root 'mobile-steve', 'e2e', 'fake-openrouter.js'), '8799')
  $env:OPENROUTER_API_KEY = 'stub-local'; $env:OPENROUTER_BASE_URL = 'http://127.0.0.1:8799/api/v1'; $env:HARMONY_QUESTIONS_SOURCE = 'ai'
}

Info "Client Prisma et compilation de l'API"
& $NodeExe (Chemin $Root 'node_modules', 'prisma', 'build', 'index.js') generate | Out-Null
if ($LASTEXITCODE -ne 0) { Fail 'prisma generate a échoué.' }
& $NodeExe (Chemin $Root 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js') build
if ($LASTEXITCODE -ne 0) { Fail "Compilation de l'API impossible." }

Info 'Schéma (base vide uniquement) et membres fictifs'
& $NodeExe (Chemin $Root 'deploy', 'recette-init.js')
if ($LASTEXITCODE -ne 0) { Fail 'Initialisation de la base impossible.' }

Info "Démarrage de l'API (journal : .recette\api.log)"
Invoke-NodeFond -Nom 'api' -Dossier $Root -Arguments @((Chemin $Root 'dist', 'main.js'))

Info "Export de l'application web (1 à 3 minutes)…"
$env:EXPO_PUBLIC_API_URL = "http://localhost:$RApi/api"; $env:CI = '1'; $env:EXPO_NO_TELEMETRY = '1'
if ($PK) { $env:EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY = $PK } else { Remove-Item Env:EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY -ErrorAction SilentlyContinue }
$WebDir = Join-Path $StateDir 'web'
$MobileDir = Join-Path $Root 'mobile-steve'
$export = @{
  FilePath = $NodeExe
  ArgumentList = ((@((Chemin $MobileDir 'node_modules', 'expo', 'bin', 'cli'), 'export', '--platform', 'web', '--output-dir', $WebDir) | ForEach-Object { Arg $_ }) -join ' ')
  WorkingDirectory = $MobileDir
  RedirectStandardOutput = (Join-Path $StateDir 'web-export.log')
  RedirectStandardError = (Join-Path $StateDir 'web-export.err.log')
  PassThru = $true
  Wait = $true
}
if ($EstWindows) { $export.NoNewWindow = $true }
$p = Start-Process @export
if ($p.ExitCode -ne 0) { Fail 'Export web impossible (voir .recette\web-export.log et .recette\web-export.err.log).' }
Invoke-NodeFond -Nom 'web' -Dossier $Root -Arguments @((Chemin $Root 'mobile-steve', 'e2e', 'static-server.js'), $WebDir, "$RWeb")

Info "Démarrage de l'admin (Next.js, port $AdminDevPort ; journal : .recette\admin.log)"
$env:NEXT_PUBLIC_API_URL = "http://localhost:$RApi/api"; $env:NEXT_PUBLIC_WEB_URL = "http://localhost:$RWeb"; $env:NEXT_TELEMETRY_DISABLED = '1'
$AdminDir = Join-Path $Root 'admin'
Invoke-NodeFond -Nom 'admin' -Dossier $AdminDir -Arguments @((Chemin $AdminDir 'node_modules', 'next', 'dist', 'bin', 'next'), 'dev', '-p', "$AdminDevPort", '-H', '127.0.0.1')

if (-not (Wait-Api)) { Fail "L'API ne répond pas (voir .recette\api.log et .recette\api.err.log)." }
Show-Access "http://localhost:$AdminDevPort"
exit 0

} finally {
  # Environnement de la session PowerShell rétabli tel qu'avant le script.
  Get-ChildItem Env: | ForEach-Object { if (-not $EnvAvant.ContainsKey($_.Name)) { Remove-Item -LiteralPath "Env:$($_.Name)" -ErrorAction SilentlyContinue } }
  foreach ($k in $EnvAvant.Keys) { Set-Item -LiteralPath "Env:$k" -Value $EnvAvant[$k] }
  if ($EncodageAvant) { try { [Console]::OutputEncoding = $EncodageAvant } catch { Write-Verbose 'Encodage de la console non rétabli.' } }
  Pop-Location
}
