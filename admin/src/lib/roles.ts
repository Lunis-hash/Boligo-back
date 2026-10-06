/** Rôles d'équipe et pages accessibles (mêmes règles que l'API BOLIGO). */
export type StaffRole = "ADMIN" | "MODERATOR" | "MARKETING";

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  MODERATOR: "Modération",
  MARKETING: "Marketing et partenariats",
  USER: "Membre (sans accès)",
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  ADMIN: "Tout le tableau de bord, finances et gestion de l'équipe.",
  MODERATOR: "Membres, parcours, signalements et messages bloqués. Pas de finances ni de partenaires.",
  MARKETING: "Programme partenaires et codes promo. Aucun accès aux données des membres.",
};

export type Section =
  | "overview"
  | "finance"
  | "users"
  | "matches"
  | "journeys"
  | "reports"
  | "moderation"
  | "partners"
  | "promo"
  | "team";

const ACCESS: Record<StaffRole, Section[]> = {
  ADMIN: ["overview", "finance", "users", "matches", "journeys", "reports", "moderation", "partners", "promo", "team"],
  MODERATOR: ["overview", "users", "matches", "journeys", "reports", "moderation"],
  MARKETING: ["overview", "partners", "promo"],
};

export function canSee(role: string | undefined, section: Section): boolean {
  return Boolean(role && (ACCESS[role as StaffRole] ?? []).includes(section));
}

/** Section d'une adresse du tableau de bord. */
export function sectionOf(pathname: string): Section {
  const part = pathname.replace(/^\/dashboard\/?/, "").split("/")[0];
  return (part || "overview") as Section;
}
