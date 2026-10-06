"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarX, Gift, Ticket, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEuro } from "@/lib/format";

type DiscountType = "percent" | "fixed" | "free";

interface PromoCode {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  partner: { id: string; name: string; company: string | null } | null;
  sales: { purchases: number; revenue: number };
}

interface PromoStats {
  total: number;
  active: number;
  expired: number;
  totalUsages: number;
  freeActivations: number;
}

const TYPE_LABELS: Record<DiscountType, string> = {
  percent: "Pourcentage",
  fixed: "Montant fixe",
  free: "Parcours offert",
};

function discountText(p: Pick<PromoCode, "discountType" | "discountValue">) {
  if (p.discountType === "free") return "Parcours offert";
  if (p.discountType === "fixed") return `-${formatEuro(p.discountValue / 100)}`;
  return `-${p.discountValue} %`;
}

/** Valeur saisie → valeur envoyée : % entier, ou euros convertis en centimes. */
function toDiscountValue(type: DiscountType, raw: string): number | undefined {
  if (type === "free") return 0;
  const n = Number(raw.replace(",", ".").trim());
  if (!raw.trim() || Number.isNaN(n)) return undefined;
  return type === "fixed" ? Math.round(n * 100) : Math.round(n);
}

function fromDiscountValue(p: Pick<PromoCode, "discountType" | "discountValue">): string {
  if (p.discountType === "free") return "";
  if (p.discountType === "fixed") return (p.discountValue / 100).toFixed(2).replace(".", ",");
  return String(p.discountValue);
}

/** Date choisie (jour) → fin de journée, heure locale. */
function endOfDay(date: string): string | null {
  return date ? new Date(`${date}T23:59:59`).toISOString() : null;
}

function dayInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDay(iso: string | null) {
  return iso ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(iso)) : "—";
}

const selectClass = "h-10 rounded-xl border border-input bg-white px-3 text-sm";

