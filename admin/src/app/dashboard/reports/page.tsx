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

export default function ReportsPage() {
  const [data, setData] = useState<Paginated<ReportRow> | null>(null);
  const [status, setStatus] = useState("en_attente");
  const [page, setPage] = useState(1);

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

  async function resolve(id: string, newStatus: "traite" | "rejete") {
    await apiFetch(`/admin/reports/${id}`, {
      method: "PATCH",
      token: getToken(),
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Signalements</h1>
        <p className="text-muted-foreground">Modération communautaire</p>
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
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.data.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
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
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.reportedAt)}</TableCell>
                  <TableCell>
                    {r.status === "en_attente" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => resolve(r.id, "traite")}>
                          Traiter
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => resolve(r.id, "rejete")}>
                          Rejeter
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
