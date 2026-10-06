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
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearSession, getAdminUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/dashboard/finance", label: "Finances", icon: Wallet },
  { href: "/dashboard/users", label: "Utilisateurs", icon: Users },
  { href: "/dashboard/matches", label: "Matchs & likes", icon: GitMerge },
  { href: "/dashboard/journeys", label: "Parcours", icon: Route },
  { href: "/dashboard/reports", label: "Signalements", icon: Flag },
  { href: "/dashboard/moderation", label: "Modération", icon: MessageSquareOff },
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
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 shadow-sm">
            <Activity className="h-4 w-4 text-white" />
          </span>
          <div>
            <p className="text-sm font-semibold tracking-tight text-neutral-900">BOLIGO</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
              Admin
            </p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
          Navigation
        </p>
        {nav.map((item) => {
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
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900",
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
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-600">
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
