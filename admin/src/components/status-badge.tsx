import { Badge } from "@/components/ui/badge";
import { statusLabel } from "@/lib/format";

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
  actif: "success",
  nouveau: "secondary",
  en_entretien: "warning",
  en_parcours: "default",
  suspendu: "destructive",
  acceptee: "success",
  en_attente: "warning",
  refusee: "destructive",
  expiree: "outline",
  en_cours: "warning",
  reussi: "success",
  echoue: "destructive",
  abandonne: "outline",
  traite: "success",
  rejete: "outline",
  bloque: "destructive",
  ok: "success",
  achat: "success",
  consommation: "warning",
  remboursement_justice: "secondary",
};

const typeLabels: Record<string, string> = {
  achat: "Achat",
  consommation: "Consommation",
  remboursement_justice: "Remboursement",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = statusVariants[status] ?? "outline";
  const label = typeLabels[status] ?? statusLabel(status);
  return <Badge variant={variant}>{label}</Badge>;
}
