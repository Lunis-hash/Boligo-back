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
type PartnerStatus = "NOUVEAU" | "EN_COURS" | "ACCEPTE" | "REFUSE";

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
  sales: { purchases: number; revenue: number; commission: number };
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

interface Summary {
  byType: Partial<Record<PartnerType, number>>;
  byStatus: Partial<Record<PartnerStatus, number>>;
  activeCodes: number;
  purchases: number;
  revenue: number;
  commission: number;
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
};
const STATUS_VARIANT: Record<PartnerStatus, "secondary" | "warning" | "success" | "outline"> = {
  NOUVEAU: "secondary",
  EN_COURS: "warning",
  ACCEPTE: "success",
  REFUSE: "outline",
};

export default function PartnersPage() {
  const [rows, setRows] = useState<Partner[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");

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
            title="Ventes via les codes"
            value={formatEuro(summary.revenue)}
            hint={`${summary.purchases} Parcours payé(s)`}
            icon={Megaphone}
          />
          <StatCard title="Commissions dues" value={formatEuro(summary.commission)} icon={Wallet} />
        </div>
      )}

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
        {p.promoCode && (
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
        {msg && <p className="text-sm text-nuit" data-testid="partner-msg">{msg}</p>}
      </div>
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
