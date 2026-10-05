/**
 * Périmètre de rencontre choisi à l'inscription (étape 3) et modifiable depuis
 * le profil. Il est enregistré comme réponse à M0_Q02, seule source lue par
 * les filtres de la Découverte ; la question n'est jamais reposée pendant
 * l'entretien.
 */
export const MEETING_SCOPES = ['local', 'national', 'international'] as const;
export type MeetingScope = (typeof MEETING_SCOPES)[number];

const ANSWER_BY_SCOPE: Record<MeetingScope, string> = {
  local: 'A',
  national: 'C',
  international: 'D',
};

/** Réponse M0_Q02 correspondant au périmètre (local par défaut). */
export function meetingScopeAnswer(scope: string | null | undefined): string {
  return ANSWER_BY_SCOPE[scope as MeetingScope] ?? 'A';
}

/** Périmètre affiché pour une réponse M0_Q02 (« même région » compte comme local). */
export function meetingScopeOf(
  answer: string | null | undefined,
): MeetingScope | null {
  if (answer === 'A' || answer === 'B') return 'local';
  if (answer === 'C') return 'national';
  if (answer === 'D') return 'international';
  return null;
}

/**
 * Lieu « Ville, Pays » : une ville saisie sans pays garde celui déjà
 * enregistré, sans quoi le filtre national ne retrouverait plus le membre.
 */
export function keepCountry(
  next: string,
  previous: string | null | undefined,
): string {
  const value = next.trim();
  if (value.includes(',')) return value;
  const parts = (previous ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length >= 2 ? `${value}, ${parts[parts.length - 1]}` : value;
}
