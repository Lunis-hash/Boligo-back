"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

type BlockedMessage = {
  id: string;
  content: string;
  sentAt: string;
  sender: { firstName: string; lastName: string; email: string };
  journey: { id: string; userA: { firstName: string }; userB: { firstName: string } };
};

type PaginatedBlocked = {
  data: BlockedMessage[];
  meta: { page: number; totalPages: number; total: number };
};

export default function ModerationPage() {
  const [data, setData] = useState<PaginatedBlocked | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiFetch<PaginatedBlocked>(`/admin/messages/blocked?page=${page}&limit=20`, {
      token: getToken(),
    }).then(setData);
  }, [page]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Messages bloqués</h1>
        <p className="text-muted-foreground">Contenu refusé par la modération automatique</p>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Auteur</TableHead>
              <TableHead>Parcours</TableHead>
              <TableHead>Contenu</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data?.data.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Aucun message bloqué
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    {m.sender.firstName} {m.sender.lastName}
                    <p className="text-xs text-muted-foreground">{m.sender.email}</p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {m.journey.userA.firstName} & {m.journey.userB.firstName}
                  </TableCell>
                  <TableCell className="max-w-md truncate text-sm">{m.content}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(m.sentAt)}</TableCell>
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
