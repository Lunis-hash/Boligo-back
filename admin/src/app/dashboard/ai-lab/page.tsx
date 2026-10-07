"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

type Scenario = { id: string; name: string; checks: string };

type CoupleResult = {
  id: string;
  name: string;
  checks: string;
  divergences: string[];
  safetyThemes: string[];
  questions: { day: number; theme: string; text: string; source: string }[];
  ai: {
    drafted: number;
    kept: number;
    coverage: string;
    formRejected: string[];
    refused: { text: string; rule: number | null; reason?: string }[];
    unreviewedDays: number[];
  };
  servedDefects: string[];
  reading: {
    headline: string;
    together: string[];
    toDiscuss: { theme: string; text: string }[];
    openers: string[];
    advice?: string;
  } | null;
  readingStatus: string;
  followUp: string | null;
  costEur: number;
  durationMs: number;
  error?: string;
};

type Run = {
  id: string;
  status: "en_cours" | "termine" | "echec";
  startedAt: string;
  finishedAt?: string;
  couples: number;
  results: CoupleResult[];
  summary?: {
    costEur: number;
    averageCostEur: number;
    aiQuestionsServed: number;
    servedDefects: number;
    readingsPublished: number;
    readingsRefused: number;
    dangerBlocked: number;
  };
};

const SOURCE_LABEL: Record<string, string> = {
  ia: "IA relue",
  divergence: "Écart",
  convergence: "Accord",
  gabarit: "Modèle",
};

const euro = (n: number) =>
  n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 3 });

