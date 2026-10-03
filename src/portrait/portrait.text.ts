/**
 * Outils de typographie des fiches BOLIGO : accords de genre, nettoyage des
 * phrases (virgules orphelines, « undefined », espaces) et coupe au mot.
 */

export type Gender = 'H' | 'F' | null | undefined;

/**
 * Accorde un gabarit selon le genre.
 * - `{Il}` / `{il}` → Il / Elle, il / elle
 * - `{e}` → '' / 'e'
 * - `{masc|fem}` → forme masculine / féminine
 */
export function agree(template: string, gender: Gender): string {
  const f = gender === 'F';
  return template
    .replace(/\{Il\}/g, f ? 'Elle' : 'Il')
    .replace(/\{il\}/g, f ? 'elle' : 'il')
    .replace(/\{e\}/g, f ? 'e' : '')
    .replace(/\{([^{}|]*)\|([^{}|]*)\}/g, (_m, masc: string, fem: string) =>
      f ? fem : masc,
    );
}

/** Nettoie une phrase assemblée : aucune virgule orpheline, aucun « undefined ». */
export function cleanText(text: string): string {
  return text
    .replace(/\b(undefined|null|NaN)\b/g, '')
    .replace(/\s+([,.;:!?…])/g, (_m, p: string) =>
      p === ':' || p === ';' || p === '!' || p === '?' ? ` ${p}` : p,
    )
    .replace(/,(\s*,)+/g, ',')
    .replace(/,\s*([.;:!?])/g, '$1')
    .replace(/([:;])\s*([.,])/g, '$2')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/^[\s,;:]+/, '')
    .replace(/[\s,;:]+$/, '')
    .replace(/(\p{L})'(\p{L})/gu, '$1’$2')
    .trim();
}

/** Met une majuscule à la première lettre et un point final si besoin. */
export function sentence(text: string): string {
  const t = cleanText(text);
  if (!t) return '';
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?…»]$/.test(capped) ? capped : `${capped}.`;
}

/** Coupe un texte au dernier mot complet sous `max` caractères (avec « … »). */
export function truncateAtWord(text: string, max: number): string {
  const t = cleanText(text);
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const base = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(
    /[\s,;:.\-–—]+$/,
    '',
  );
  return `${base}…`;
}

/** « Pilote de ligne » → « pilote de ligne », mais « DRH » reste « DRH ». */
export function lowerFirstWord(text: string): string {
  if (/^\p{Lu}\p{Ll}/u.test(text)) {
    return text.charAt(0).toLowerCase() + text.slice(1);
  }
  return text;
}

/** « à Lyon », « au Havre », « aux Andelys ». */
export function atCity(city: string): string {
  if (/^Le\s/i.test(city)) return `au ${city.replace(/^Le\s+/i, '')}`;
  if (/^Les\s/i.test(city)) return `aux ${city.replace(/^Les\s+/i, '')}`;
  return `à ${city}`;
}

/** Première partie d'une ville affichée (« Écouis, Normandie, France » → « Écouis »). */
export function shortCity(city: string | null | undefined): string | null {
  if (!city) return null;
  const first = city.split(',')[0]?.trim();
  return first && first.length > 1 ? first : null;
}

const PLACEHOLDER_PROFESSIONS = [
  'profession non renseignée',
  'professionnel(le)',
  'non renseigné',
  'non renseignée',
];

/** Profession exploitable dans une phrase, ou null. */
export function usableProfession(
  profession: string | null | undefined,
): string | null {
  const p = profession?.trim();
  if (!p || p.length < 2) return null;
  if (PLACEHOLDER_PROFESSIONS.includes(p.toLowerCase())) return null;
  return p;
}

/** Joint une liste à la française : « a, b et c ». */
export function joinFr(items: string[]): string {
  const list = items.map((s) => s.trim()).filter(Boolean);
  if (list.length <= 1) return list[0] ?? '';
  return `${list.slice(0, -1).join(', ')} et ${list[list.length - 1]}`;
}
