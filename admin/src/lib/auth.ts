const TOKEN_KEY = "boligo_admin_token";
const USER_KEY = "boligo_admin_user";

export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AdminUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Jeton expiré (champ « exp » du JWT, en secondes) ou illisible. L'API reste
 * seule juge : ce contrôle évite seulement d'afficher des pages vides.
 */
export function tokenExpired(token: string, now = Date.now()): boolean {
  try {
    const payload = token.split(".")[1] ?? "";
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return typeof json.exp === "number" && json.exp * 1000 <= now;
  } catch {
    return true;
  }
}

/** Page de connexion, avec le motif « session expirée ». */
export function loginUrlAfterExpiry(): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/login/?expiree=1`;
}
