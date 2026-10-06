"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Route, Video, MessageSquare, Target, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, statusLabel, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

type JourneyDetail = {
  id: string;
  currentStep: string;
  result: string;
  createdAt: string;
  closingReason: string | null;
  userA: { firstName: string; lastName: string; email: string };
  userB: { firstName: string; lastName: string; email: string };
  proposal: { compatibilityScore: number; iaExplanation: string | null };
  messages: {
    id: string;
    content: string;
    sentAt: string;
    moderationStatus: string;
    sender: { firstName: string; lastName: string };
  }[];
  videoSession: { status: string; durationMinutes: number | null; dailyRoomUrl: string | null } | null;
  harmonyQuestions: { day: number; theme: string; questionText: string; responses: { responseText: string }[] }[];
};

function StatusPill({ status, type = "neutral" }: { status: string; type?: "success" | "danger" | "warning" | "neutral" }) {
  if (status === "reussi" || status === "termine" || status === "echange_contacts" || status === "ok") type = "success";
  if (status === "echoue" || status === "abandonne" || status === "bloque") type = "danger";
  if (status === "en_cours" || status === "phase_harmonie" || status === "chat_libre" || status === "video" || status === "en_verification") type = "warning";

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

function JourneyDetailPage() {
  const id = useSearchParams().get("id") ?? "";
  const [journey, setJourney] = useState<JourneyDetail | null>(null);

  useEffect(() => {
    apiFetch<JourneyDetail>(`/admin/journeys/${id}`, { token: getToken() }).then(setJourney).catch(console.error);
  }, [id]);

  if (!journey) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-neutral-400">Chargement du parcours…</p>
    </div>
  );

  const isSuccess = journey.result === "reussi";
  const isFail = journey.result === "echoue" || journey.result === "abandonne";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <Link href="/dashboard/journeys" className="mb-6 inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux parcours
      </Link>

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className={cn(
        "flex flex-col gap-6 md:flex-row md:items-start md:justify-between rounded-2xl border bg-white p-6 shadow-sm",
        isSuccess ? "border-emerald-200 bg-emerald-50/30" : isFail ? "border-red-200 bg-red-50/30" : "border-neutral-200/60"
      )}>
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 shadow-sm">
            <Route className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                {journey.userA.firstName} & {journey.userB.firstName}
              </h1>
              <StatusPill status={journey.currentStep} />
              <StatusPill status={journey.result} />
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              Parcours initié le {formatDate(journey.createdAt)}
            </p>
            {journey.closingReason && (
              <p className="text-[13px] text-red-600 font-medium mt-2">Motif de clôture : {journey.closingReason}</p>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-neutral-500">Score de compatibilité</p>
          <p className="text-3xl font-bold tracking-tight text-neutral-900">{formatPercent(journey.proposal.compatibilityScore)}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ─── Justification IA ─────────────────────────────────────────────────── */}
        <Card className="border-neutral-200/60 shadow-none">
          <CardHeader className="border-b border-neutral-100 pb-4">
            <CardTitle className="flex items-center text-sm font-medium text-neutral-900">
              <Target className="mr-2 h-4 w-4 text-neutral-400" /> Pourquoi ce match ? (IA)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-[13px] leading-relaxed text-neutral-700 bg-neutral-50 p-3 rounded-lg">
              {journey.proposal.iaExplanation || "L'algorithme a validé une forte alchimie basée sur les valeurs profondes et les attentes mutuelles."}
            </p>
          </CardContent>
        </Card>

        {/* ─── Appel Vidéo ─────────────────────────────────────────────────── */}
        <Card className="border-neutral-200/60 shadow-none">
          <CardHeader className="border-b border-neutral-100 pb-4">
            <CardTitle className="flex items-center text-sm font-medium text-neutral-900">
              <Video className="mr-2 h-4 w-4 text-neutral-400" /> Session Vidéo (Daily.co)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {journey.videoSession ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-neutral-50 p-2 rounded-md">
                  <span className="text-neutral-500">Statut de l'appel</span>
                  <StatusPill status={journey.videoSession.status} />
                </div>
                <div className="flex justify-between items-center bg-neutral-50 p-2 rounded-md">
                  <span className="text-neutral-500">Durée effective</span>
                  <span className="font-medium text-neutral-900">{journey.videoSession.durationMinutes ? `${journey.videoSession.durationMinutes} min` : "—"}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-neutral-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" /> Aucun appel vidéo planifié pour l'instant.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ─── Le Sondeur (Questions Harmonie) ─────────────────────────────────────────────────── */}
        <Card className="border-neutral-200/60 shadow-none md:col-span-2">
          <CardHeader className="border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center text-sm font-medium text-neutral-900">
                <Info className="mr-2 h-4 w-4 text-neutral-400" /> Le Sondeur (Questions Brise-glace IA)
              </CardTitle>
              <span className="text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 font-medium">Les 3 premiers jours</span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {journey.harmonyQuestions.length > 0 ? (
              <div className="space-y-6">
                {journey.harmonyQuestions.map((hq, index) => (
                  <div key={index} className="border border-neutral-100 rounded-xl overflow-hidden">
                    <div className="bg-neutral-50 px-4 py-3 border-b border-neutral-100">
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Jour {hq.day} • {hq.theme}</p>
                      <p className="text-sm font-medium text-neutral-900">{hq.questionText}</p>
                    </div>
                    <div className="p-4 bg-white">
                      <p className="text-xs text-neutral-500 mb-2 font-medium">Réponses soumises : {hq.responses.length}/2</p>
                      <div className="flex flex-wrap gap-2">
                        {hq.responses.map((resp, rIndex) => (
                          <div key={rIndex} className="bg-neutral-50 px-3 py-2 rounded-lg text-[13px] text-neutral-700 border border-neutral-100">
                            "{resp.responseText}"
                          </div>
                        ))}
                        {hq.responses.length === 0 && <span className="text-xs text-neutral-400 italic">En attente des réponses...</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">Aucune question du sondeur générée.</p>
            )}
          </CardContent>
        </Card>

        {/* ─── Historique des Messages (Chat Libre) ─────────────────────────────────────────────────── */}
        <Card className="border-neutral-200/60 shadow-none md:col-span-2">
          <CardHeader className="border-b border-neutral-100 pb-4">
            <CardTitle className="flex items-center text-sm font-medium text-neutral-900">
              <MessageSquare className="mr-2 h-4 w-4 text-neutral-400" /> Derniers messages du Chat Libre ({journey.messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {journey.messages.length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {journey.messages.map((m) => (
                  <div key={m.id} className={cn(
                    "flex flex-col gap-1 rounded-xl p-3 text-sm",
                    m.moderationStatus === "bloque" ? "bg-red-50/50 border border-red-100" : "bg-neutral-50 border border-neutral-100"
                  )}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-neutral-900 text-[13px]">
                        {m.sender.firstName} {m.sender.lastName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400">{formatDate(m.sentAt)}</span>
                        {m.moderationStatus !== "ok" && <StatusPill status={m.moderationStatus} />}
                      </div>
                    </div>
                    <p className={cn("text-[13px] leading-relaxed", m.moderationStatus === "bloque" ? "text-red-700 italic" : "text-neutral-700")}>
                      {m.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">Le chat n'a pas encore démarré ou aucun message n'a été échangé.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// useSearchParams demande une frontière Suspense dans un site statique.
export default function JourneyDetailRoute() {
  return (
    <Suspense fallback={null}>
      <JourneyDetailPage />
    </Suspense>
  );
}
