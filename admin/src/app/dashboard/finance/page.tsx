"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  CreditCard,
  Coins,
  TrendingUp,
  RefreshCcw,
  ShoppingBag,
  Download,
  Loader2,
} from "lucide-react";
import { apiFetch, API_URL } from "@/lib/api";
import { userHref } from "@/lib/routes";
import { getToken } from "@/lib/auth";
import type { Paginated } from "@/types/admin";
import type { FinanceStats, TransactionRow } from "@/types/finance";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatEuro, transactionTypeLabels } from "@/lib/format";

export default function FinancePage() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [tx, setTx] = useState<Paginated<TransactionRow> | null>(null);
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    try {
      setExporting(true);
      const res = await fetch(`${API_URL}/admin/finance/export/csv`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Erreur lors de l'export CSV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `harmonie_transactions_${new Date().toISOString().split('T')[0]}.csv`;
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
    const token = getToken();
    apiFetch<FinanceStats>("/admin/finance/stats", { token }).then(setStats);
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (type) params.set("type", type);
    apiFetch<Paginated<TransactionRow>>(`/admin/finance/transactions?${params}`, {
      token,
    }).then(setTx);
  }, [page, type]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Finances & abonnements"
        description="Revenus, crédits vendus, consommations et remboursements — tout l'argent qui transite sur BOLIGO."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-[#ead8d4]"
              onClick={exportCsv}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Exporter CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-[#ead8d4]"
              onClick={load}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        }
      />

      {!stats ? (
        <p className="text-[#8a6b6f]">Chargement…</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Chiffre d'affaires total"
              value={formatEuro(stats.revenue.totalEur)}
              hint={`${stats.revenue.purchasesCount} achats enregistrés`}
              icon={Banknote}
              variant="highlight"
            />
            <StatCard
              title="CA ce mois"
              value={formatEuro(stats.revenue.monthEur)}
              hint={`${stats.revenue.purchasesMonthCount} achats ce mois`}
              icon={TrendingUp}
            />
            <StatCard
              title="CA 7 derniers jours"
              value={formatEuro(stats.revenue.weekEur)}
              icon={CreditCard}
            />
            <StatCard
              title="Crédits en circulation"
              value={stats.credits.inCirculation}
              hint={`${stats.credits.sold} vendus · ${stats.credits.spent} consommés`}
              icon={Coins}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              title="Crédits vendus"
              value={stats.credits.sold}
              hint="via achats / abonnements"
              icon={ShoppingBag}
            />
            <StatCard
              title="Crédits consommés"
              value={stats.credits.spent}
              hint={`${stats.credits.consumptionsCount} opérations`}
              icon={Coins}
            />
            <StatCard
              title="Remboursements justice"
              value={stats.credits.refunded}
              hint={`${stats.credits.refundsCount} remboursements`}
              icon={RefreshCcw}
            />
          </div>

          {stats.note && (
            <p className="rounded-xl border border-[#ead8d4] bg-[#fdf6f4] px-4 py-3 text-sm text-[#6b5458]">
              {stats.note}
            </p>
          )}

          <Card className="border-[#ead8d4]/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-medium text-[#2d2224]">
                Répartition par type
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-6">
              {stats.byType.map((row) => (
                <div key={row.type} className="min-w-[140px]">
                  <p className="text-sm text-[#8a6b6f]">
                    {transactionTypeLabels[row.type] ?? row.type}
                  </p>
                  <p className="text-lg font-semibold text-[#2d2224]">{row._count.id}</p>
                  {row._sum.euroAmount != null && row._sum.euroAmount > 0 && (
                    <p className="text-xs text-[#b84d63]">{formatEuro(row._sum.euroAmount)}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-[#2d2224]">
            Historique des transactions
          </h2>
          <select
            className="h-10 rounded-xl border border-[#ead8d4] bg-white px-3 text-sm text-[#5c484c]"
            value={type}
            onChange={(e) => {
              setPage(1);
              setType(e.target.value);
            }}
          >
            <option value="">Tous les types</option>
            <option value="achat">Achats / abonnements</option>
            <option value="consommation">Consommations</option>
            <option value="remboursement_justice">Remboursements</option>
            <option value="remboursement_paiement">Remboursements en argent</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#ead8d4]/80 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Membre</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Crédits</TableHead>
                <TableHead>Montant €</TableHead>
                <TableHead>Réf. paiement</TableHead>
                <TableHead>Détail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!tx?.data.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-[#8a6b6f]">
                    Aucune transaction pour le moment
                  </TableCell>
                </TableRow>
              ) : (
                tx.data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm text-[#8a6b6f] whitespace-nowrap">
                      {formatDate(row.date)}
                    </TableCell>
                    <TableCell>
                      {row.user ? (
                        <>
                          <Link
                            href={userHref(row.user.id)}
                            className="font-medium text-[#2d2224] hover:text-[#b84d63]"
                          >
                            {row.user.firstName} {row.user.lastName}
                          </Link>
                          <p className="text-xs text-[#8a6b6f]">{row.user.email}</p>
                          <p className="text-xs text-[#b0a0a3]">
                            Solde : {row.user.creditBalance} cr.
                          </p>
                        </>
                      ) : (
                        <p className="text-sm italic text-[#8a6b6f]">Compte supprimé (paiement conservé)</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.type} />
                    </TableCell>
                    <TableCell
                      className={
                        row.creditAmount >= 0
                          ? "font-medium text-emerald-700"
                          : "font-medium text-[#9e4a5a]"
                      }
                    >
                      {row.creditAmount > 0 ? "+" : ""}
                      {row.creditAmount}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatEuro(row.euroAmount)}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-xs text-[#8a6b6f]">
                      {row.paymentRef ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-[#6b5458]">
                      {row.description ??
                        (row.journey
                          ? `Parcours ${row.journey.userA.firstName} & ${row.journey.userB.firstName}`
                          : "—")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {tx && tx.meta.totalPages > 1 && (
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={page >= tx.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
