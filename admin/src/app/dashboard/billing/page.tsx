"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCcw } from "lucide-react";
import { apiFetch, API_URL } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { formatDate, formatEuro } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
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

interface BillingStatus {
  flags: {
    enabled: boolean;
    stripeTax: boolean;
    addressRequired: boolean;
    consentRequired: boolean;
    franchise: boolean;
  };
  mode: string;
  issues: string[];
  invoices: Record<string, number> | null;
}

interface Withdrawal {
  id: string;
  status: "recue" | "remboursee" | "refusee";
  requestedAt: string;
  decidedAt: string | null;
  refundCents: number | null;
  note: string | null;
  member: { id: string; name: string; email: string } | null;
  payment: { ref: string; paidAt: string; amountCents: number; refundedCents: number };
  creditUsed: boolean;
  suggestedRefundCents: number | null;
}

const FLAG_LABELS: Record<keyof BillingStatus["flags"], string> = {
  enabled: "Registre des factures, avoirs et rétractation (BILLING_ENABLED)",
  stripeTax: "TVA calculée par Stripe Tax (BILLING_STRIPE_TAX)",
  addressRequired: "Adresse de facturation demandée (BILLING_ADDRESS_REQUIRED)",
  consentRequired: "Demande de commencement exigée (BILLING_EARLY_START_CONSENT_REQUIRED)",
  franchise: "Franchise en base de TVA (BILLING_VAT_FRANCHISE)",
};

const STATUS_LABELS: Record<Withdrawal["status"], string> = {
  recue: "À traiter",
  remboursee: "Remboursée",
  refusee: "Refusée",
};

const cents = (c: number) => formatEuro(c / 100);

