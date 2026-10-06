"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Sparkles, Shield } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { setSession, type AdminUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
          className="absolute inset-0 bg-gradient-to-br from-[#fdf6f4] via-[#f8ebe8] to-[#f3e4e8]"
          aria-hidden
        />
        <div
          className="login-blob absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#e8b4bc]/25 blur-3xl"
          aria-hidden
        />
        <div
          className="login-blob-delayed absolute bottom-10 right-10 h-96 w-96 rounded-full bg-[#d4a5a5]/20 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute left-1/3 top-1/2 h-48 w-48 rounded-full bg-[#f5d0c8]/30 blur-2xl"
          aria-hidden
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 shadow-sm backdrop-blur-sm ring-1 ring-white/80">
              <Heart className="h-5 w-5 fill-[#b84d63] text-[#b84d63]" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-[#3d2c2e]">BOLIGO</p>
              <p className="text-xs font-medium text-[#8a6b6f]">Back-office</p>
            </div>
          </div>

          <div className="max-w-md space-y-8">
            <div>
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-[#b84d63]/80">
                Espace équipe
              </p>
              <h1 className="text-4xl font-light leading-tight text-[#2d2224] xl:text-[2.75rem]">
                Prendre soin des
                <span className="block font-medium text-[#b84d63]">parcours qui comptent</span>
              </h1>
            </div>
            <p className="text-base leading-relaxed text-[#6b5458]">
              Modération, accompagnement et vision d&apos;ensemble — dans le même esprit
              d&apos;écoute que l&apos;application mobile.
            </p>

            <ul className="space-y-4">
              {[
                { icon: Sparkles, text: "Tableau de bord en temps réel" },
                { icon: Shield, text: "Gestion des membres et des parcours" },
                { icon: Heart, text: "Aligné sur le Parcours Harmonie" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-[#5c484c]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/60 text-[#b84d63] shadow-sm ring-1 ring-white/70">
                    <Icon className="h-4 w-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-[#9a8084]">Accès réservé aux administrateurs BOLIGO</p>
        </div>
      </section>

      {/* Panneau droit — connexion */}
      <section className="flex flex-1 flex-col justify-center bg-[#fffcfb] px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-10 lg:hidden">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8ebe8]">
              <Heart className="h-6 w-6 fill-[#b84d63] text-[#b84d63]" />
            </div>
            <h1 className="text-2xl font-semibold text-[#2d2224]">BOLIGO Admin</h1>
            <p className="text-sm text-[#8a6b6f]">Back-office</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-[#2d2224]">Bon retour</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8a6b6f]">
              Connectez-vous pour accéder au tableau de bord.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-normal text-[#5c484c]">
                Adresse email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@boligo.app"
                required
                className="h-12 rounded-xl border-[#ead8d4] bg-white/80 px-4 shadow-sm transition-all placeholder:text-[#c4aba8] focus-visible:border-[#d4a5a5] focus-visible:ring-[#e8b4bc]/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-normal text-[#5c484c]">
                Mot de passe
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 rounded-xl border-[#ead8d4] bg-white/80 px-4 shadow-sm transition-all placeholder:text-[#c4aba8] focus-visible:border-[#d4a5a5] focus-visible:ring-[#e8b4bc]/40"
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-[#f0c4c8] bg-[#fdf0f2] px-4 py-3 text-sm text-[#9e4a5a]"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#b84d63] text-base font-medium shadow-md shadow-[#b84d63]/20 transition-all hover:bg-[#a34458] hover:shadow-lg hover:shadow-[#b84d63]/25 disabled:opacity-60"
            >
              {loading ? "Connexion en cours…" : "Accéder au tableau de bord"}
            </Button>
          </form>

          <p className="mt-10 text-center text-xs text-[#b0a0a3]">
            BOLIGO · Données confidentielles
          </p>
        </div>
      </section>
    </main>
  );
}
