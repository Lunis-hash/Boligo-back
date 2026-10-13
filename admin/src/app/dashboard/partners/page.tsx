"use client";

import { useCallback, useEffect, useState } from "react";
import { Handshake, Megaphone, Ticket, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getAdminUser, getToken } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

type PartnerType = "ANNONCEUR" | "AMBASSADEUR" | "CREATEUR";
type PartnerStatus = "NOUVEAU" | "EN_COURS" | "ACCEPTE" | "REFUSE" | "SUSPENDU";

interface Partner {
  id: string;
  type: PartnerType;
  status: PartnerStatus;
  name: string;
  email: string;
  company: string | null;
  country: string;
  city: string | null;
  website: string | null;
  audience: string | null;
  message: string;
  language: string;
  notes: string | null;
  commissionRate: number | null;
  createdAt: string;
  promoCode: { id: string; code: string; isActive: boolean; usedCount: number } | null;
  sales: {
    purchases: number;
    /** Revenu confirmé : payé et non remboursé. */
    revenue: number;
    refunded?: number;
    refundedSales?: number;
    commission: number;
    commissionGross?: number;
    commissionReversed?: number;
  };
  /** Mêmes chiffres que l'Espace partenaire (calculés au même endroit). */
  metrics?: PartnerMetrics;
  /** Un lien privé vers l'Espace partenaire est en service. */
  portalActive: boolean;
  portalLinkSentAt: string | null;
  registrationType: RegistrationType | null;
  registrationNumber: string | null;
  verificationStatus: Verification;
  verificationMethod: string | null;
  verifiedName: string | null;
  verificationNote: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
}

type RegistrationType = "SIRENE" | "TVA_UE" | "UK_COMPANY" | "AUTRE";
type Verification = "A_VERIFIER" | "VERIFIE" | "REJETE";

const REG_LABELS: Record<RegistrationType, string> = {
  SIRENE: "SIREN / SIRET (France)",
  TVA_UE: "TVA intracommunautaire (UE)",
  UK_COMPANY: "Company number (Royaume-Uni)",
  AUTRE: "Immatriculation (autre pays)",
};
const VERIF_LABELS: Record<Verification, string> = {
  A_VERIFIER: "À vérifier",
  VERIFIE: "Vérifiée",
  REJETE: "Rejetée",
};
const VERIF_VARIANT: Record<Verification, "warning" | "success" | "outline"> = {
  A_VERIFIER: "warning",
  VERIFIE: "success",
  REJETE: "outline",
};

/** Registre officiel où l'équipe peut contrôler le numéro elle-même. */
function registryLink(type: RegistrationType | null, number: string | null): string | null {
  if (!type || !number) return null;
  if (type === "SIRENE") return `https://annuaire-entreprises.data.gouv.fr/entreprise/${number.slice(0, 9)}`;
  if (type === "TVA_UE") return "https://ec.europa.eu/taxation_customs/vies/#/vat-validation";
  if (type === "UK_COMPANY") return `https://find-and-update.company-information.service.gov.uk/company/${number}`;
  return `https://opencorporates.com/companies?q=${encodeURIComponent(number)}`;
}

interface PortalLinkResult {
  portalLink: string;
  emailAttempted: boolean;
}

interface PartnerMetrics {
  /** Visites du lien + clics sur les offres : mesurés, ce ne sont pas des ventes. */
  clicks: number;
  signups: number;
  /** Parcours payés (paiement confirmé) + ventes confirmées par relevé de marque. */
  verifiedConversions: number;
  /** Payé et non remboursé. */
  confirmedRevenue: number;
}

interface Summary {
  refunded?: number;
  refundedSales?: number;
  commissionReversed?: number;
  metrics?: PartnerMetrics;
  byType: Partial<Record<PartnerType, number>>;
  byStatus: Partial<Record<PartnerStatus, number>>;
  activeCodes: number;
  purchases: number;
  revenue: number;
  commission: number;
  offers?: {
    total: number;
    byState: Partial<Record<OfferState, number>>;
    impressions: number;
    clicks: number;
    confirmedSales: number;
    confirmedRevenue: number;
    conversionRate: number;
  };
}

const TYPE_LABELS: Record<PartnerType, string> = {
  ANNONCEUR: "Marque / annonceur",
  AMBASSADEUR: "Ambassadeur",
  CREATEUR: "Créateur / influenceur",
};
const TYPE_COLORS: Record<PartnerType, string> = {
  ANNONCEUR: "bg-rose text-framboise",
  AMBASSADEUR: "bg-lilas text-lavande",
  CREATEUR: "bg-ciel text-nuit",
};
const STATUS_LABELS: Record<PartnerStatus, string> = {
  NOUVEAU: "Nouveau",
  EN_COURS: "En discussion",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  SUSPENDU: "Suspendu",
};
const STATUS_VARIANT: Record<PartnerStatus, "secondary" | "warning" | "success" | "outline"> = {
  NOUVEAU: "secondary",
  EN_COURS: "warning",
  ACCEPTE: "success",
  REFUSE: "outline",
  SUSPENDU: "warning",
};