export default function AiLabPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [current, setCurrent] = useState<Run | null>(null);
  const [couples, setCouples] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (id?: string) => {
    const token = getToken();
    const list = await apiFetch<Run[]>("/admin/ai/lab", { token });
    setRuns(list);
    const target = id ?? list[0]?.id;
    if (!target) return;
    const run = await apiFetch<Run>(`/admin/ai/lab/${target}`, { token });
    setCurrent(run);
    if (run.status === "en_cours") {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void load(run.id), 5000);
    }
  }, []);

  useEffect(() => {
    apiFetch<Scenario[]>("/admin/ai/lab/scenarios", { token: getToken() })
      .then(setScenarios)
      .catch(() => setScenarios([]));
    void load().catch(() => undefined);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  async function start() {
    setError(null);
    setStarting(true);
    try {
      const run = await apiFetch<Run>("/admin/ai/lab", {
        token: getToken(),
        method: "POST",
        body: JSON.stringify({ couples }),
      });
      await load(run.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const running = current?.status === "en_cours";

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Laboratoire IA</h1>
        <p className="text-muted-foreground">
          Testez le Sondeur avec les vrais modèles sur des couples types fictifs : questions servies,
          questions refusées et pourquoi, lecture du jour, coût réel. Aucune donnée de membre n’est utilisée.
        </p>
      </div>

      <section className="mb-6 rounded-xl border bg-card p-5">
        <h2 className="mb-1 text-lg font-semibold">Lancer une évaluation</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Environ 1 € par couple (coût réel, compté dans la dépense IA du mois, plafonné à 1,50 €), et 2 à 4 minutes par couple.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm" htmlFor="couples">Couples types</label>
          <select
            id="couples"
            className="rounded-md border px-3 py-2 text-sm"
            value={couples}
            onChange={(e) => setCouples(Number(e.target.value))}
            disabled={running || starting}
          >
            {[1, 3, 5, 10].map((n) => (
              <option key={n} value={n}>
                {n} couple{n > 1 ? "s" : ""} (≈ {euro(n * 1)})
              </option>
            ))}
          </select>
          <Button onClick={start} disabled={running || starting}>
            {running ? "Évaluation en cours…" : starting ? "Lancement…" : "Lancer"}
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {scenarios.length > 0 && (
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            {scenarios.slice(0, couples).map((s) => (
              <li key={s.id}>
                <span className="font-medium text-foreground">{s.name}</span> — {s.checks}
              </li>
            ))}
          </ol>
        )}
      </section>

      {runs.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {runs.map((r) => (
            <button
              key={r.id}
              className={`rounded-full border px-3 py-1 ${current?.id === r.id ? "bg-rose" : ""}`}
              onClick={() => void load(r.id)}
            >
              {formatDate(r.startedAt)} · {r.couples} couple{r.couples > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      )}

      {current && (
        <section className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="text-lg font-semibold">
              Évaluation du {formatDate(current.startedAt)} —{" "}
              {current.status === "en_cours"
                ? `en cours (${current.results.length}/${current.couples})`
                : current.status === "termine"
                  ? "terminée"
                  : "en échec"}
            </h2>
            {current.summary && (
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                <Metric label="Coût total" value={euro(current.summary.costEur)} />
                <Metric label="Coût moyen par couple" value={euro(current.summary.averageCostEur)} />
                <Metric label="Questions de l’IA servies" value={String(current.summary.aiQuestionsServed)} />
                <Metric label="Questions servies hors règles" value={String(current.summary.servedDefects)} alert={current.summary.servedDefects > 0} />
                <Metric label="Lectures publiées" value={`${current.summary.readingsPublished} / ${current.results.length}`} />
                <Metric label="Lectures bloquées (danger)" value={String(current.summary.dangerBlocked)} />
              </div>
            )}
          </div>

          {current.results.map((r) => (
            <details key={r.id} className="rounded-xl border bg-card p-5" open={current.results.length === 1}>
              <summary className="cursor-pointer">
                <span className="font-semibold">{r.name}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  IA : {r.ai.coverage} créneaux · lecture {r.readingStatus} · {euro(r.costEur)} · {Math.round(r.durationMs / 1000)} s
                </span>
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">Ce qui est vérifié : {r.checks}</p>
              {r.error && <p className="mt-2 text-sm text-red-600">Erreur : {r.error}</p>}

              {r.divergences.length > 0 && (
                <Block title="Écarts de l’entretien">
                  <ul className="list-disc pl-5">
                    {r.divergences.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                  {r.safetyThemes.length > 0 && (
                    <p className="mt-1 text-amber-700">Thèmes réservés aux questions de limite : {r.safetyThemes.join(", ")}</p>
                  )}
                </Block>
              )}

              <Block title="Les 21 questions servies">
                {[1, 2, 3].map((day) => (
                  <div key={day} className="mb-2">
                    <p className="font-medium">Jour {day}</p>
                    <ul className="space-y-1">
                      {r.questions.filter((q) => q.day === day).map((q) => (
                        <li key={q.text} className="flex gap-2">
                          <span className="shrink-0 rounded bg-rose px-1.5 text-[11px]">{SOURCE_LABEL[q.source] ?? q.source}</span>
                          <span><span className="text-muted-foreground">{q.theme} · </span>{q.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </Block>

              {(r.ai.refused.length > 0 || r.ai.formRejected.length > 0) && (
                <Block title={`Propositions écartées (${r.ai.formRejected.length + r.ai.refused.length} sur ${r.ai.drafted})`}>
                  <ul className="space-y-1">
                    {r.ai.formRejected.map((t) => (
                      <li key={`f-${t}`}><span className="text-muted-foreground">Contrôle du code · </span>{t}</li>
                    ))}
                    {r.ai.refused.map((x) => (
                      <li key={`r-${x.text}`}>
                        <span className="text-muted-foreground">Relecteur, règle {x.rule ?? "?"}{x.reason ? ` (${x.reason})` : ""} · </span>
                        {x.text}
                      </li>
                    ))}
                  </ul>
                </Block>
              )}

              <Block title="Lecture du jour 1 (réponses types)">
                {r.reading ? (
                  <div className="space-y-1">
                    <p className="font-medium">{r.reading.headline}</p>
                    {r.reading.together.map((t) => <p key={t}>✓ {t}</p>)}
                    {r.reading.toDiscuss.map((p) => <p key={p.text}>→ {p.theme} : {p.text}</p>)}
                    {r.reading.openers.map((o) => <p key={o} className="italic">« {o} »</p>)}
                    {r.reading.advice && <p className="text-muted-foreground">{r.reading.advice}</p>}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{r.readingStatus}</p>
                )}
                {r.followUp && <p className="mt-2">Question d’approfondissement (jour 2) : « {r.followUp} »</p>}
              </Block>
            </details>
          ))}
        </section>
      )}
    </>
  );
}

function Metric({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${alert ? "border-red-300 bg-red-50" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 text-sm">
      <h3 className="mb-1 font-semibold">{title}</h3>
      {children}
    </div>
  );
}