export default function PromoCodesPage() {
  const [rows, setRows] = useState<PromoCode[]>([]);
  const [stats, setStats] = useState<PromoStats | null>(null);
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    const params = new URLSearchParams({ limit: "100" });
    if (filter) params.set("isActive", filter);
    if (q.trim()) params.set("q", q.trim());
    try {
      const [list, s] = await Promise.all([
        apiFetch<{ data: PromoCode[] }>(`/admin/promo/codes?${params}`, { token }),
        apiFetch<PromoStats>("/admin/promo/stats", { token }),
      ]);
      setRows(list.data);
      setStats(s);
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Chargement impossible", ok: false });
    }
  }, [filter, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, ok: string) {
    setMsg(null);
    try {
      await fn();
      setMsg({ text: ok, ok: true });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Erreur", ok: false });
    }
  }

  const toggle = (p: PromoCode) =>
    act(
      () => apiFetch(`/admin/promo/codes/${p.id}/toggle`, { method: "PATCH", token: getToken() }),
      p.isActive ? `${p.code} est en pause.` : `${p.code} est réactivé.`,
    );

  async function remove(p: PromoCode) {
    if (!window.confirm(`Supprimer le code ${p.code} ?`)) return;
    setMsg(null);
    try {
      const res = await apiFetch<{ deleted: boolean; paused: boolean }>(`/admin/promo/codes/${p.id}`, {
        method: "DELETE",
        token: getToken(),
      });
      setMsg({
        text: res.deleted
          ? `${p.code} est supprimé.`
          : `${p.code} a déjà servi : il est conservé pour l’historique des paiements et mis en pause.`,
        ok: true,
      });
      await load();
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Erreur", ok: false });
    }
  }

  return (
    <>
      <PageHeader
        title="Codes promo"
        description="Tous les codes de réduction : promotions de lancement, offres ponctuelles et codes des partenaires. Les membres les saisissent sur l’écran de paiement du Parcours."
      />

      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Codes actifs"
            value={stats.active}
            hint={`${stats.total} code(s) au total`}
            icon={Ticket}
            variant="highlight"
          />
          <StatCard
            title="Utilisations"
            value={stats.totalUsages}
            hint="Parcours payés ou offerts avec un code"
            icon={Users}
          />
          <StatCard title="Parcours offerts" value={stats.freeActivations} icon={Gift} />
          <StatCard
            title="Actifs mais expirés"
            value={stats.expired}
            hint="À mettre en pause ou prolonger"
            icon={CalendarX}
          />
        </div>
      )}

      <CreateForm
        onCreated={async (code) => {
          setMsg({ text: `${code} est créé.`, ok: true });
          await load();
        }}
        onError={(text) => setMsg({ text, ok: false })}
      />

      <div className="mb-4 mt-8 flex flex-wrap items-center gap-3">
        <select className={selectClass} value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Statut">
          <option value="">Tous les codes</option>
          <option value="true">Actifs</option>
          <option value="false">En pause</option>
        </select>
        <Input
          className="h-10 w-64 rounded-xl bg-white"
          placeholder="Code ou description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          data-testid="promo-search"
        />
      </div>

      {msg && (
        <p
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${msg.ok ? "bg-lilas text-nuit" : "bg-rose text-framboise"}`}
          data-testid="promo-msg"
          role="status"
        >
          {msg.text}
        </p>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Réduction</TableHead>
              <TableHead className="text-right">Utilisations</TableHead>
              <TableHead className="text-right">Ventes</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-neutral-500">
                  Aucun code pour ces critères.
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => {
              const expired = Boolean(p.expiresAt && new Date(p.expiresAt) < new Date());
              return (
                <PromoRow
                  key={p.id}
                  promo={p}
                  expired={expired}
                  editing={editId === p.id}
                  onEdit={() => setEditId(editId === p.id ? null : p.id)}
                  onToggle={() => toggle(p)}
                  onDelete={() => remove(p)}
                  onSaved={async () => {
                    setEditId(null);
                    setMsg({ text: `${p.code} est modifié.`, ok: true });
                    await load();
                  }}
                  onError={(text) => setMsg({ text, ok: false })}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function CreateForm({ onCreated, onError }: { onCreated: (code: string) => void; onError: (text: string) => void }) {
  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountType>("percent");
  const [value, setValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [expires, setExpires] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await apiFetch<{ code: string }>("/admin/promo/codes", {
        method: "POST",
        token: getToken(),
        body: JSON.stringify({
          code: code.trim(),
          discountType: type,
          discountValue: toDiscountValue(type, value),
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          expiresAt: endOfDay(expires),
          ...(description.trim() ? { description: description.trim() } : {}),
        }),
      });
      setCode("");
      setMaxUses("");
      setExpires("");
      setDescription("");
      onCreated(created.code);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-neutral-200 bg-white p-5" data-testid="promo-form">
      <p className="mb-4 font-title text-lg text-encre">Nouveau code</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Code</span>
          <Input
            className="h-10 w-44 rounded-xl uppercase"
            placeholder="LANCEMENT"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, ""))}
            required
            data-testid="promo-code"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Type</span>
          <select
            className={selectClass}
            value={type}
            onChange={(e) => {
              const t = e.target.value as DiscountType;
              setType(t);
              setValue(t === "percent" ? "10" : t === "fixed" ? "5" : "");
            }}
            data-testid="promo-type"
          >
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {type !== "free" && (
          <label className="text-sm">
            <span className="mb-1 block text-neutral-500">{type === "percent" ? "Réduction (%)" : "Réduction (€)"}</span>
            <Input
              className="h-10 w-28 rounded-xl"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ""))}
              data-testid="promo-value"
            />
          </label>
        )}
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Utilisations max.</span>
          <Input
            className="h-10 w-32 rounded-xl"
            inputMode="numeric"
            placeholder="Illimité"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ""))}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">Fin (facultatif)</span>
          <Input className="h-10 w-40 rounded-xl" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </label>
        <label className="min-w-[200px] flex-1 text-sm">
          <span className="mb-1 block text-neutral-500">Description interne</span>
          <Input
            className="h-10 rounded-xl"
            placeholder="Ex. salon du mariage, octobre"
            value={description}
            maxLength={200}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <Button
          type="submit"
          disabled={busy}
          className="h-10 rounded-xl bg-gradient-to-r from-framboise to-lavande hover:opacity-90"
          data-testid="promo-create"
        >
          Créer le code
        </Button>
      </div>
    </form>
  );
}

function PromoRow({
  promo: p,
  expired,
  editing,
  onEdit,
  onToggle,
  onDelete,
  onSaved,
  onError,
}: {
  promo: PromoCode;
  expired: boolean;
  editing: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onSaved: () => void;
  onError: (text: string) => void;
}) {
  return (
    <>
      <TableRow data-testid={`promo-row-${p.code}`}>
        <TableCell>
          <p className="font-mono font-semibold text-encre">{p.code}</p>
          <p className="text-xs text-neutral-500">
            {p.partner ? `Partenaire : ${p.partner.company || p.partner.name}` : p.description || "—"}
          </p>
        </TableCell>
        <TableCell className="whitespace-nowrap text-sm">{discountText(p)}</TableCell>
        <TableCell className="whitespace-nowrap text-right text-sm">
          {p.usedCount}
          <span className="text-neutral-400"> / {p.maxUses ?? "∞"}</span>
        </TableCell>
        <TableCell className="whitespace-nowrap text-right text-sm">
          {p.sales.purchases > 0 ? `${formatEuro(p.sales.revenue)} (${p.sales.purchases})` : "—"}
        </TableCell>
        <TableCell className={`whitespace-nowrap text-sm ${expired ? "text-framboise" : "text-neutral-600"}`}>
          {formatDay(p.expiresAt)}
          {expired ? " · expiré" : ""}
        </TableCell>
        <TableCell>
          <Badge variant={p.isActive ? "success" : "outline"}>{p.isActive ? "Actif" : "En pause"}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="rounded-xl" onClick={onEdit} data-testid={`promo-edit-${p.code}`}>
              {editing ? "Fermer" : "Modifier"}
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={onToggle} data-testid={`promo-toggle-${p.code}`}>
              {p.isActive ? "Pause" : "Réactiver"}
            </Button>
            {!p.partner && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-framboise/40 text-framboise hover:bg-rose"
                onClick={onDelete}
                data-testid={`promo-delete-${p.code}`}
              >
                Supprimer
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
      {editing && (
        <TableRow>
          <TableCell colSpan={7} className="bg-fond">
            <EditForm promo={p} onSaved={onSaved} onError={onError} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function EditForm({ promo: p, onSaved, onError }: { promo: PromoCode; onSaved: () => void; onError: (t: string) => void }) {
  const [type, setType] = useState<DiscountType>(p.discountType);
  const [value, setValue] = useState(fromDiscountValue(p));
  const [maxUses, setMaxUses] = useState(p.maxUses != null ? String(p.maxUses) : "");
  const [expires, setExpires] = useState(dayInput(p.expiresAt));
  const [description, setDescription] = useState(p.description ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await apiFetch(`/admin/promo/codes/${p.id}`, {
        method: "PATCH",
        token: getToken(),
        body: JSON.stringify({
          discountType: type,
          discountValue: toDiscountValue(type, value),
          maxUses: maxUses.trim() ? Number(maxUses) : null,
          expiresAt: endOfDay(expires),
          description,
        }),
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Modification impossible");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-2" data-testid="promo-edit-form">
      <label className="text-sm">
        <span className="mb-1 block text-neutral-500">Type</span>
        <select className={selectClass} value={type} onChange={(e) => setType(e.target.value as DiscountType)}>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      {type !== "free" && (
        <label className="text-sm">
          <span className="mb-1 block text-neutral-500">{type === "percent" ? "Réduction (%)" : "Réduction (€)"}</span>
          <Input
            className="h-10 w-28 rounded-xl bg-white"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.,]/g, ""))}
            data-testid="promo-edit-value"
          />
        </label>
      )}
      <label className="text-sm">
        <span className="mb-1 block text-neutral-500">Utilisations max.</span>
        <Input
          className="h-10 w-32 rounded-xl bg-white"
          inputMode="numeric"
          placeholder="Illimité"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value.replace(/[^0-9]/g, ""))}
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-neutral-500">Fin</span>
        <Input className="h-10 w-40 rounded-xl bg-white" type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </label>
      <label className="min-w-[200px] flex-1 text-sm">
        <span className="mb-1 block text-neutral-500">Description interne</span>
        <Input
          className="h-10 rounded-xl bg-white"
          value={description}
          maxLength={200}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <Button onClick={save} disabled={busy} className="h-10 rounded-xl" data-testid="promo-save">
        Enregistrer
      </Button>
    </div>
  );
}
