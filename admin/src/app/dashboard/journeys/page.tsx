"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Route, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { journeyHref } from "@/lib/routes";
import { getToken } from "@/lib/auth";
import type { JourneyRow, Paginated } from "@/types/admin";
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

function StatusPill({ status, type = "neutral" }: { status: string; type?: "success" | "danger" | "warning" | "neutral" }) {
  if (status === "reussi" || status === "termine" || status === "echange_contacts") type = "success";
  if (status === "echoue" || status === "abandonne") type = "danger";
  if (status === "en_cours" || status === "phase_harmonie" || status === "chat_libre" || status === "video") type = "warning";

  const colors: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    danger: "bg-red-50 text-red-600 border-red-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    neutral: "bg-neutral-50 text-neutral-600 border-neutral-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider", colors[type])}>
      {statusLabel(status)}
    </span>
  );
}

export default function JourneysPage() {
  const [data, setData] = useState<Paginated<JourneyRow> | null>(null);
  const [page, setPage] = useState(1);
  const [resultFilter, setResultFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (resultFilter) params.set("result", resultFilter);
    apiFetch<Paginated<JourneyRow>>(`/admin/journeys?${params}`, { token: getToken() })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, resultFilter]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Parcours Guidés</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Suivi des rencontres étape par étape (Sondeur → Chat → Vidéo → Contacts).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 flex gap-3 text-sm text-blue-900">
        <Info className="h-5 w-5 text-blue-500 shrink-0" />
        <div className="leading-relaxed">
          <p className="font-semibold mb-1">Rappel des étapes :</p>
          <ul className="list-disc pl-5 space-y-1 mt-1 marker:text-blue-400 text-[13px]">
            <li><strong>Phase Harmonie (Sondeur)</strong> : 3 jours d'échange aveugle via questions IA.</li>
            <li><strong>Chat Libre</strong> : Discussion textuelle classique débloquée.</li>
            <li><strong>Vidéo</strong> : Appel vidéo pour humaniser la rencontre.</li>
            <li><strong>Échange Contacts</strong> : Fin du parcours guidé.</li>
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200/60 bg-white p-4 shadow-sm">
        <select
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus:border-neutral-900 focus:outline-none min-w-[200px]"
          value={resultFilter}
          onChange={(e) => {
            setPage(1);
            setResultFilter(e.target.value);
          }}
        >
          <option value="">Tous les résultats</option>
          <option value="en_cours">En cours</option>
          <option value="reussi">Réussi</option>
          <option value="echoue">Échoué</option>
          <option value="abandonne">Abandonné</option>
        </select>
      </div>

      <div className="rounded-xl border border-neutral-200/60 bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-neutral-50/50">
            <TableRow className="border-neutral-200 hover:bg-transparent">
              <TableHead className="font-medium text-neutral-500">Membres (Couple)</TableHead>
              <TableHead className="font-medium text-neutral-500">Étape actuelle</TableHead>
              <TableHead className="font-medium text-neutral-500">Résultat final</TableHead>
              <TableHead className="font-medium text-neutral-500">Compatibilité</TableHead>
              <TableHead className="font-medium text-neutral-500 text-right">Messages échangés</TableHead>
              <TableHead className="font-medium text-neutral-500 text-right">Création</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-sm text-neutral-400">
                  Chargement des parcours…
                </TableCell>
              </TableRow>
            ) : !data?.data.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-sm text-neutral-500">
                  <div className="flex flex-col items-center justify-center">
                    <Route className="mb-2 h-8 w-8 text-neutral-300" />
                    Aucun parcours trouvé
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((j) => (
                <TableRow key={j.id} className="border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                  <TableCell>
                    <Link href={journeyHref(j.id)} className="font-medium text-neutral-900 hover:underline flex flex-col gap-0.5">
                      <span>{j.userA.firstName} {j.userA.lastName}</span>
                      <span className="text-neutral-400 text-[11px]">& {j.userB.firstName} {j.userB.lastName}</span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusPill status={j.currentStep} />
                  </TableCell>
                  <TableCell>
                    <StatusPill status={j.result} />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-bold text-neutral-700">
                      {formatPercent(j.proposal.compatibilityScore)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-[13px] font-medium text-neutral-700">
                    {j._count.messages}
                  </TableCell>
                  <TableCell className="text-right text-[13px] text-neutral-500">
                    {formatDate(j.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm" className="h-8 text-[11px] text-neutral-500 hover:text-neutral-900">
                      <Link href={journeyHref(j.id)}>Voir</Link>
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
            Affichage de <strong>{data.data.length}</strong> sur <strong>{data.meta.total}</strong> parcours
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
