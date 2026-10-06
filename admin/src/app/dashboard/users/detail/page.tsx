"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User as UserIcon, Shield, Wallet, Route, Flag, Video, FileText, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { getAdminUser, getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, statusLabel, formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

// Types matching backend returned fields
type UserDetail = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  city: string | null;
  gender: string;
  accountStatus: string;
  creditBalance: number;
  isVerified: boolean;
  createdAt: string;
  lastLogin: string | null;
  profile: { profileStatus: string; description: string | null; profession: string | null } | null;
  mentalMaps: { 
    synthesis: string | null; 
    maturityScore: number | null; 
    alchemyScore: number | null; 
    bio: string | null;
    needsList: any;
    redFlags: any;
    keyValues: any;
    signals: any;
  }[];
  interviews: { id: string; status: string; startDate: string; endDate: string | null }[];
  transactions: { id: string; type: string; creditAmount: number; euroAmount: number | null; date: string }[];
  receivedProposals: { id: string; status: string; compatibilityScore: number; proposedAt: string; targetUser: { firstName: string; lastName: string } }[];
  targetedProposals: { id: string; status: string; compatibilityScore: number; proposedAt: string; sourceUser: { firstName: string; lastName: string } }[];
  journeysA: { id: string; currentStep: string; result: string; userB: { firstName: string; lastName: string } }[];
  journeysB: { id: string; currentStep: string; result: string; userA: { firstName: string; lastName: string } }[];
  receivedReports: { id: string; reason: string; status: string; reportedAt: string }[];
};

function StatusPill({ status, type = "neutral" }: { status: string; type?: "success" | "danger" | "warning" | "neutral" }) {
  const colors = {
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    danger: "bg-red-50 text-red-600 border-red-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", colors[type])}>
      {statusLabel(status)}
    </span>
  );
}

/** Affiche une liste en puces, un texte tel quel, un objet en lignes « clé : valeur ». */
function MapValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-1 pl-4">
        {value.map((item, i) => (
          <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
        ))}
      </ul>
    );
  }
  if (value && typeof value === "object") {
    return (
      <ul className="space-y-1">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <li key={k}>
            <span className="text-neutral-500">{k} : </span>
            {typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v)}
          </li>
        ))}
      </ul>
    );
  }
  return <p>{String(value)}</p>;
}

