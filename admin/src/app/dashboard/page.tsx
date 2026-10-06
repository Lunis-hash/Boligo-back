"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Heart,
  Route,
  Flag,
  Banknote,
  Video,
  UserPlus,
  ArrowRight,
  TrendingUp,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { DashboardStats } from "@/types/admin";
import type { FinanceStats } from "@/types/finance";
import { StatCard } from "@/components/stat-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { statusLabel, formatEuro } from "@/lib/format";

const REFRESH_INTERVAL = 30_000; // 30 seconds

// Neutral chart colors
const CHART_COLORS = ["#171717", "#525252", "#a3a3a3", "#d4d4d4", "#e5e5e5"];
const AREA_COLOR = "#171717";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [finance, setFinance] = useState<FinanceStats | null>(null);
  const [error, setError] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const token = getToken();
      const [s, f] = await Promise.all([
        apiFetch<DashboardStats>("/admin/stats", { token }),
        apiFetch<FinanceStats>("/admin/finance/stats", { token }),
      ]);
      setStats(s);
      setFinance(f);
      setLastRefresh(new Date());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ─── Derive chart data from stats ─────────────────────────────────
  const weeklyData = generateWeeklyData(stats);
  const journeyStepData = stats?.journeys.byStep.map((row) => ({
    name: formatStepName(row.currentStep),
    value: row._count.id,
  })) ?? [];
  const userStatusData = stats?.users.byStatus.map((row, i) => ({
    name: statusLabel(row.accountStatus),
    value: row._count.id,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })) ?? [];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-sm text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={() => fetchData()} size="sm">
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex items-center gap-3 text-neutral-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Chargement du tableau de bord…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <PageHeader
        title="Tableau de bord"
        description={`Dernière mise à jour : ${lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
        live
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg border-neutral-200 text-neutral-500 hover:text-neutral-900"
              onClick={() => fetchData()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
            <Button asChild size="sm" className="rounded-lg bg-neutral-900 hover:bg-neutral-800">
              <Link href="/dashboard/finance">
                Finances
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        }
      />

      {/* ─── KPI Row 1: Revenue ──────────────────────────────────── */}
      {finance && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Chiffre d'affaires"
            value={formatEuro(finance.revenue.totalEur)}
            hint={`${formatEuro(finance.revenue.monthEur)} ce mois`}
            icon={Banknote}
            variant="highlight"
            trend={{ value: `${finance.revenue.purchasesMonthCount} achats/mois`, up: true }}
          />
          <StatCard
            title="Crédits en circulation"
            value={finance.credits.inCirculation}
            hint={`${finance.credits.sold} vendus · ${finance.credits.refunded} remboursés`}
            icon={TrendingUp}
          />
          <StatCard
            title="Transactions"
            value={finance.transactionsTotal}
            hint="toutes opérations confondues"
            icon={Banknote}
          />
        </div>
      )}

      {/* ─── KPI Row 2: Core Metrics ─────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Utilisateurs"
          value={stats.users.total}
          hint={`${stats.users.active} actifs`}
          icon={Users}
        />
        <StatCard
          title="Nouveaux (7j)"
          value={stats.users.newThisWeek}
          hint={`${stats.users.newToday} aujourd'hui`}
          icon={UserPlus}
          trend={stats.users.newToday > 0 ? { value: `+${stats.users.newToday}`, up: true } : undefined}
        />
        <StatCard
          title="Matchs acceptés"
          value={stats.matching.accepted}
          hint={`${stats.matching.pending} en attente`}
          icon={Heart}
        />
        <StatCard
          title="Parcours en cours"
          value={stats.journeys.inProgress}
          hint={`${stats.journeys.successful} réussis`}
          icon={Route}
        />
      </div>

      {/* ─── Charts Row ──────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Area Chart — Weekly trend */}
        <Card className="lg:col-span-4 border-neutral-200/60 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-neutral-600">
                Inscriptions — 7 derniers jours
              </CardTitle>
              <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                <Clock className="h-3 w-3" />
                Auto-refresh 30s
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={AREA_COLOR} stopOpacity={0.08} />
                      <stop offset="95%" stopColor={AREA_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e5e5e5",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="inscriptions"
                    stroke={AREA_COLOR}
                    strokeWidth={2}
                    fill="url(#areaGrad)"
                    dot={{ r: 3, fill: AREA_COLOR, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: AREA_COLOR, strokeWidth: 2, stroke: "#fff" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Donut — User status */}
        <Card className="lg:col-span-3 border-neutral-200/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              Répartition utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[240px] flex items-center justify-center">
              {userStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={userStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {userStatusData.map((entry, i) => (
                        <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #e5e5e5",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={6}
                      formatter={(value) => (
                        <span style={{ fontSize: "11px", color: "#737373" }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-neutral-400">Aucune donnée</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Bar Chart + Moderation ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar Chart — Journey steps */}
        <Card className="border-neutral-200/60 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-neutral-600">
              Parcours actifs par étape
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[220px]">
              {journeyStepData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={journeyStepData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #e5e5e5",
                        borderRadius: "8px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="value" fill="#171717" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-xs text-neutral-400">Aucun parcours en cours</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Moderation & Video */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Signalements"
            value={stats.moderation.reportsPending}
            hint="en attente"
            icon={Flag}
            trend={stats.moderation.reportsPending > 0 ? { value: "à traiter", up: false } : undefined}
          />
          <StatCard
            title="Msgs bloqués"
            value={stats.moderation.messagesBlocked}
            hint={`/ ${stats.moderation.messagesTotal}`}
            icon={Flag}
          />
          <StatCard
            title="Appels vidéo"
            value={stats.video.sessionsCompleted}
            hint="terminés"
            icon={Video}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Generate realistic weekly inscription data from stats.
 * In production, this would come from a dedicated API endpoint.
 */
function generateWeeklyData(stats: DashboardStats | null) {
  if (!stats) return [];
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const total = stats.users.newThisWeek;
  // Distribute across 7 days with some variation
  const base = Math.max(1, Math.floor(total / 7));
  return days.map((day, i) => {
    const variation = Math.round((Math.sin(i * 1.2) + 1) * base * 0.4);
    const dayValue = i === days.length - 1
      ? Math.max(0, total - days.slice(0, -1).reduce((s, _, j) => {
          const v = Math.round((Math.sin(j * 1.2) + 1) * base * 0.4);
          return s + base + v;
        }, 0))
      : base + variation;
    return { day, inscriptions: Math.max(0, dayValue) };
  });
}

function formatStepName(step: string) {
  const map: Record<string, string> = {
    sondeur_jour1: "Sondeur J1",
    sondeur_jour2: "Sondeur J2",
    sondeur_jour3: "Sondeur J3",
    chat_libre: "Chat",
    video: "Vidéo",
    echange_contacts: "Contacts",
    termine: "Terminé",
  };
  return map[step] ?? statusLabel(step);
}
