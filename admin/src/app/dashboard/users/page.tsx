"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight, User as UserIcon, Download, Loader2, Trash2 } from "lucide-react";
import { apiFetch, API_URL } from "@/lib/api";
import { userHref } from "@/lib/routes";
import { getAdminUser, getToken } from "@/lib/auth";
import type { Paginated, UserRow } from "@/types/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, statusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatusPill({ status }: { status: string }) {
  let type = "neutral";
  if (status === "actif") type = "success";
  if (status === "suspendu") type = "danger";
  if (status === "en_entretien" || status === "nouveau") type = "warning";

  const colors: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    danger: "bg-red-50 text-red-600 border-red-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    neutral: "bg-neutral-50 text-neutral-600 border-neutral-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", colors[type])}>
      {statusLabel(status)}
    </span>
  );
}

const BULK_MAX = 50;

type BulkResult = {
  deleted: number;
  deletedIds: string[];
  skipped: { id: string; reason: string }[];
};

export default function UsersPage() {
  const [data, setData] = useState<Paginated<UserRow> | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  // Retour de la fiche après une suppression définitive.
  useEffect(() => {
    setDeleted(new URLSearchParams(window.location.search).get("deleted") === "1");
    setIsAdmin(getAdminUser()?.role === "ADMIN");
  }, []);

  const selfId = typeof window !== "undefined" ? getAdminUser()?.id : undefined;
  const selectable = (u: UserRow) => (u.role ?? "USER") === "USER" && u.id !== selfId;
  const pageSelectable = (data?.data ?? []).filter(selectable);
  const allOnPage = pageSelectable.length > 0 && pageSelectable.every((u) => selected.includes(u.id));
  const expected = `SUPPRIMER ${selected.length}`;

  const toggle = (id: string) =>
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= BULK_MAX ? cur : [...cur, id],
    );
  const togglePage = () =>
    setSelected((cur) => {
      if (allOnPage) return cur.filter((id) => !pageSelectable.some((u) => u.id === id));
      const next = [...cur];
      for (const u of pageSelectable) if (!next.includes(u.id) && next.length < BULK_MAX) next.push(u.id);
      return next;
    });

  const bulkDelete = async () => {
    if (confirmText.trim().toUpperCase() !== expected) return;
    setBulkBusy(true);
    setBulkError("");
    try {
      const res = await apiFetch<BulkResult>("/admin/users/bulk-delete", {
        method: "POST",
        token: getToken(),
        body: JSON.stringify({ ids: selected, confirm: confirmText.trim() }),
      });
      setBulkResult(res);
      setSelected([]);
      setConfirmOpen(false);
      setConfirmText("");
      load();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : "La suppression a échoué.");
    } finally {
      setBulkBusy(false);
    }
  };

  const exportCsv = async () => {
    try {
      setExporting(true);
      const res = await fetch(`${API_URL}/admin/users/export/csv`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Erreur lors de l'export CSV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `boligo_membres_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'export CSV");
    } finally {
      setExporting(false);
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    apiFetch<Paginated<UserRow>>(`/admin/users?${params}`, { token: getToken() })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {deleted && (
        <p className="rounded-xl bg-lilas px-4 py-3 text-sm text-nuit" role="status" data-testid="user-deleted-msg">
          Le compte a été supprimé définitivement. Ses paiements restent, anonymisés, pour la comptabilité.
        </p>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Utilisateurs</h1>
          <p className="mt-1 text-sm text-neutral-500">Gestion des comptes membres et de la modération.</p>
        </div>
        <Button size="sm" variant="outline" className="border-neutral-200 text-neutral-700 hover:bg-neutral-50" onClick={exportCsv} disabled={exporting}>
          {exporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
          Exporter CSV
        </Button>
      </div>

      {bulkResult && (
        <div className="rounded-xl bg-lilas px-4 py-3 text-sm text-nuit" role="status" data-testid="bulk-delete-result">
          <p>
            <strong>{bulkResult.deleted}</strong> compte{bulkResult.deleted > 1 ? "s" : ""} supprimé
            {bulkResult.deleted > 1 ? "s" : ""} définitivement. Les paiements restent, anonymisés, pour la comptabilité.
          </p>
          {bulkResult.skipped.length > 0 && (
            <p className="mt-1">
              Non supprimés : {bulkResult.skipped.length} ({[...new Set(bulkResult.skipped.map((s) => s.reason))].join(", ")}).
            </p>
          )}
        </div>
      )}

      {isAdmin && selected.length > 0 && (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-4" data-testid="bulk-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-800">
              <strong>{selected.length}</strong> compte{selected.length > 1 ? "s" : ""} sélectionné
              {selected.length > 1 ? "s" : ""}
              {selected.length >= BULK_MAX && <span className="text-neutral-500"> (maximum {BULK_MAX} par envoi)</span>}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-9 border-neutral-200" onClick={() => { setSelected([]); setConfirmOpen(false); }}>
                Tout désélectionner
              </Button>
              <Button size="sm" className="h-9 bg-red-600 text-white hover:bg-red-700" onClick={() => setConfirmOpen(true)} data-testid="bulk-delete-open">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Supprimer la sélection
              </Button>
            </div>
          </div>
          {confirmOpen && (
            <form
              className="space-y-2 border-t border-red-200 pt-3"
              onSubmit={(e) => {
                e.preventDefault();
                void bulkDelete();
              }}
            >
              <p className="text-sm text-neutral-800">
                Suppression <strong>définitive</strong> : profils, réponses, parcours et messages de ces membres seront effacés. Cette action ne peut pas être annulée.
              </p>
              <label htmlFor="bulk-confirm" className="block text-sm text-neutral-700">
                Pour confirmer, tapez <strong className="font-mono">{expected}</strong>
              </label>
              <div className="flex flex-wrap gap-2">
                <Input
                  id="bulk-confirm"
                  className="h-9 max-w-xs bg-white font-mono"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  autoComplete="off"
                  data-testid="bulk-confirm-input"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-9 bg-red-600 text-white hover:bg-red-700"
                  disabled={bulkBusy || confirmText.trim().toUpperCase() !== expected}
                  data-testid="bulk-delete-confirm"
                >
                  {bulkBusy ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  Supprimer définitivement
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-9" onClick={() => { setConfirmOpen(false); setConfirmText(""); }}>
                  Annuler
                </Button>
              </div>
              {bulkError && <p className="text-sm text-red-700" role="alert">{bulkError}</p>}
            </form>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200/60 bg-white p-4 shadow-sm">
        <div className="relative min-w-[280px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            className="h-9 w-full rounded-lg border-neutral-200 pl-9 text-sm focus-visible:ring-neutral-900"
            placeholder="Rechercher par nom, email, ville…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <select
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="nouveau">Nouveau</option>
          <option value="en_entretien">En entretien</option>
          <option value="actif">Actif</option>
          <option value="en_parcours">En parcours</option>
          <option value="suspendu">Suspendu</option>
        </select>
        <Button size="sm" className="h-9 bg-neutral-900 text-white hover:bg-neutral-800" onClick={load} disabled={loading}>
          Actualiser
        </Button>
      </div>

      <div className="rounded-xl border border-neutral-200/60 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50/50">
            <TableRow className="border-neutral-200 hover:bg-transparent">
              {isAdmin && (
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    aria-label="Sélectionner les membres de cette page"
                    className="h-4 w-4 accent-framboise"
                    checked={allOnPage}
                    disabled={!pageSelectable.length}
                    onChange={togglePage}
                    data-testid="select-page"
                  />
                </TableHead>
              )}
              <TableHead className="font-medium text-neutral-500">Membre</TableHead>
              <TableHead className="font-medium text-neutral-500">Statut</TableHead>
              <TableHead className="font-medium text-neutral-500 text-right">Crédits</TableHead>
              <TableHead className="font-medium text-neutral-500 text-right">Likes</TableHead>
              <TableHead className="font-medium text-neutral-500 text-right">Parcours</TableHead>
              <TableHead className="font-medium text-neutral-500 text-right">Inscription</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="h-48 text-center text-sm text-neutral-400">
                  Chargement des utilisateurs…
                </TableCell>
              </TableRow>
            ) : !data?.data.length ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} className="h-48 text-center text-sm text-neutral-500">
                  <div className="flex flex-col items-center justify-center">
                    <UserIcon className="mb-2 h-8 w-8 text-neutral-300" />
                    Aucun utilisateur trouvé
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((u) => (
                <TableRow key={u.id} className="border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                  {isAdmin && (
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Sélectionner ${u.firstName} ${u.lastName}`}
                        className="h-4 w-4 accent-framboise"
                        checked={selected.includes(u.id)}
                        disabled={!selectable(u) || (!selected.includes(u.id) && selected.length >= BULK_MAX)}
                        title={selectable(u) ? undefined : "Compte de l’équipe : non supprimable ici"}
                        onChange={() => toggle(u.id)}
                        data-testid={`select-${u.id}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Link href={userHref(u.id)} className="font-medium text-neutral-900 hover:underline">
                      {u.firstName} {u.lastName}
                    </Link>
                    <p className="text-[11px] text-neutral-400">{u.email}</p>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={u.accountStatus} />
                  </TableCell>
                  <TableCell className="text-right text-[13px] font-medium text-neutral-700">{u.creditBalance}</TableCell>
                  <TableCell className="text-right text-[13px] text-neutral-500">
                    {u._count.receivedProposals + u._count.targetedProposals}
                  </TableCell>
                  <TableCell className="text-right text-[13px] text-neutral-500">
                    {u._count.journeysA + u._count.journeysB}
                  </TableCell>
                  <TableCell className="text-right text-[13px] text-neutral-400">
                    {formatDate(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="h-8 text-[11px] text-neutral-500 hover:text-neutral-900">
                      <Link href={userHref(u.id)}>Détails</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-neutral-100 pt-4">
          <p className="text-[13px] text-neutral-500">
            Affichage de <strong>{data.data.length}</strong> sur <strong>{data.meta.total}</strong> utilisateurs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-neutral-200 text-neutral-600 px-2"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[13px] font-medium text-neutral-700 min-w-[32px] text-center">
              {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg border-neutral-200 text-neutral-600 px-2"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
