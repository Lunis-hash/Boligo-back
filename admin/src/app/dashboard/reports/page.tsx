"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { Paginated, ReportRow } from "@/types/admin";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";

/** Signalement automatique du Sondeur : confirmer clôt le parcours. */
function isSondeurSignal(r: ReportRow): boolean {
  return (r.description ?? "").startsWith("Signal automatique BOLIGO · Sondeur");
}

/** Trace d'une réponse refusée par la modération (jamais montrée) : seulement classée. */
function isRefusalTrace(r: ReportRow): boolean {
  return / · refus [0-9a-f]{10}/.test(r.description ?? "");
}

/** Catégories qu'une modératrice peut confirmer pour un signal du Sondeur. */
const CATEGORIES: Array<[string, string]> = [
  ["menace", "Menace"],
  ["controle", "Contrôle"],
  ["violence_exercee", "Violence exercée"],
  ["violence_subie", "Victime (confidence : ne clôt rien)"],
  ["detresse", "Détresse (pause, crédits rendus)"],
  ["mineur", "Moins de 18 ans"],
  ["argent", "Demande d'argent"],
  ["autre", "Autre"],
];

function currentCategory(r: ReportRow): string {
  const m = /catégories=\[([^\],]*)/.exec(r.description ?? "");
  return m?.[1] || "autre";
}

/** Détail lisible : la ligne d'en-tête technique est remplacée par les catégories. */
function reportDetail(r: ReportRow): string {
  const text = r.message?.content ?? r.description ?? "";
  if (!isSondeurSignal(r)) return text;
  const [head, ...rest] = text.split("\n");
  const label = /catégorie : ([^·]+)/.exec(head)?.[1]?.trim();
  return [label ? `Catégorie : ${label}` : null, ...rest].filter(Boolean).join("\n");
}

export default function ReportsPage() {
  const [data, setData] = useState<Paginated<ReportRow> | null>(null);
  const [status, setStatus] = useState("en_attente");
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<Record<string, string>>({});

  function load() {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);
    apiFetch<Paginated<ReportRow>>(`/admin/reports?${params}`, { token: getToken() })
      .then(setData)
      .catch(console.error);
  }

  useEffect(() => {
    load();
  }, [page, status]);

  async function resolve(r: ReportRow, newStatus: "traite" | "rejete") {
    const category = chosen[r.id] ?? currentCategory(r);
    if (
      newStatus === "traite" &&
      isSondeurSignal(r) &&
      !isRefusalTrace(r) &&
      category !== "violence_subie" &&
      !window.confirm(
        category === "detresse"
          ? "Confirmer une détresse met le parcours en pause : les deux crédits sont rendus et le membre reçoit à nouveau les ressources d'aide. Continuer ?"
          : "Confirmer ce signal clôt le parcours des deux membres : la réponse reste cachée et le crédit est rendu au membre mis en danger. Continuer ?",
      )
    )
      return;
    const id = r.id;
    await apiFetch(`/admin/reports/${id}`, {
      method: "PATCH",
      token: getToken(),
      body: JSON.stringify(
        newStatus === "traite" && isSondeurSignal(r) && !isRefusalTrace(r)
          ? { status: newStatus, category }
          : { status: newStatus },
      ),
    });
    load();
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Signalements</h1>
        <p className="text-muted-foreground">
          Modération communautaire. Pour un signal du Sondeur : « Confirmer » clôt le parcours, « Fausse alerte »
          rouvre la lecture et, si rien d’autre n’est en attente, la messagerie.
        </p>
      </div>

      <select
        className="mb-4 h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={status}
        onChange={(e) => {
          setPage(1);
          setStatus(e.target.value);
        }}
      >
        <option value="">Tous</option>
        <option value="en_attente">en attente</option>
        <option value="traite">traité</option>
        <option value="rejete">rejeté</option>
      </select>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Signalé</TableHead>
              <TableHead>Par</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Détail</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.data.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Aucun signalement
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.reported.firstName} {r.reported.lastName}
                  </TableCell>
                  <TableCell>
                    {r.reporter.firstName} {r.reporter.lastName}
                  </TableCell>
                  <TableCell>{isSondeurSignal(r) ? "Sondeur" : r.reason}</TableCell>
                  <TableCell className="max-w-md whitespace-pre-line text-sm">{reportDetail(r)}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.reportedAt)}</TableCell>
                  <TableCell>
                    {r.status === "en_attente" && (
                      <div className="flex flex-wrap gap-1">
                        {isSondeurSignal(r) && !isRefusalTrace(r) && (
                          <select
                            aria-label="Catégorie confirmée"
                            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                            value={chosen[r.id] ?? currentCategory(r)}
                            onChange={(e) => setChosen((c) => ({ ...c, [r.id]: e.target.value }))}
                          >
                            {CATEGORIES.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => resolve(r, "traite")}>
                          {isRefusalTrace(r) ? "Classer" : isSondeurSignal(r) ? "Confirmer" : "Traiter"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => resolve(r, "rejete")}>
                          {isSondeurSignal(r) ? "Fausse alerte" : "Rejeter"}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <Button variant="outline" size="sm" disabled={page >= data.meta.totalPages} onClick={() => setPage((p) => p + 1)}>
            Suivant
          </Button>
        </div>
      )}
    </>
  );
}
