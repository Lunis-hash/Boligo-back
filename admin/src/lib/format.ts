export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatPercent(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function formatEuro(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export const transactionTypeLabels: Record<string, string> = {
  achat: "Achat / abonnement",
  consommation: "Consommation",
  remboursement_justice: "Remboursement justice",
};