/** Délai légal : rembourser au plus tard 14 jours après la demande. */
function deadline(requestedAt: string) {
  const d = new Date(requestedAt);
  d.setDate(d.getDate() + 14);
  return d.toISOString();
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    setError(null);
    try {
      const s = await apiFetch<BillingStatus>("/admin/billing/status", { token });
      setStatus(s);
      setWithdrawals(
        s.flags.enabled
          ? await apiFetch<Withdrawal[]>("/admin/billing/withdrawals", { token })
          : [],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(w: Withdrawal, action: "refund" | "refuse") {
    let body: { action: string; amountCents?: number; note?: string };
    if (action === "refund") {
      const remaining = w.payment.amountCents - w.payment.refundedCents;
      const proposed = ((w.suggestedRefundCents ?? remaining) / 100).toFixed(2);
      const answer = window.prompt(
        w.creditUsed
          ? `Le crédit a déjà servi : remboursez la part non fournie du parcours (au plus ${cents(remaining)}). Montant en euros :`
          : `Crédit inutilisé : remboursement total. Montant en euros (au plus ${cents(remaining)}) :`,
        proposed,
      );
      if (answer === null) return;
      const amount = Math.round(parseFloat(answer.replace(",", ".")) * 100);
      if (!Number.isFinite(amount) || amount <= 0) {
        alert("Montant invalide.");
        return;
      }
      if (!confirm(`Rembourser ${cents(amount)} sur la carte du membre ? Cette action est définitive.`)) return;
      body = { action, amountCents: amount };
    } else {
      const note = window.prompt("Motif du refus (envoyé au membre) :");
      if (!note?.trim()) return;
      body = { action, note: note.trim() };
    }
    setBusy(w.id);
    try {
      await apiFetch(`/admin/billing/withdrawals/${w.id}/decide`, {
        method: "POST",
        token: getToken(),
        body: JSON.stringify(body),
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action impossible");
    } finally {
      setBusy(null);
    }
  }

  async function exportJournal() {
    setBusy("export");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`${API_URL}/admin/billing/sales/export/csv?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Export impossible");
      const url = window.URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `boligo_journal_des_ventes_${from || "debut"}_${to || "aujourdhui"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Export impossible");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Facturation"
        description="Factures, avoirs, demandes de rétractation et journal des ventes pour l'expert-comptable."
        action={
          <Button variant="outline" size="sm" className="rounded-xl border-[#ead8d4]" onClick={load}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        }
      />

      {error ? <p className="text-red-700">{error}</p> : null}

      {status ? (
        <Card className="rounded-2xl border-[#ead8d4]/80">
          <CardHeader>
            <CardTitle className="text-base">
              Réglages (Stripe en mode {status.mode})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#5c484c]">
            <ul className="space-y-1">
              {(Object.keys(FLAG_LABELS) as (keyof BillingStatus["flags"])[]).map((k) => (
                <li key={k}>
                  {status.flags[k] ? "✓" : "✗"} {FLAG_LABELS[k]}
                </li>
              ))}
            </ul>
            {status.invoices ? (
              <p>
                Pièces émises : {status.invoices.emise ?? 0} · en attente : {status.invoices.a_emettre ?? 0} · en
                erreur : {status.invoices.erreur ?? 0}
              </p>
            ) : null}
            {status.issues.length ? (
              <div className="rounded-xl bg-amber-50 p-3 text-amber-900">
                <p className="font-semibold">À régler avant d&apos;encaisser pour de vrai</p>
                <ul className="mt-1 list-disc pl-5">
                  {status.issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#2a1b3d]">Demandes de rétractation</h2>
        {!status?.flags.enabled ? (
          <p className="text-sm text-[#8a6b6f]">
            Registre désactivé : chaque demande arrive par e-mail (BILLING_ALERT_EMAILS) et se rembourse depuis le
            tableau de bord Stripe.
          </p>
        ) : !withdrawals ? (
          <p className="text-[#8a6b6f]">Chargement…</p>
        ) : withdrawals.length === 0 ? (
          <p className="text-sm text-[#8a6b6f]">Aucune demande.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#ead8d4]/80 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Demande</TableHead>
                  <TableHead>Membre</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead>Crédit</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      {formatDate(w.requestedAt)}
                      {w.status === "recue" ? (
                        <div className="text-xs text-[#8a6b6f]">à rembourser avant le {formatDate(deadline(w.requestedAt))}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {w.member ? (
                        <>
                          {w.member.name}
                          <div className="text-xs text-[#8a6b6f]">{w.member.email}</div>
                        </>
                      ) : (
                        "Compte supprimé"
                      )}
                    </TableCell>
                    <TableCell>
                      {cents(w.payment.amountCents)} le {formatDate(w.payment.paidAt)}
                      {w.payment.refundedCents ? (
                        <div className="text-xs text-[#8a6b6f]">déjà remboursé : {cents(w.payment.refundedCents)}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>{w.creditUsed ? "Parcours commencé" : "Inutilisé"}</TableCell>
                    <TableCell>
                      {STATUS_LABELS[w.status]}
                      {w.refundCents ? ` (${cents(w.refundCents)})` : ""}
                      {w.note ? <div className="text-xs text-[#8a6b6f]">{w.note}</div> : null}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {w.status === "recue" ? (
                        <>
                          <Button size="sm" disabled={busy !== null} onClick={() => decide(w, "refund")}>
                            {busy === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rembourser"}
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => decide(w, "refuse")}>
                            Refuser
                          </Button>
                        </>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#2a1b3d]">Journal des ventes</h2>
        <p className="text-sm text-[#8a6b6f]">
          Factures et avoirs émis (avoirs en négatif), avec le pays, le régime et le taux de TVA. À transmettre à
          l&apos;expert-comptable, notamment pour la déclaration OSS.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-[#5c484c]">
            Du
            <input
              type="date"
              className="ml-2 h-10 rounded-xl border border-[#ead8d4] px-3"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="text-sm text-[#5c484c]">
            au (exclu)
            <input
              type="date"
              className="ml-2 h-10 rounded-xl border border-[#ead8d4] px-3"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <Button variant="outline" className="rounded-xl border-[#ead8d4]" onClick={exportJournal} disabled={busy !== null}>
            {busy === "export" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exporter le journal
          </Button>
        </div>
      </section>
    </div>
  );
}
