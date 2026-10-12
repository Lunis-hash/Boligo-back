/**
 * Genre, tranche d'âge et distance entre les deux membres, pour que l'IA ne suppose pas un fait
 * de leur vie qu'elle ignore (sans contact, sans photo, sans identifiant).
 */
export function describeCoupleContext(
  members: Array<{
    firstName: string;
    birthDate: Date | null;
    gender: string | null;
    city: string | null;
  }>,
  now = new Date(),
): string {
  const genders: Record<string, string> = { H: 'homme', F: 'femme' };
  // Minimisation : une tranche d'âge plutôt que l'âge exact, et la distance
  // entre les deux (même ville, même pays, pays différents) plutôt que la ville.
  const lines = members
    .map((m) => {
      const parts: string[] = [];
      if (m.gender && genders[m.gender]) parts.push(genders[m.gender]);
      if (m.birthDate) {
        const b = new Date(m.birthDate);
        let age = now.getFullYear() - b.getFullYear();
        if (
          now.getMonth() < b.getMonth() ||
          (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
        )
          age--;
        if (age >= 18 && age < 120) parts.push(ageBracket(age));
      }
      const name = m.firstName
        .replace(/[\n\r«»‹›"]/g, ' ')
        .trim()
        .slice(0, 40);
      return parts.length ? `- ${name} : ${parts.join(', ')}` : '';
    })
    .filter(Boolean);
  const distance = relativeDistance(members.map((m) => m.city));
  if (distance) lines.push(`- Lieux de vie : ${distance}`);
  return lines.join('\n');
}

/** Tranche d'âge de cinq ans (« 30-34 ans ») : assez pour le ton, jamais l'âge exact. */
function ageBracket(age: number): string {
  if (age < 20) return '18-19 ans';
  const low = Math.floor(age / 5) * 5;
  return `${low}-${low + 4} ans`;
}

/** Même ville, même pays ou pays différents, sans nommer de lieu. */
function relativeDistance(cities: Array<string | null>): string | null {
  const parts = cities.map((c) =>
    (c ?? '')
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean),
  );
  if (parts.length !== 2 || !parts[0].length || !parts[1].length) return null;
  const [a, b] = parts;
  if (a[0] === b[0] && a[a.length - 1] === b[b.length - 1]) return 'même ville';
  if (a.length > 1 && b.length > 1 && a[a.length - 1] === b[b.length - 1])
    return 'même pays, villes différentes';
  if (a.length > 1 && b.length > 1) return 'pays différents';
  return 'villes différentes';
}
