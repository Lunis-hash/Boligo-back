"use client";

import { usePathname } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { canSee, sectionOf } from "@/lib/roles";

/** Affiche la page seulement si le rôle de la personne connectée y donne accès. */
export function RoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = getAdminUser();
  if (canSee(user?.role, sectionOf(pathname))) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center">
      <p className="font-title text-xl text-encre">Accès non autorisé</p>
      <p className="mt-2 text-sm text-neutral-500">
        Votre rôle ne donne pas accès à cette page. Demandez à un administrateur, depuis la page Équipe.
      </p>
    </div>
  );
}