function UserDetailPage() {
  const id = useSearchParams().get("id") ?? "";
  const [user, setUser] = useState<UserDetail | null>(null);
  const [saving, setSaving] = useState(false);

  function reload() {
    apiFetch<UserDetail>(`/admin/users/${id}`, { token: getToken() }).then(setUser).catch(console.error);
  }

  useEffect(() => {
    reload();
  }, [id]);

  async function patch(body: Record<string, unknown>) {
    setSaving(true);
    try {
      await apiFetch(`/admin/users/${id}`, {
        method: "PATCH",
        token: getToken(),
        body: JSON.stringify(body),
      });
      reload();
    } finally {
      setSaving(false);
    }
  }

  if (!user) return (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-neutral-400">Chargement de l'utilisateur…</p>
    </div>
  );

  const map = user.mentalMaps?.[0];
  const allJourneys = [...user.journeysA, ...user.journeysB];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <Link href="/dashboard/users" className="mb-6 inline-flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Retour aux utilisateurs
      </Link>

      {/* ─── Header & Actions ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between rounded-2xl border border-neutral-200/60 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl font-bold text-neutral-600">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
                {user.firstName} {user.lastName}
              </h1>
              {user.isVerified && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              <StatusPill 
                status={user.accountStatus} 
                type={user.accountStatus === 'suspendu' ? 'danger' : user.accountStatus === 'actif' ? 'success' : 'neutral'} 
              />
            </div>
            <p className="text-sm text-neutral-500">{user.email}</p>
            <div className="mt-2 flex gap-4 text-[13px] text-neutral-400">
              <span>Inscrit le {formatDate(user.createdAt)}</span>
              <span>•</span>
              <span>Dernière co : {formatDate(user.lastLogin)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {user.accountStatus !== "suspendu" && (
            <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" disabled={saving} onClick={() => patch({ accountStatus: "suspendu" })}>
              Suspendre
            </Button>
          )}
          {user.accountStatus === "suspendu" && (
            <Button variant="outline" size="sm" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" disabled={saving} onClick={() => patch({ accountStatus: "actif" })}>
              Réactiver
            </Button>
          )}
          {/* Certification et crédits : réservés à l'administrateur (règle de l'API). */}
          {getAdminUser()?.role === "ADMIN" && (
            <>
              <Button variant="outline" size="sm" className="border-neutral-200 text-neutral-700" disabled={saving} onClick={() => patch({ isVerified: !user.isVerified })}>
                <Shield className="mr-2 h-3.5 w-3.5" />
                {user.isVerified ? "Révoquer certif" : "Certifier"}
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-framboise to-lavande text-white hover:opacity-90" disabled={saving} onClick={() => patch({ creditBalance: user.creditBalance + 10 })}>
                <Wallet className="mr-2 h-3.5 w-3.5" />
                +10 Crédits
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ─── Informations Personnelles ─────────────────────────────────────────────────── */}
        <Card className="border-neutral-200/60 shadow-none">
          <CardHeader className="border-b border-neutral-100 pb-4">
            <CardTitle className="flex items-center text-sm font-medium text-neutral-900">
              <UserIcon className="mr-2 h-4 w-4 text-neutral-400" /> Profil public
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
              <div>
                <dt className="text-neutral-500">Ville</dt>
                <dd className="font-medium text-neutral-900">{user.city ?? "Non renseigné"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Genre</dt>
                <dd className="font-medium text-neutral-900">{user.gender}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Profession</dt>
                <dd className="font-medium text-neutral-900">{user.profile?.profession ?? "Non renseigné"}</dd>
              </div>
              <div>
                <dt className="text-neutral-500">Statut profil</dt>
                <dd className="font-medium text-neutral-900"><StatusPill status={user.profile?.profileStatus ?? "inconnu"} /></dd>
              </div>
              <div className="col-span-2">
                <dt className="text-neutral-500">Description complète</dt>
                <dd className="mt-1 rounded-lg bg-neutral-50 p-3 text-neutral-700 text-[13px] leading-relaxed">
                  {user.profile?.description || "Aucune description renseignée."}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* ─── IA & Carte Mentale ─────────────────────────────────────────────────── */}
        <Card className="border-neutral-200/60 shadow-none">
          <CardHeader className="border-b border-neutral-100 pb-4">
            <CardTitle className="flex items-center text-sm font-medium text-neutral-900">
              <FileText className="mr-2 h-4 w-4 text-neutral-400" /> Analyse IA
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {map ? (
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-neutral-500">Maturité</dt>
                  <dd className="font-medium text-neutral-900 text-lg">
                    {map.maturityScore != null ? Math.round(map.maturityScore * 100) + "%" : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Alchimie</dt>
                  <dd className="font-medium text-neutral-900 text-lg">
                    {map.alchemyScore != null ? Math.round(map.alchemyScore * 100) + "%" : "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-neutral-500 mb-1">Synthèse psychologique</dt>
                  <dd className="rounded-lg bg-neutral-50 p-3 text-[13px] text-neutral-700 leading-relaxed">
                    {map.synthesis || "En cours de génération..."}
                  </dd>
                </div>
                {map.needsList && Object.keys(map.needsList).length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-neutral-500 mb-1">Besoins profonds</dt>
                    <dd className="rounded-lg bg-neutral-50 p-3 text-[13px] text-neutral-700">
                      <MapValue value={map.needsList} />
                    </dd>
                  </div>
                )}
                {map.redFlags && Object.keys(map.redFlags).length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-red-500 mb-1 font-medium">Signaux d'alerte</dt>
                    <dd className="rounded-lg bg-red-50/50 border border-red-100 p-3 text-[13px] text-red-700">
                      <MapValue value={map.redFlags} />
                    </dd>
                  </div>
                )}
                {map.keyValues && Object.keys(map.keyValues).length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-neutral-500 mb-1">Valeurs clés</dt>
                    <dd className="rounded-lg bg-neutral-50 p-3 text-[13px] text-neutral-700">
                      <MapValue value={map.keyValues} />
                    </dd>
                  </div>
                )}
                {map.signals && Object.keys(map.signals).length > 0 && (
                  <div className="col-span-2">
                    <dt className="text-neutral-500 mb-1">Signaux de compatibilité</dt>
                    <dd className="rounded-lg bg-neutral-50 p-3 text-[13px] text-neutral-700">
                      <MapValue value={map.signals} />
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-sm text-neutral-500">Aucune carte mentale générée.</p>
            )}

            <div className="pt-2">
              <p className="text-[13px] font-medium text-neutral-900 mb-2">Historique des entretiens IA</p>
              {user.interviews.length > 0 ? (
                <div className="space-y-2">
                  {user.interviews.map(i => (
                    <div key={i.id} className="flex justify-between items-center text-[12px] bg-neutral-50 px-3 py-2 rounded-md">
                      <span className="text-neutral-500">{formatDate(i.startDate)}</span>
                      <StatusPill status={i.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-neutral-400">Aucun entretien.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ─── Transactions & Crédits ─────────────────────────────────────────────────── */}
        <Card className="border-neutral-200/60 shadow-none">
          <CardHeader className="border-b border-neutral-100 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center text-sm font-medium text-neutral-900">
                <Wallet className="mr-2 h-4 w-4 text-neutral-400" /> Solde et Opérations
              </CardTitle>
              <span className="text-lg font-bold text-neutral-900">{user.creditBalance} cr</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {user.transactions.length > 0 ? (
              <ul className="divide-y divide-neutral-100">
                {user.transactions.map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between py-3 text-[13px]">
                    <div>
                      <p className="font-medium text-neutral-900 capitalize">{statusLabel(tx.type)}</p>
                      <p className="text-neutral-400">{formatDate(tx.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-medium", tx.creditAmount > 0 ? "text-emerald-600" : "text-neutral-900")}>
                        {tx.creditAmount > 0 ? "+" : ""}{tx.creditAmount}
                      </p>
                      {tx.euroAmount != null && (
                        <p className="text-neutral-400 text-[11px]">{formatEuro(tx.euroAmount)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-sm text-neutral-500">Aucune transaction.</p>
            )}
          </CardContent>
        </Card>

        {/* ─── Parcours ─────────────────────────────────────────────────── */}
        <Card className="border-neutral-200/60 shadow-none">
          <CardHeader className="border-b border-neutral-100 pb-4">
            <CardTitle className="flex items-center text-sm font-medium text-neutral-900">
              <Route className="mr-2 h-4 w-4 text-neutral-400" /> Matchs & Parcours
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-6">
            <div className="mt-4">
              <p className="text-[13px] font-semibold text-neutral-500 mb-2 uppercase tracking-wide">Parcours engagés ({allJourneys.length})</p>
              {allJourneys.length > 0 ? (
                <ul className="space-y-2">
                  {allJourneys.map((j) => {
                    const otherUser = 'userB' in j ? j.userB : j.userA;
                    return (
                      <li key={j.id} className="flex items-center justify-between rounded-lg bg-neutral-50 p-3 text-[13px]">
                        <div>
                          <p className="font-medium text-neutral-900">Avec {otherUser.firstName} {otherUser.lastName}</p>
                          <p className="text-neutral-500">ID: {j.id.slice(0, 8)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <StatusPill status={j.currentStep} />
                          <StatusPill status={j.result} type={j.result === 'reussi' ? 'success' : j.result === 'echoue' ? 'danger' : 'neutral'} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-[13px] text-neutral-400">Aucun parcours.</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[13px] font-semibold text-neutral-500 mb-2 uppercase tracking-wide">Demandes Reçues</p>
                {user.targetedProposals.length > 0 ? (
                  <ul className="space-y-2">
                    {user.targetedProposals.map((p) => (
                      <li key={p.id} className="text-[12px]">
                        De <span className="font-medium text-neutral-900">{p.sourceUser.firstName}</span> <br/>
                        <span className="text-neutral-400">{Math.round(p.compatibilityScore * 100)}% • <StatusPill status={p.status} /></span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-[13px] text-neutral-400">Aucune.</p>}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-neutral-500 mb-2 uppercase tracking-wide">Demandes Envoyées</p>
                {user.receivedProposals.length > 0 ? (
                  <ul className="space-y-2">
                    {user.receivedProposals.map((p) => (
                      <li key={p.id} className="text-[12px]">
                        À <span className="font-medium text-neutral-900">{p.targetUser.firstName}</span> <br/>
                        <span className="text-neutral-400">{Math.round(p.compatibilityScore * 100)}% • <StatusPill status={p.status} /></span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-[13px] text-neutral-400">Aucune.</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* ─── Modération ─────────────────────────────────────────────────── */}
      {user.receivedReports.length > 0 && (
        <Card className="border-red-100 bg-red-50/30 shadow-none">
          <CardHeader className="border-b border-red-100 pb-4">
            <CardTitle className="flex items-center text-sm font-medium text-red-900">
              <Flag className="mr-2 h-4 w-4 text-red-500" /> Signalements à l'encontre de ce membre
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ul className="space-y-3">
              {user.receivedReports.map(r => (
                <li key={r.id} className="flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium text-red-900">{statusLabel(r.reason)}</span>
                    <span className="ml-2 text-red-700/60 text-xs">{formatDate(r.reportedAt)}</span>
                  </div>
                  <StatusPill status={r.status} type="danger" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

// useSearchParams demande une frontière Suspense dans un site statique.
export default function UserDetailRoute() {
  return (
    <Suspense fallback={null}>
      <UserDetailPage />
    </Suspense>
  );
}
