"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HeartHandshake, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { journeyHref, userHref } from "@/lib/routes";
import { getToken } from "@/lib/auth";
import type { MatchRow, Paginated } from "@/types/admin";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, statusLabel, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

function StatusPill({ status }: { status: string }) {
  let type = "neutral";
  if (status === "acceptee") type = "success";
  if (status === "refusee") type = "danger";
  if (status === "en_attente") type = "warning";

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

export default function MatchesPage() {
  const [data, setData] = useState<Paginated<MatchRow> | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (statusFilter) params.set("status", statusFilter);
    apiFetch<Paginated<MatchRow>>(`/admin/matches?${params}`, { token: getToken() })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Matchs & Likes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Historique des propositions (likes) et compatibilité calculée par l'IA.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex gap-3 text-sm text-blue-900">
        <Info className="h-5 w-5 text-blue-500 shrink-0" />
        <div className="leading-relaxed">
          <p className="font-semibold mb-1">Comment ça fonctionne ?</p>
          <p>
            Lorsqu'un utilisateur (Expéditeur) envoie un <strong>"Like"</strong> (Proposition) à un autre (Destinataire), le statut est <span className="font-medium">en attente</span>. 
            Si le destinataire valide, le statut passe à <span className="font-medium text-emerald-700">acceptée</span> et un <strong>Parcours guidé</strong> commence immédiatement.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200/60 bg-white p-4 shadow-sm">
        <select
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none min-w-[200px]"
          value={statusFilter}
          onChange={(e) => {
            setPage(1);
            setStatusFilter(e.target.value);
          }}
        >
          <option value="">Tous les statuts</option>
          <option value="en_attente">En attente (Like envoyé)</option>
          <option value="acceptee">Acceptée (Match !)</option>
          <option value="refusee">Refusée</option>
          <option value="expiree">Expirée</option>
        </select>
      </div>

      <div className="rounded-xl border border-neutral-200/60 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50/50">
            <TableRow className="border-neutral-200 hover:bg-transparent">
              <TableHead className="font-medium text-neutral-500">Expéditeur (Like)</TableHead>
              <TableHead className="font-medium text-neutral-500">Destinataire</TableHead>
              <TableHead className="font-medium text-neutral-500">Score IA</TableHead>
              <TableHead className="font-medium text-neutral-500">Statut du Like</TableHead>
              <TableHead className="font-medium text-neutral-500">Date d'envoi</TableHead>
              <TableHead className="font-medium text-neutral-500">Suite (Parcours)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-sm text-neutral-400">
                  Chargement des matchs…
                </TableCell>
              </TableRow>
            ) : !data?.data.length ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-sm text-neutral-500">
                  <div className="flex flex-col items-center justify-center">
                    <HeartHandshake className="mb-2 h-8 w-8 text-neutral-300" />
                    Aucune proposition trouvée
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((m) => (
                <TableRow key={m.id} className="border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                  <TableCell>
                    <Link href={userHref(m.sourceUser.id)} className="font-medium text-neutral-900 hover:underline">
                      {m.sourceUser.firstName} {m.sourceUser.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={userHref(m.targetUser.id)} className="font-medium text-neutral-900 hover:underline">
                      {m.targetUser.firstName} {m.targetUser.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-bold text-neutral-700">
                      {formatPercent(m.compatibilityScore)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={m.status} />
                  </TableCell>
                  <TableCell className="text-[13px] text-neutral-500">
                    {formatDate(m.proposedAt)}
                  </TableCell>
                  <TableCell>
                    {m.journey ? (
                      <Link href={journeyHref(m.journey.id)} className="inline-flex items-center text-[13px] font-medium text-neutral-900 hover:underline">
                        → Voir Parcours ({statusLabel(m.journey.currentStep)})
                      </Link>
                    ) : (
                      <span className="text-[13px] text-neutral-400">—</span>
                    )}
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
            Affichage de <strong>{data.data.length}</strong> sur <strong>{data.meta.total}</strong> matchs
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
