<#
.SYNOPSIS
  Sauvegarde chiffrée et vérifiée des données BOLIGO (Supabase), pour Windows.

.DESCRIPTION
  Projet Supabase « Lunis-hash's Project » (hhnnsevawhhtzdffnomv), partagé avec
  OWEKE. La sauvegarde ne contient QUE les données BOLIGO :
    - schéma public : les 32 tables Prisma de BOLIGO, leurs types et le
      déclencheur d'immutabilité de la version d'entretien ;
    - exclus : toute autre table du schéma public (ex. « documents », OWEKE),
      les schémas oweke et oweke_test, et les schémas Supabase (auth, storage…),
      que BOLIGO n'utilise pas.
  Ce n'est PAS une sauvegarde complète du projet Supabase.

  Garanties :
    - lecture seule sur Supabase ;
    - aucun fichier de données en clair : pg_dump est chiffré à la volée par
      gpg (AES-256) ; la vérification relit l'archive en flux, en mémoire ;
    - mot de passe saisi masqué, jamais en argument ni à l'écran, effacé à la fin ;
    - refus d'écrire dans un dépôt git ou un dossier synchronisé (OneDrive…) ;
    - vérification : empreinte SHA-256, contenu de l'archive (32 tables BOLIGO,
      aucune table étrangère), relecture complète des données et comparaison
      du nombre de lignes de chaque table avec la base.

  Prérequis Windows :
    - PostgreSQL 17 « Command Line Tools » (pg_dump, pg_restore, psql) ;
    - Gpg4win (gpg) ; la phrase de passe est demandée par sa fenêtre et doit
      être conservée hors de cet ordinateur.
  Paramètres de connexion : Supabase → Connect → « Session pooler ».

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\sauvegarde-boligo.ps1 -Hote aws-0-eu-central-1.pooler.supabase.com
#>
param(
  [Parameter(Mandatory = $true)][string]$Hote,
  [string]$Dossier = (Join-Path $HOME 'BOLIGO-sauvegardes'),
  [string]$PgBin = '',
  [int]$Port = 5432,
  [string]$Utilisateur = 'postgres.hhnnsevawhhtzdffnomv',
  [string]$Base = 'postgres',
  # Réservé aux essais du script sur une base locale jetable.
  [switch]$EssaiLocal
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# Les 32 tables BOLIGO (modèles Prisma de prisma/schema.prisma).
$TablesBoligo = @(
  'User', 'Profile', 'InterviewIA', 'ModuleResponse', 'MentalMap', 'MatchProposal',
  'Journey', 'HarmonyQuestion', 'JourneyInsight', 'HarmonyResponse', 'Message',
  'Report', 'CreditTransaction', 'PromoCode', 'PartnerDailyStat', 'PromoUsage',
  'BillingProfile', 'Payment', 'Invoice', 'WithdrawalRequest', 'StripeEvent',
  'VideoSession', 'ContactExchange', 'AlumniCouple', 'Notification', 'JobOffer',
  'JobApplication', 'PartnerApplication', 'PartnerOffer', 'PartnerOfferStat',
  'AiSpend', 'GeoRegion'
)

function Stop-Sauvegarde([string]$message) { throw "ARRÊT : $message" }
$SurWindows = ($PSVersionTable.PSEdition -eq 'Desktop') -or $IsWindows

# Exécute une chaîne de commandes reliées par « | » via l'interpréteur natif,
# pour que les flux binaires (pg_dump → gpg) ne passent jamais par PowerShell.
function Invoke-Chaine([string]$ligne) {
  if ($SurWindows) { & cmd.exe /d /c $ligne } else { & /bin/sh -c $ligne }
  if ($LASTEXITCODE -ne 0) { Stop-Sauvegarde "commande en échec (code $LASTEXITCODE)." }
}
function Get-Outil([string]$nom) {
  if ($PgBin -and ($nom -ne 'gpg')) {
    $p = Join-Path $PgBin ($(if ($SurWindows) { "$nom.exe" } else { $nom }))
    if (Test-Path $p) { return $p }
  }
  $c = Get-Command $nom -ErrorAction SilentlyContinue
  if (-not $c) { Stop-Sauvegarde "$nom introuvable (installer PostgreSQL 17 Command Line Tools et Gpg4win)." }
  return $c.Source
}
function Q([string]$s) { '"' + $s + '"' }

# ── 1. Contrôles préalables (aucun accès réseau) ─────────────────────────────
if ($EssaiLocal) {
  if ($Hote -ne '127.0.0.1') { Stop-Sauvegarde 'mode essai : base locale 127.0.0.1 uniquement.' }
} elseif ($Hote -notmatch '^[a-z0-9-]+\.pooler\.supabase\.com$' -or $Utilisateur -ne 'postgres.hhnnsevawhhtzdffnomv') {
  Stop-Sauvegarde 'hôte ou utilisateur inattendu (Session pooler du projet hhnnsevawhhtzdffnomv attendu).'
}
$pgDump = Get-Outil 'pg_dump'; $pgRestore = Get-Outil 'pg_restore'; $psql = Get-Outil 'psql'; $gpg = Get-Outil 'gpg'
$version = [int]((& $pgDump --version) -replace '^\D*(\d+).*$', '$1')
if ($version -lt 17 -and -not $EssaiLocal) { Stop-Sauvegarde "pg_dump $version < 17 (version du serveur Supabase)." }

New-Item -ItemType Directory -Force -Path $Dossier | Out-Null
$Dossier = (Resolve-Path $Dossier).Path
if ($Dossier -match '(?i)onedrive|dropbox|google drive|icloud') { Stop-Sauvegarde 'dossier synchronisé dans le cloud : choisir un dossier local.' }
$d = $Dossier
while ($d) {
  if (Test-Path (Join-Path $d '.git')) { Stop-Sauvegarde "$Dossier est dans un dépôt git : aucune donnée personnelle dans GitHub." }
  $parent = Split-Path $d -Parent
  if ($parent -eq $d) { break }; $d = $parent
}

# ── 2. Connexion : mot de passe masqué, uniquement dans l'environnement ──────
$sec = $null
if (-not ($EssaiLocal -and $env:PGPASSWORD)) {   # essais automatisés : mot de passe local déjà fourni
  $sec = Read-Host 'Mot de passe de la base (non affiché)' -AsSecureString
  $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}
$env:PGHOST = $Hote; $env:PGPORT = "$Port"; $env:PGUSER = $Utilisateur; $env:PGDATABASE = $Base
$env:PGSSLMODE = $(if ($EssaiLocal) { 'prefer' } else { 'require' })
$env:PGOPTIONS = '-c default_transaction_read_only=on'   # lecture seule garantie côté serveur

$archive = $null; $verifiee = $false
try {
  function Invoke-Sql([string]$sql) {
    $r = & $psql -X -A -t -v ON_ERROR_STOP=1 -c $sql
    if ($LASTEXITCODE -ne 0) { Stop-Sauvegarde 'requête de contrôle en échec (connexion ?).' }
    return $r
  }
  function Get-Comptes {
    $parts = $TablesBoligo | ForEach-Object { "SELECT '$_' AS t, count(*) AS n FROM public.""$_""" }
    $h = @{}
    foreach ($l in (Invoke-Sql (($parts -join ' UNION ALL ') + ';'))) {
      if ($l) { $t, $n = $l -split '\|'; $h[$t] = [int64]$n }
    }
    return $h
  }

  # ── 3. Inventaire : tables BOLIGO présentes, tables étrangères exclues ──────
  $public = @(Invoke-Sql "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1;" | Where-Object { $_ })
  $absentes = @($TablesBoligo | Where-Object { $public -notcontains $_ })
  if ($absentes.Count) { Stop-Sauvegarde "tables BOLIGO absentes : $($absentes -join ', '). Mauvais projet ?" }
  $etrangeres = @($public | Where-Object { $TablesBoligo -notcontains $_ })
  Write-Host "Tables BOLIGO : $($TablesBoligo.Count). Tables du schéma public exclues (non BOLIGO) : $(if ($etrangeres.Count) { $etrangeres -join ', ' } else { 'aucune' })."
  Write-Host 'Schémas exclus : oweke, oweke_test (OWEKE) et schémas Supabase (auth, storage…), non utilisés par BOLIGO.'

  $avant = Get-Comptes

  # ── 4. Export chiffré à la volée (aucune donnée en clair sur le disque) ─────
  $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
  $archive = Join-Path $Dossier "boligo-$stamp.dump.gpg"
  # Nom exact de chaque table exclue (guillemets SQL si majuscules), protégé pour cmd.exe ou sh.
  $exclusions = ($etrangeres | ForEach-Object {
      if ($_ -cmatch '^[a-z0-9_]+$') { "--exclude-table=public.$_" }
      elseif ($SurWindows) { '"--exclude-table=public.\"' + $_ + '\""' }
      else { "'--exclude-table=public.""$_""'" }
    }) -join ' '
  Write-Host 'Export et chiffrement AES-256 (gpg va demander une phrase de passe)…'
  Invoke-Chaine ("$(Q $pgDump) --format=custom --no-owner --no-privileges --schema=public $exclusions | " +
                 "$(Q $gpg) --symmetric --cipher-algo AES256 --output $(Q $archive)")
  $apres = Get-Comptes
  $hash = (Get-FileHash -Algorithm SHA256 $archive).Hash.ToLower()
  Set-Content -Path "$archive.sha256" -Value "$hash  $(Split-Path $archive -Leaf)" -Encoding ascii

  # ── 5. Vérifications (relecture en flux, en mémoire) ─────────────────────────
  Write-Host 'Vérification 1/3 : empreinte SHA-256…'
  if ((Get-FileHash -Algorithm SHA256 $archive).Hash.ToLower() -ne $hash) { Stop-Sauvegarde 'empreinte différente.' }

  Write-Host 'Vérification 2/3 : contenu de l''archive…'
  $toc = @(Invoke-Chaine "$(Q $gpg) --quiet --decrypt $(Q $archive) | $(Q $pgRestore) --list")
  $tablesArchive = @($toc | Where-Object { $_ -match ' TABLE DATA public ' } | ForEach-Object { ($_ -split ' TABLE DATA public ')[1].Split(' ')[0].Trim('"') })
  $manquantes = @($TablesBoligo | Where-Object { $tablesArchive -notcontains $_ })
  $intruses = @($tablesArchive | Where-Object { $TablesBoligo -notcontains $_ })
  if ($manquantes.Count) { Stop-Sauvegarde "tables absentes de l'archive : $($manquantes -join ', ')" }
  if ($intruses.Count) { Stop-Sauvegarde "tables non BOLIGO dans l'archive : $($intruses -join ', ')" }

  Write-Host 'Vérification 3/3 : relecture complète des données et comparaison des lignes…'
  $comptes = @{}; $courante = $null
  Invoke-Chaine "$(Q $gpg) --quiet --decrypt $(Q $archive) | $(Q $pgRestore) --data-only --file=-" | ForEach-Object {
    if ($null -eq $courante) {
      if ($_ -match '^COPY public\."?([A-Za-z]+)"? ') { $courante = $Matches[1]; $comptes[$courante] = 0 }
    } elseif ($_ -eq '\.') { $courante = $null } else { $comptes[$courante]++ }
  }
  $ecarts = @(); $actives = @()
  foreach ($t in $TablesBoligo) {
    $n = if ($comptes.ContainsKey($t)) { [int64]$comptes[$t] } else { [int64]0 }
    if ($avant[$t] -eq $apres[$t]) { if ($n -ne $avant[$t]) { $ecarts += "$t (archive $n, base $($avant[$t]))" } }
    elseif ($n -lt [Math]::Min($avant[$t], $apres[$t]) -or $n -gt [Math]::Max($avant[$t], $apres[$t])) { $ecarts += "$t (archive $n, base $($avant[$t])→$($apres[$t]))" }
    else { $actives += $t }
  }
  if ($ecarts.Count) { Stop-Sauvegarde "nombre de lignes différent : $($ecarts -join '; ')" }

  $verifiee = $true
  $total = ($TablesBoligo | ForEach-Object { if ($comptes.ContainsKey($_)) { [int64]$comptes[$_] } else { 0 } } | Measure-Object -Sum).Sum
  Write-Host ''
  Write-Host "✅ Sauvegarde BOLIGO vérifiée : $archive ($([Math]::Round((Get-Item $archive).Length / 1KB)) Ko)"
  Write-Host "   SHA-256 : $hash"
  Write-Host "   32 tables BOLIGO, $total lignes, identiques à la base$(if ($actives.Count) { " (activité pendant l'export : $($actives -join ', '))" })."
  Write-Host "   Exclu : $(if ($etrangeres.Count) { ($etrangeres -join ', ') + ', ' })schémas oweke, oweke_test et Supabase."
  Write-Host '   Résumé à transmettre (aucune donnée personnelle) :'
  foreach ($t in $TablesBoligo) { Write-Host ("     {0,-20} {1}" -f $t, $(if ($comptes.ContainsKey($t)) { $comptes[$t] } else { 0 })) }
  Write-Host ''
  Write-Host 'Restauration (si besoin, base cible VIDE) :'
  Write-Host "  cmd /c ""gpg -d $archive | pg_restore --no-owner --dbname=<URL de la base cible>"""
}
finally {
  # Une archive non vérifiée n'est jamais conservée.
  if (-not $verifiee -and $archive) {
    Remove-Item -Force -ErrorAction SilentlyContinue $archive, "$archive.sha256"
    Write-Host 'Archive incomplète ou non vérifiée supprimée.'
  }
  $env:PGPASSWORD = $null; Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  $sec = $null
}
