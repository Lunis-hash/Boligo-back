"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GitMerge,
  Route,
  Flag,
  MessageSquareOff,
  LogOut,
  Wallet,
  Handshake,
  Ticket,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearSession, getAdminUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { canSee, ROLE_LABELS, type Section } from "@/lib/roles";

const nav: { href: string; label: string; icon: typeof Users; section: Section }[] = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, section: "overview" },
  { href: "/dashboard/finance", label: "Finances", icon: Wallet, section: "finance" },
  { href: "/dashboard/users", label: "Utilisateurs", icon: Users, section: "users" },
  { href: "/dashboard/matches", label: "Matchs & likes", icon: GitMerge, section: "matches" },
  { href: "/dashboard/journeys", label: "Parcours", icon: Route, section: "journeys" },
  { href: "/dashboard/reports", label: "Signalements", icon: Flag, section: "reports" },
  { href: "/dashboard/moderation", label: "Modération", icon: MessageSquareOff, section: "moderation" },
  { href: "/dashboard/partners", label: "Partenaires", icon: Handshake, section: "partners" },
  { href: "/dashboard/promo", label: "Codes promo", icon: Ticket, section: "promo" },
  { href: "/dashboard/team", label: "Équipe", icon: ShieldCheck, section: "team" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getAdminUser();

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[250px] shrink-0 flex-col border-r border-neutral-200/80 bg-white">
      {/* Logo */}
      <header className="border-b border-neutral-100 px-5 py-5">
        <BrandLogo size={24} />
        <p className="mt-1 pl-0.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Tableau de bord · {ROLE_LABELS[user?.role ?? ""] ?? "Équipe"}
        </p>
      </header>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Navigation
        </p>
        {nav.filter((item) => canSee(user?.role, item.section)).map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-framboise to-lavande text-white shadow-sm"
                  : "text-neutral-500 hover:bg-rose/60 hover:text-encre",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <footer className="border-t border-neutral-100 p-4">
        {user && (
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lilas text-xs font-semibold text-nuit">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-neutral-800">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-[10px] text-neutral-400">{user.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-lg border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
          onClick={logout}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Déconnexion
        </Button>
      </footer>
    </aside>
  );
}
