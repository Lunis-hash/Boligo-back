"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, Shield } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { setSession, type AdminUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/brand-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch<{
        access_token: string;
        user: AdminUser;
      }>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(res.access_token, res.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen">
      {/* Panneau gauche — identité douce */}
      <section className="relative hidden w-[52%] overflow-hidden lg:flex lg:flex-col lg:justify-between">
        <div
          className="absolute inset-0 bg-gradient-to-br from-rose via-fond to-lilas"
          aria-hidden
        />
        <div
          className="login-blob absolute -left-24 top-20 h-72 w-72 rounded-full bg-framboise/15 blur-3xl"
          aria-hidden
        />
        <div
          className="login-blob-delayed absolute bottom-10 right-10 h-96 w-96 rounded-full bg-lavande/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute left-1/3 top-1/2 h-48 w-48 rounded-full bg-ciel/60 blur-2xl"
          aria-hidden
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          <div>
            <BrandLogo size={30} />
            <p className="mt-1 text-xs font-medium text-neutral-500">Tableau de bord de l’équipe</p>
          </div>

          <div className="max-w-md space-y-8">
            <div>
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-framboise">
                Espace équipe
              </p>
              <h1 className="text-4xl leading-tight text-encre xl:text-[2.75rem]">
                Prendre soin des
                <span className="block italic text-framboise">parcours qui comptent</span>
              </h1>
            </div>
            <p className="text-base leading-relaxed text-neutral-600">
              Modération, accompagnement et vision d&apos;ensemble — dans le même esprit
              d&apos;écoute que l&apos;application mobile.
            </p>

            <ul className="space-y-4">
              {[
                { icon: Sparkles, text: "Tableau de bord en temps réel" },
                { icon: Shield, text: "Gestion des membres et des parcours" },
                { icon: Heart, text: "Programme partenaires et accès par rôle" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-neutral-700">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60 text-framboise shadow-sm ring-1 ring-white/70">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-neutral-500">Accès réservé à l’équipe BOLIGO (administration, modération, marketing)</p>
        </div>
      </section>

      {/* Panneau droit — connexion */}
      <section className="flex flex-1 flex-col justify-center bg-fond px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-10 lg:hidden">
            <BrandLogo size={28} />
            <p className="mt-1 text-sm text-neutral-500">Tableau de bord de l’équipe</p>
          </div>

          <div className="mb-8">
            <h2 className="font-title text-3xl text-encre">Bon retour</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              Connectez-vous pour accéder au tableau de bord.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-normal text-neutral-700">
                Adresse e-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@boligo.fr"
                required
                className="h-12 rounded-xl border-neutral-200 bg-white/80 px-4 shadow-sm transition-all placeholder:text-neutral-400 focus-visible:border-lavande focus-visible:ring-lavande/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-normal text-neutral-700">
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl border-neutral-200 bg-white/80 px-4 shadow-sm transition-all placeholder:text-neutral-400 focus-visible:border-lavande focus-visible:ring-lavande/30"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-framboise/30 bg-rose px-4 py-3 text-sm text-framboise"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-framboise to-lavande text-base font-semibold shadow-md shadow-framboise/20 transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-60"
            >
              {loading ? "Connexion en cours…" : "Accéder au tableau de bord"}
            </Button>
          </form>

          <p className="mt-10 text-center text-xs text-neutral-400">
            BOLIGO · Données confidentielles
          </p>
        </div>
      </section>
    </main>
  );
}
