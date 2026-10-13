/**
 * Garde-fou des scripts de recette : refuse toute base qui n'est pas un
 * PostgreSQL LOCAL. Supabase (production BOLIGO) et toute adresse distante
 * sont refusés, sans exception ni option pour passer outre.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function localDatabaseProblem(url: string | undefined): string | null {
  if (!url) return 'DATABASE_URL est vide.';
  if (/supabase|pooler\.|\.co\b|render\.com|neon\.tech|amazonaws/i.test(url))
    return 'DATABASE_URL pointe vers un hébergeur distant (Supabase ou autre).';
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return 'DATABASE_URL illisible.';
  }
  if (!/^postgres(ql)?:$/.test(parsed.protocol))
    return 'DATABASE_URL doit être une adresse PostgreSQL.';
  if (!LOCAL_HOSTS.has(parsed.hostname))
    return `Hôte « ${parsed.hostname} » non local : seuls localhost et 127.0.0.1 sont acceptés.`;
  return null;
}

export function assertLocalDatabase(url: string | undefined): void {
  const problem = localDatabaseProblem(url);
  if (problem) {
    throw new Error(
      `Refusé : ${problem} Les données de recette ne vont que dans une base locale.`,
    );
  }
}