export default function PartnersPage() {
  const [rows, setRows] = useState<Partner[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    const params = new URLSearchParams({ limit: "50" });
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    try {
      const [list, sum] = await Promise.all([
        apiFetch<{ data: Partner[] }>(`/admin/partners?${params}`, { token }),
        apiFetch<Summary>("/admin/partners/summary", { token }),
      ]);
      setRows(list.data);
      setSummary(sum);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    }
  }, [type, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  const total = summary ? Object.values(summary.byType).reduce((a, b) => a + (b ?? 0), 0) : 0;

  return (
    <>
      <PageHeader
        title="Partenaires"
        description="Programme Partenaires : marques et annonceurs, ambassadeurs commerciaux, créateurs et influenceurs. Les candidatures arrivent depuis la page publique /partenaires du site."
      />

      {summary && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Candidatures"
            value={total}
            hint={`${summary.byStatus.NOUVEAU ?? 0} nouvelle(s) à traiter`}
            icon={Handshake}
            variant="highlight"
          />
          <StatCard title="Codes partenaires actifs" value={summary.activeCodes} icon={Ticket} />
          <StatCard
            title="Revenu confirmé via les codes"
            value={formatEuro(summary.revenue)}
            hint={`${summary.purchases} Parcours payé(s)${summary.refundedSales ? ` · ${formatEuro(summary.refunded ?? 0)} remboursé(s)` : ""} · payé et non remboursé`}
            icon={Megaphone}
          />
          <StatCard
            title="Commissions dues"
            value={formatEuro(summary.commission)}
            hint={summary.commissionReversed ? `Après ${formatEuro(summary.commissionReversed)} repris sur remboursements · taux figé à la vente` : "Taux figé à la vente"}
            icon={Wallet}
          />
        </div>
      )}
      {summary?.metrics && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3" data-testid="partners-metrics">
          <StatCard
            title="Clics (pas des ventes)"
            value={summary.metrics.clicks}
            hint={`Visites des liens et clics sur les offres · ${summary.metrics.signups} inscription(s)`}
            icon={Megaphone}
          />
          <StatCard
            title="Conversions vérifiées"
            value={summary.metrics.verifiedConversions}
            hint="Parcours payés + ventes confirmées par les marques"
            icon={Ticket}
          />
          <StatCard
            title="Revenus réellement confirmés"
            value={formatEuro(summary.metrics.confirmedRevenue)}
            hint="Paiement réussi et non remboursé"
            icon={Wallet}
          />
        </div>
      )}
      {summary?.offers && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="offers-summary">
          <StatCard
            title="Offres des marques"
            value={`${summary.offers.byState.en_ligne ?? 0} en ligne`}
            hint={`${summary.offers.total} au total · ${summary.offers.byState.programmee ?? 0} programmée(s) · ${summary.offers.byState.expiree ?? 0} expirée(s) · ${(summary.offers.byState.retiree ?? 0) + (summary.offers.byState.brouillon ?? 0)} hors ligne`}
            icon={Megaphone}
          />
          <StatCard
            title="Clics mesurés (pas des ventes)"
            value={summary.offers.clicks}
            hint={`${summary.offers.impressions} affichage(s)`}
            icon={Megaphone}
          />
          <StatCard
            title="Ventes confirmées par les marques"
            value={summary.offers.confirmedSales}
            hint={`${summary.offers.conversionRate} % des clics, d’après les relevés reçus`}
            icon={Ticket}
          />
          <StatCard
            title="Revenu BOLIGO confirmé (affiliation)"
            value={formatEuro(summary.offers.confirmedRevenue)}
            hint="Seules les ventes confirmées comptent"
            icon={Wallet}
          />
        </div>
      )}

      <div className="mb-4">
        {creating ? (
          <NewPartnerForm
            onCancel={() => setCreating(false)}
            onCreated={(id) => {
              setCreating(false);
              setOpenId(id);
              load();
            }}
          />
        ) : (
          <Button onClick={() => setCreating(true)} className="rounded-xl" data-testid="partner-new">
            Ajouter un partenaire
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className="h-10 rounded-xl border border-input bg-white px-3 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Profil"
          data-testid="partners-filter-type"
        >
          <option value="">Tous les profils</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-xl border border-input bg-white px-3 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Statut"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <Input
          className="h-10 w-64 rounded-xl bg-white"
          placeholder="Nom, e-mail, société, pays…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && <p className="mb-4 rounded-xl bg-rose px-4 py-3 text-sm text-framboise">{error}</p>}

      <div className="rounded-2xl border border-neutral-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Partenaire</TableHead>
              <TableHead>Profil</TableHead>
              <TableHead>Pays</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Ventes</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead>Reçu le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-neutral-500">
                  Aucune candidature pour l’instant. Partagez la page /partenaires du site.
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => (
              <PartnerRow
                key={p.id}
                partner={p}
                open={openId === p.id}
                onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                onSaved={load}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function PartnerRow({
  partner: p,
  open,
  onToggle,
  onSaved,
}: {
  partner: Partner;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-fond" onClick={onToggle} data-testid={`partner-row-${p.email}`}>
        <TableCell>
          <p className="font-medium text-encre">{p.company || p.name}</p>
          <p className="text-xs text-neutral-500">
            {p.company ? `${p.name} · ` : ""}
            {p.email}
          </p>
        </TableCell>
        <TableCell>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", TYPE_COLORS[p.type])}>
            {TYPE_LABELS[p.type]}
          </span>
        </TableCell>
        <TableCell className="text-sm">
          {p.country}
          {p.city ? <span className="text-neutral-500"> · {p.city}</span> : null}
        </TableCell>
        <TableCell>
          <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABELS[p.status]}</Badge>
        </TableCell>
        <TableCell>
          <Badge
            variant={VERIF_VARIANT[p.verificationStatus]}
            className="whitespace-nowrap"
            data-testid={`partner-verif-${p.email}`}
          >
            {VERIF_LABELS[p.verificationStatus]}
          </Badge>
        </TableCell>
        <TableCell className="font-mono text-sm">{p.promoCode?.code ?? "—"}</TableCell>
        <TableCell className="text-right text-sm">
          {p.sales.purchases > 0 ? `${formatEuro(p.sales.revenue)} (${p.sales.purchases})` : "—"}
          {p.sales.refundedSales ? (
            <span className="block text-xs text-neutral-500">{p.sales.refundedSales} remboursé(s)</span>
          ) : null}
        </TableCell>
        <TableCell className="whitespace-nowrap text-right text-sm">
          {p.commissionRate != null ? (
            <>
              {formatEuro(p.sales.commission)}{" "}
              <span className="whitespace-nowrap text-neutral-500">({p.commissionRate} %)</span>
            </>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell className="text-sm text-neutral-500">{formatDate(p.createdAt)}</TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={9} className="bg-fond">
            <PartnerDetail partner={p} onSaved={onSaved} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function PartnerDetail({ partner: p, onSaved }: { partner: Partner; onSaved: () => void }) {
  const [status, setStatus] = useState<PartnerStatus>(p.status);
  // Le statut change aussi côté serveur (création du code → Accepté) : on suit.
  useEffect(() => setStatus(p.status), [p.status]);
  const [notes, setNotes] = useState(p.notes ?? "");
  const [rate, setRate] = useState(p.commissionRate != null ? String(p.commissionRate) : "");
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("10");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState<PortalLinkResult | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      await apiFetch(`/admin/partners/${p.id}`, {
        method: "PATCH",
        token: getToken(),
        body: JSON.stringify({
          status,
          notes,
          ...(rate.trim() !== "" ? { commissionRate: Number(rate) } : {}),
        }),
      });
      setMsg("Enregistré.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function createCode() {
    setBusy(true);
    setMsg("");
    try {
      const res = await apiFetch<PortalLinkResult>(`/admin/partners/${p.id}/code`, {
        method: "POST",
        token: getToken(),
        body: JSON.stringify({
          ...(code.trim() ? { code: code.trim() } : {}),
          discountPercent: Number(discount) || 0,
        }),
      });
      setLink({ portalLink: res.portalLink, emailAttempted: res.emailAttempted });
      setMsg("Code créé : la candidature est acceptée et le partenaire reçoit son lien.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function sendLink() {
    setBusy(true);
    setMsg("");
    try {
      const res = await apiFetch<PortalLinkResult>(`/admin/partners/${p.id}/portal`, {
        method: "POST",
        token: getToken(),
      });
      setLink(res);
      setMsg("Nouveau lien créé : l’ancien ne fonctionne plus.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function revokeLink() {
    if (!window.confirm("Couper l’accès de ce partenaire à son Espace partenaire ?")) return;
    setBusy(true);
    setMsg("");
    try {
      await apiFetch(`/admin/partners/${p.id}/portal`, { method: "DELETE", token: getToken() });
      setLink(null);
      setMsg("Accès à l’Espace partenaire coupé.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.portalLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setLinkCopied(false);
    }
  }

  async function toggleCode() {
    if (!p.promoCode) return;
    setBusy(true);
    setMsg("");
    try {
      await apiFetch(`/admin/promo/codes/${p.promoCode.id}/toggle`, { method: "PATCH", token: getToken() });
      setMsg(p.promoCode.isActive ? "Code mis en pause." : "Code réactivé.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 p-2 lg:grid-cols-2" data-testid="partner-detail">
      <div className="space-y-3 text-sm">
        <p className="font-title text-lg text-encre">Candidature</p>
        <p className="whitespace-pre-line rounded-xl bg-white p-3 text-neutral-700">{p.message}</p>
        {p.audience && (
          <p>
            <span className="text-neutral-500">Audience, zone ou budget : </span>
            {p.audience}
          </p>
        )}
        {p.website && (
          <p>
            <span className="text-neutral-500">Site ou réseaux : </span>
            {p.website}
          </p>
        )}
        <p>
          <span className="text-neutral-500">Langue : </span>
          {p.language === "en" ? "anglais" : "français"} ·{" "}
          <a className="text-framboise underline" href={`mailto:${p.email}`}>
            écrire à {p.email}
          </a>
        </p>
        <BusinessCheck partner={p} onSaved={onSaved} />
      </div>
      <div className="space-y-4">
        <p className="font-title text-lg text-encre">Suivi</p>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Statut</span>
            <select
              className="h-10 rounded-xl border border-input bg-white px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as PartnerStatus)}
              data-testid="partner-status"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Commission (%)</span>
            <Input
              className="h-10 w-28 rounded-xl bg-white"
              inputMode="numeric"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-neutral-500">Notes internes (jamais visibles par le partenaire)</span>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-input bg-white p-3 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <Button onClick={save} disabled={busy} className="rounded-xl" data-testid="partner-save">
          Enregistrer
        </Button>

        <p className="-mt-2 text-xs text-neutral-500">
          Un nouveau taux ne s’applique qu’aux ventes suivantes : le taux de chaque vente est figé au moment du paiement.
        </p>

        <div className="rounded-xl border border-neutral-200 bg-white p-4" data-testid="partner-figures">
          <p className="mb-3 text-sm font-semibold text-encre">Chiffres commerciaux (identiques à son Espace partenaire)</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-neutral-500">Clics (pas des ventes)</dt>
              <dd className="font-semibold" data-testid="fig-clicks">{p.metrics?.clicks ?? 0}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Conversions vérifiées</dt>
              <dd className="font-semibold" data-testid="fig-conversions">{p.metrics?.verifiedConversions ?? 0}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Revenu confirmé</dt>
              <dd className="font-semibold" data-testid="fig-revenue">{formatEuro(p.sales.revenue)}</dd>
            </div>
            <div>
              <dt className="text-neutral-500">Commission due</dt>
              <dd className="font-semibold" data-testid="fig-commission">
                {p.commissionRate != null || (p.sales.commissionGross ?? 0) > 0 ? formatEuro(p.sales.commission) : "—"}
              </dd>
            </div>
          </dl>
          {(p.sales.refunded ?? 0) > 0 && (
            <p className="mt-3 rounded-xl bg-rose px-3 py-2 text-sm text-framboise" data-testid="fig-refunds">
              {p.sales.refundedSales ?? 0} vente(s) intégralement remboursée(s), {formatEuro(p.sales.refunded ?? 0)} remboursé(s) au total ·
              commission reprise : {formatEuro(p.sales.commissionReversed ?? 0)} (sur {formatEuro(p.sales.commissionGross ?? 0)} brute).
            </p>
          )}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          {p.promoCode ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                Code personnel : <span className="font-mono font-semibold text-framboise">{p.promoCode.code}</span> ·{" "}
                {p.promoCode.usedCount} utilisation(s) · {p.promoCode.isActive ? "actif" : "en pause"}
              </p>
              <Button
                variant="outline"
                onClick={toggleCode}
                disabled={busy}
                className="rounded-xl"
                data-testid="partner-toggle-code"
              >
                {p.promoCode.isActive ? "Mettre en pause" : "Réactiver"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                Créer son code personnel accepte la candidature. Les membres qui l’utilisent obtiennent la réduction ;
                chaque Parcours payé avec ce code compte pour sa commission.
              </p>
              {p.verificationStatus !== "VERIFIE" && (
                <p className="rounded-xl bg-rose px-3 py-2 text-sm text-framboise" data-testid="partner-code-blocked">
                  Entreprise non vérifiée : le code ne peut pas être créé tant que son numéro n’est pas contrôlé.
                </p>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="mb-1 block text-neutral-500">Code (facultatif)</span>
                  <Input
                    className="h-10 w-40 rounded-xl uppercase"
                    placeholder="Généré"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-neutral-500">Réduction (%)</span>
                  <Input
                    className="h-10 w-24 rounded-xl"
                    inputMode="numeric"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value.replace(/[^0-9]/g, ""))}
                  />
                </label>
                <Button
                  onClick={createCode}
                  disabled={busy || p.verificationStatus !== "VERIFIE"}
                  className="rounded-xl bg-gradient-to-r from-framboise to-lavande hover:opacity-90"
                  data-testid="partner-create-code"
                >
                  Créer le code
                </Button>
              </div>
            </div>
          )}
        </div>
        {(p.promoCode || (p.type === "ANNONCEUR" && p.status === "ACCEPTE")) && (
          <div className="space-y-3 rounded-xl border border-lilas bg-white p-4" data-testid="partner-portal">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-encre">Espace partenaire</p>
                <p className="text-xs text-neutral-500">
                  {p.portalActive
                    ? `Lien actif, envoyé le ${formatDate(p.portalLinkSentAt)}.`
                    : "Aucun lien actif : le partenaire ne voit pas son activité."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={sendLink}
                  disabled={busy}
                  className="rounded-xl"
                  data-testid="partner-send-link"
                >
                  {p.portalActive ? "Envoyer un nouveau lien" : "Envoyer le lien"}
                </Button>
                {p.portalActive && (
                  <Button
                    variant="outline"
                    onClick={revokeLink}
                    disabled={busy}
                    className="rounded-xl border-framboise/40 text-framboise hover:bg-rose"
                    data-testid="partner-revoke-link"
                  >
                    Couper l’accès
                  </Button>
                )}
              </div>
            </div>
            {link && (
              <div className="space-y-2 rounded-xl bg-fond p-3">
                <p className="text-xs text-neutral-600">
                  {link.emailAttempted
                    ? `Lien envoyé par e-mail à ${p.email}. Il ne s’affiche qu’une fois : copiez-le si besoin.`
                    : "E-mail non configuré : copiez ce lien et envoyez-le vous-même au partenaire. Il ne s’affiche qu’une fois."}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code
                    className="min-w-0 flex-1 break-all rounded-lg bg-white px-3 py-2 text-xs text-nuit"
                    data-testid="partner-portal-link"
                  >
                    {link.portalLink}
                  </code>
                  <Button variant="outline" onClick={copyLink} className="rounded-xl">
                    {linkCopied ? "Copié" : "Copier"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {p.promoCode && (
          <div className="rounded-xl border border-lilas bg-white p-4 text-sm" data-testid="partner-share-link">
            <p className="font-semibold text-encre">Lien suivi à partager</p>
            <p className="mt-1 break-all font-mono text-xs text-nuit">{shareLink(p.promoCode.code)}</p>
            <p className="mt-1 text-xs text-neutral-500">
              Visites et inscriptions comptées par jour ; la réduction est appliquée d’office au paiement.
            </p>
          </div>
        )}
        <PartnerOffers partner={p} />
        {msg && <p className="text-sm text-nuit" data-testid="partner-msg">{msg}</p>}
      </div>
    </div>
  );
}

const WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL || "https://boligo-web.onrender.com").replace(/\/+$/, "");

/** Lien du partenaire : le site lit ?p=CODE et garde le code jusqu'à l'inscription. */
function shareLink(code: string) {
  return `${WEB_URL}/?p=${encodeURIComponent(code)}`;
}

type Placement = "OFFRES" | "PARTENAIRE_DU_MOIS";

interface Offer {
  id: string;
  title: string;
  perk: string;
  description: string;
  url: string;
  perkCode: string | null;
  placement: Placement;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  stats?: {
    impressions: number;
    clicks: number;
    clickRate: number;
    live: boolean;
    state: OfferState;
    confirmedSales: number;
    confirmedRevenue: number;
  };
}

type OfferState = "brouillon" | "programmee" | "en_ligne" | "expiree" | "retiree";

const STATE_LABELS: Record<OfferState, string> = {
  brouillon: "Brouillon",
  programmee: "Programmée",
  en_ligne: "En ligne",
  expiree: "Expirée",
  retiree: "Retirée",
};
const STATE_VARIANT: Record<OfferState, "secondary" | "warning" | "success" | "outline"> = {
  brouillon: "secondary",
  programmee: "warning",
  en_ligne: "success",
  expiree: "outline",
  retiree: "outline",
};

/** ISO → AAAA-MM-JJ pour un champ date. */
function isoToDay(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

const PLACEMENT_LABELS: Record<Placement, string> = {
  OFFRES: "Page Offres partenaires",
  PARTENAIRE_DU_MOIS: "Partenaire du mois (accueil)",
};

const EMPTY_OFFER = {
  title: "",
  perk: "",
  description: "",
  url: "https://",
  perkCode: "",
  placement: "OFFRES" as Placement,
  startsAt: "",
  endsAt: "",
};

/** Date AAAA-MM-JJ du formulaire → ISO (début ou fin de journée). */
function dayToIso(day: string, end: boolean): string | null {
  if (!day) return null;
  return new Date(`${day}T${end ? "23:59:59" : "00:00:00"}`).toISOString();
}

/**
 * Offres d'une marque montrées dans BOLIGO : saisies par l'équipe, publiées
 * seulement pour un partenaire accepté, avec affichages et clics par jour.
 */
function PartnerOffers({ partner: p }: { partner: Partner }) {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setOffers(await apiFetch<Offer[]>(`/admin/partners/${p.id}/offers`, { token: getToken() }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Offres indisponibles.");
    }
  }, [p.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    setMsg("");
    try {
      await apiFetch(`/admin/partners/${p.id}/offers`, {
        method: "POST",
        token: getToken(),
        body: JSON.stringify({
          title: form.title,
          perk: form.perk,
          description: form.description,
          url: form.url.trim(),
          perkCode: form.perkCode || null,
          placement: form.placement,
          startsAt: dayToIso(form.startsAt, false),
          endsAt: dayToIso(form.endsAt, true),
          isActive: false,
        }),
      });
      setForm(EMPTY_OFFER);
      setOpen(false);
      setMsg("Offre enregistrée (hors ligne). Publiez-la quand elle est prête.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Offre non enregistrée.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(offer: Offer, body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setMsg("");
    try {
      await apiFetch(`/admin/partners/${p.id}/offers/${offer.id}`, {
        method: "PATCH",
        token: getToken(),
        body: JSON.stringify(body),
      });
      setMsg(ok);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Modification refusée.");
    } finally {
      setBusy(false);
    }
  }

  const set = (key: keyof typeof EMPTY_OFFER) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-3 rounded-xl border border-lilas bg-white p-4" data-testid="partner-offers">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-encre">Offres dans BOLIGO</p>
          <p className="text-xs text-neutral-500">
            Toujours marquées « Publicité ». Aucune donnée de membre transmise : la marque reçoit les visites avec
            utm_source=boligo.
          </p>
        </div>
        <Button variant="outline" onClick={() => setOpen((v) => !v)} className="rounded-xl" data-testid="offer-new">
          {open ? "Fermer" : "Nouvelle offre"}
        </Button>
      </div>

      {open && (
        <div className="grid gap-3 rounded-xl bg-fond p-3 sm:grid-cols-2" data-testid="offer-form">
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Titre (80 car.)</span>
            <Input className="h-10 rounded-xl bg-white" maxLength={80} value={form.title} onChange={set("title")} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Avantage (ex. -20 % sur le dîner)</span>
            <Input className="h-10 rounded-xl bg-white" maxLength={60} value={form.perk} onChange={set("perk")} />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-neutral-500">Description (400 car.)</span>
            <textarea
              className="min-h-[70px] w-full rounded-xl border border-input bg-white p-3 text-sm"
              maxLength={400}
              value={form.description}
              onChange={set("description")}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Lien de la marque (https)</span>
            <Input className="h-10 rounded-xl bg-white" maxLength={500} value={form.url} onChange={set("url")} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Code de la marque (facultatif)</span>
            <Input className="h-10 rounded-xl bg-white" maxLength={40} value={form.perkCode} onChange={set("perkCode")} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Emplacement</span>
            <select
              className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm"
              value={form.placement}
              onChange={set("placement")}
            >
              {(Object.keys(PLACEMENT_LABELS) as Placement[]).map((k) => (
                <option key={k} value={k}>
                  {PLACEMENT_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-neutral-500">Début</span>
              <Input type="date" className="h-10 rounded-xl bg-white" value={form.startsAt} onChange={set("startsAt")} />
            </label>
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-neutral-500">Fin</span>
              <Input type="date" className="h-10 rounded-xl bg-white" value={form.endsAt} onChange={set("endsAt")} />
            </label>
          </div>
          <div className="sm:col-span-2">
            <Button
              onClick={create}
              disabled={busy || !form.title || !form.perk || !form.description || !form.url.startsWith("https://")}
              className="rounded-xl bg-gradient-to-r from-framboise to-lavande hover:opacity-90"
              data-testid="offer-create"
            >
              Enregistrer l’offre
            </Button>
          </div>
        </div>
      )}

      {offers && offers.length === 0 && <p className="text-sm text-neutral-500">Aucune offre pour ce partenaire.</p>}
      {offers && offers.length > 0 && (
        <div className="space-y-2">
          {offers.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3"
              data-testid={`offer-row-${o.id}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-encre">
                  {o.perk} · {o.title}
                </p>
                <p className="text-xs text-neutral-500">
                  {PLACEMENT_LABELS[o.placement]}
                  {o.startsAt ? ` · du ${formatDate(o.startsAt)}` : ""}
                  {o.endsAt ? ` au ${formatDate(o.endsAt)}` : ""}
                </p>
                <p className="text-xs text-neutral-600">
                  {o.stats?.impressions ?? 0} affichage(s) · {o.stats?.clicks ?? 0} clic(s) · {o.stats?.clickRate ?? 0} %
                  {" · "}
                  <span className="font-semibold text-encre">
                    {o.stats?.confirmedSales ?? 0} vente(s) confirmée(s) · {formatEuro(o.stats?.confirmedRevenue ?? 0)}
                  </span>
                </p>
              </div>
              <Badge variant={STATE_VARIANT[o.stats?.state ?? "brouillon"]} data-testid={`offer-state-${o.id}`}>
                {STATE_LABELS[o.stats?.state ?? "brouillon"]}
              </Badge>
              <Button
                variant="outline"
                onClick={() => setEditId(editId === o.id ? null : o.id)}
                className="rounded-xl"
                data-testid={`offer-edit-${o.id}`}
              >
                {editId === o.id ? "Fermer" : "Modifier"}
              </Button>
              <Button
                variant="outline"
                disabled={busy || (!o.isActive && p.status !== "ACCEPTE")}
                onClick={() =>
                  void patch(o, { isActive: !o.isActive }, o.isActive ? "Offre retirée." : "Offre publiée.")
                }
                className="rounded-xl"
                data-testid={`offer-toggle-${o.id}`}
              >
                {o.isActive ? "Retirer" : "Publier"}
              </Button>
              {editId === o.id && (
                <OfferEditor partnerId={p.id} offer={o} onDone={(m) => { setMsg(m); setEditId(null); void load(); }} />
              )}
            </div>
          ))}
        </div>
      )}
      {p.status !== "ACCEPTE" && (
        <p className="text-xs text-framboise">Acceptez d’abord le partenaire pour publier ses offres.</p>
      )}
      {msg && (
        <p className="text-sm text-nuit" data-testid="offer-msg">
          {msg}
        </p>
      )}
    </div>
  );
}

/**
 * Modifier une offre (textes, emplacement, dates) et saisir les ventes
 * CONFIRMÉES par la marque : ce sont les seules qui comptent comme revenu,
 * jamais les clics.
 */
function OfferEditor({
  partnerId,
  offer: o,
  onDone,
}: {
  partnerId: string;
  offer: Offer;
  onDone: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    title: o.title,
    perk: o.perk,
    placement: o.placement,
    startsAt: isoToDay(o.startsAt),
    endsAt: isoToDay(o.endsAt),
  });
  const [conv, setConv] = useState<
    { id: string; month: string; conversions: number; revenue: number; reference: string | null }[]
  >([]);
  const [entry, setEntry] = useState({ month: new Date().toISOString().slice(0, 7), conversions: "", revenue: "", reference: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const base = `/admin/partners/${partnerId}/offers/${o.id}`;

  useEffect(() => {
    apiFetch<typeof conv>(`${base}/conversions`, { token: getToken() })
      .then(setConv)
      .catch(() => setConv([]));
  }, [base]);

  async function save() {
    setBusy(true);
    setErr("");
    try {
      await apiFetch(base, {
        method: "PATCH",
        token: getToken(),
        body: JSON.stringify({
          title: form.title,
          perk: form.perk,
          placement: form.placement,
          startsAt: dayToIso(form.startsAt, false),
          endsAt: dayToIso(form.endsAt, true),
        }),
      });
      onDone("Offre modifiée.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Modification refusée.");
    } finally {
      setBusy(false);
    }
  }

  async function addConversion() {
    setBusy(true);
    setErr("");
    try {
      setConv(
        await apiFetch<typeof conv>(`${base}/conversions`, {
          method: "POST",
          token: getToken(),
          body: JSON.stringify({
            month: entry.month,
            conversions: Number(entry.conversions),
            revenue: Number(entry.revenue.replace(",", ".")),
            reference: entry.reference || undefined,
          }),
        }),
      );
      setEntry((e) => ({ ...e, conversions: "", revenue: "", reference: "" }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Saisie refusée.");
    } finally {
      setBusy(false);
    }
  }

  async function removeConversion(id: string) {
    setBusy(true);
    try {
      setConv(await apiFetch<typeof conv>(`${base}/conversions/${id}`, { method: "DELETE", token: getToken() }));
    } finally {
      setBusy(false);
    }
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="w-full space-y-3 rounded-xl bg-fond p-3" data-testid={`offer-editor-${o.id}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Titre</span>
          <Input className="h-10 rounded-xl bg-white" maxLength={80} value={form.title} onChange={set("title")} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Avantage</span>
          <Input className="h-10 rounded-xl bg-white" maxLength={60} value={form.perk} onChange={set("perk")} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Emplacement</span>
          <select
            className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm"
            value={form.placement}
            onChange={set("placement")}
          >
            {(Object.keys(PLACEMENT_LABELS) as Placement[]).map((k) => (
              <option key={k} value={k}>
                {PLACEMENT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-3">
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-neutral-500">Début</span>
            <Input type="date" className="h-10 rounded-xl bg-white" value={form.startsAt} onChange={set("startsAt")} data-testid="offer-edit-start" />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-neutral-500">Fin (expiration)</span>
            <Input type="date" className="h-10 rounded-xl bg-white" value={form.endsAt} onChange={set("endsAt")} data-testid="offer-edit-end" />
          </label>
        </div>
      </div>
      <Button onClick={save} disabled={busy} className="rounded-xl" data-testid="offer-edit-save">
        Enregistrer les modifications
      </Button>

      <div className="space-y-2 border-t border-lilas pt-3" data-testid={`offer-conversions-${o.id}`}>
        <p className="text-sm font-semibold text-encre">Ventes confirmées par la marque</p>
        <p className="text-xs text-neutral-500">
          À saisir d’après le relevé de la marque ou de son réseau d’affiliation. Les clics ne sont jamais comptés comme
          des ventes.
        </p>
        {conv.length > 0 && (
          <ul className="space-y-1 text-xs">
            {conv.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                <span>
                  {c.month} · {c.conversions} vente(s) · {formatEuro(c.revenue)} pour BOLIGO
                  {c.reference ? ` · réf. ${c.reference}` : ""}
                </span>
                <button className="text-framboise" onClick={() => void removeConversion(c.id)} disabled={busy}>
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">
            <span className="mb-1 block text-neutral-500">Mois</span>
            <Input type="month" className="h-9 w-36 rounded-xl bg-white" value={entry.month} onChange={(e) => setEntry({ ...entry, month: e.target.value })} data-testid="conv-month" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-neutral-500">Ventes</span>
            <Input className="h-9 w-20 rounded-xl bg-white" inputMode="numeric" value={entry.conversions} onChange={(e) => setEntry({ ...entry, conversions: e.target.value.replace(/[^0-9]/g, "") })} data-testid="conv-count" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-neutral-500">Dû à BOLIGO (€)</span>
            <Input className="h-9 w-28 rounded-xl bg-white" inputMode="decimal" value={entry.revenue} onChange={(e) => setEntry({ ...entry, revenue: e.target.value })} data-testid="conv-revenue" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-neutral-500">Référence du relevé</span>
            <Input className="h-9 w-40 rounded-xl bg-white" maxLength={80} value={entry.reference} onChange={(e) => setEntry({ ...entry, reference: e.target.value })} />
          </label>
          <Button onClick={addConversion} disabled={busy || entry.conversions === "" || entry.revenue === ""} className="h-9 rounded-xl" data-testid="conv-add">
            Ajouter
          </Button>
        </div>
      </div>
      {err && <p className="text-sm text-framboise">{err}</p>}
    </div>
  );
}

/** Entreprise du partenaire : numéro, contrôle du registre, décision manuelle. */
function BusinessCheck({ partner: p, onSaved }: { partner: Partner; onSaved: () => void }) {
  const isAdmin = getAdminUser()?.role === "ADMIN";
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [note, setNote] = useState("");
  const [editType, setEditType] = useState<RegistrationType>(p.registrationType ?? "SIRENE");
  const [editNumber, setEditNumber] = useState("");
  const link = registryLink(p.registrationType, p.registrationNumber);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      setMsg(ok);
      onSaved();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const verify = () =>
    run(
      () => apiFetch(`/admin/partners/${p.id}/verify`, { method: "POST", token: getToken() }),
      "Registre interrogé.",
    );
  const decide = (status: "VERIFIE" | "REJETE") =>
    run(
      () =>
        apiFetch(`/admin/partners/${p.id}/verification`, {
          method: "PATCH",
          token: getToken(),
          body: JSON.stringify({ status, note }),
        }),
      status === "VERIFIE" ? "Entreprise validée manuellement." : "Entreprise rejetée.",
    );
  const correct = () =>
    run(
      () =>
        apiFetch(`/admin/partners/${p.id}`, {
          method: "PATCH",
          token: getToken(),
          body: JSON.stringify({ registrationType: editType, registrationNumber: editNumber }),
        }),
      "Numéro corrigé et vérifié à nouveau.",
    );

  return (
    <div className="space-y-3 rounded-xl border border-lilas bg-white p-4" data-testid="partner-business">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-title text-lg text-encre">Entreprise</p>
        <Badge variant={VERIF_VARIANT[p.verificationStatus]} data-testid="partner-verif-status">
          {VERIF_LABELS[p.verificationStatus]}
        </Badge>
      </div>
      {p.registrationType && p.registrationNumber ? (
        <p>
          <span className="text-neutral-500">{REG_LABELS[p.registrationType]} : </span>
          <span className="font-mono font-semibold text-nuit">{p.registrationNumber}</span>
          {link && (
            <>
              {" · "}
              <a className="text-framboise underline" href={link} target="_blank" rel="noreferrer noopener">
                voir le registre
              </a>
            </>
          )}
        </p>
      ) : (
        <p className="text-framboise">Aucun numéro d’entreprise fourni.</p>
      )}
      {p.verifiedName && (
        <p data-testid="partner-official-name">
          <span className="text-neutral-500">Nom officiel : </span>
          <span className="font-semibold">{p.verifiedName}</span>
          <span className="text-neutral-500"> (déclaré : {p.company || p.name})</span>
        </p>
      )}
      {p.verificationNote && <p className="text-neutral-700">{p.verificationNote}</p>}
      {p.verificationMethod && (
        <p className="text-xs text-neutral-500">
          {p.verificationMethod}
          {p.verifiedAt ? ` · ${formatDate(p.verifiedAt)}` : ""}
          {p.verifiedBy ? ` · par ${p.verifiedBy}` : ""}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="rounded-xl" onClick={verify} disabled={busy || !p.registrationNumber} data-testid="partner-verify">
          Vérifier dans le registre
        </Button>
      </div>
      {isAdmin && (
        <div className="space-y-2 border-t border-lilas pt-3">
          <p className="text-xs text-neutral-500">
            Décision manuelle (administrateurs) : indiquez la source consultée, par exemple « extrait RCCM du 01/10/2026
            vérifié sur le registre national ».
          </p>
          <textarea
            className="min-h-[60px] w-full rounded-xl border border-input bg-white p-3 text-sm"
            placeholder="Source et référence du contrôle (10 caractères minimum)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            data-testid="partner-manual-note"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-xl"
              onClick={() => decide("VERIFIE")}
              disabled={busy || note.trim().length < 10}
              data-testid="partner-manual-ok"
            >
              Valider l’entreprise
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-framboise/40 text-framboise hover:bg-rose"
              onClick={() => decide("REJETE")}
              disabled={busy || note.trim().length < 10}
              data-testid="partner-manual-reject"
            >
              Rejeter
            </Button>
          </div>
        </div>
      )}
      <details className="text-xs text-neutral-600">
        <summary className="cursor-pointer">Corriger le numéro</summary>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <select
            className="h-9 rounded-xl border border-input bg-white px-2 text-xs"
            value={editType}
            onChange={(e) => setEditType(e.target.value as RegistrationType)}
          >
            {Object.entries(REG_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Input
            className="h-9 w-48 rounded-xl"
            value={editNumber}
            onChange={(e) => setEditNumber(e.target.value)}
            placeholder="Nouveau numéro"
          />
          <Button size="sm" variant="outline" className="rounded-xl" onClick={correct} disabled={busy || editNumber.trim().length < 3}>
            Enregistrer et vérifier
          </Button>
        </div>
      </details>
      {msg && (
        <p className="text-sm text-nuit" data-testid="partner-business-msg">
          {msg}
        </p>
      )}
    </div>
  );
}

/** Partenaire ajouté par l'équipe (marque démarchée, ambassadeur recruté…). */
function NewPartnerForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [f, setF] = useState({
    type: "ANNONCEUR" as PartnerType,
    name: "",
    email: "",
    company: "",
    country: "France",
    city: "",
    website: "",
    registrationType: "SIRENE" as RegistrationType,
    registrationNumber: "",
    commissionRate: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    setBusy(true);
    setMsg("");
    try {
      const created = await apiFetch<{ id: string }>("/admin/partners", {
        method: "POST",
        token: getToken(),
        body: JSON.stringify({
          type: f.type,
          name: f.name,
          email: f.email,
          company: f.company || undefined,
          country: f.country,
          city: f.city || undefined,
          website: f.website || undefined,
          registrationType: f.registrationType,
          registrationNumber: f.registrationNumber,
          ...(f.type !== "ANNONCEUR" && f.commissionRate !== "" ? { commissionRate: Number(f.commissionRate) } : {}),
        }),
      });
      onCreated(created.id);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  };
  const field = "h-10 rounded-xl bg-white";
  return (
    <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4" data-testid="partner-new-form">
      <p className="text-sm font-semibold text-encre">Nouveau partenaire</p>
      <p className="text-sm text-neutral-600">
        Il est créé « En discussion ». Son entreprise est vérifiée comme pour une candidature ; le code et le lien privé se créent ensuite
        depuis sa fiche.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Profil</span>
          <select className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm" value={f.type} onChange={set("type")} data-testid="new-type">
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Nom du contact</span>
          <Input className={field} value={f.name} onChange={set("name")} data-testid="new-name" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">E-mail</span>
          <Input className={field} type="email" value={f.email} onChange={set("email")} data-testid="new-email" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Société</span>
          <Input className={field} value={f.company} onChange={set("company")} data-testid="new-company" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Pays</span>
          <Input className={field} value={f.country} onChange={set("country")} data-testid="new-country" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Ville</span>
          <Input className={field} value={f.city} onChange={set("city")} data-testid="new-city" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Site</span>
          <Input className={field} value={f.website} onChange={set("website")} data-testid="new-website" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Immatriculation</span>
          <select
            className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm"
            value={f.registrationType}
            onChange={set("registrationType")}
            data-testid="new-reg-type"
          >
            {Object.entries(REG_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Numéro</span>
          <Input className={field} value={f.registrationNumber} onChange={set("registrationNumber")} data-testid="new-reg-number" />
        </label>
        {f.type !== "ANNONCEUR" && (
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">Commission (%)</span>
            <Input
              className={field}
              inputMode="numeric"
              placeholder={f.type === "AMBASSADEUR" ? "20" : "15"}
              value={f.commissionRate}
              onChange={(e) => setF({ ...f, commissionRate: e.target.value.replace(/[^0-9]/g, "") })}
              data-testid="new-rate"
            />
          </label>
        )}
      </div>
      {msg && (
        <p className="rounded-xl bg-rose px-3 py-2 text-sm text-framboise" data-testid="new-msg">
          {msg}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={submit} disabled={busy || !f.name || !f.email || !f.registrationNumber} className="rounded-xl" data-testid="new-submit">
          Créer le partenaire
        </Button>
        <Button variant="outline" onClick={onCancel} disabled={busy} className="rounded-xl">
          Annuler
        </Button>
      </div>
    </div>
  );
}
