/**
 * Premier objet JSON d'une réponse de modèle : accolades équilibrées hors des
 * chaînes, virgules finales tolérées. Une phrase avec des accolades avant ou
 * après le JSON ne fait plus perdre la réponse.
 */
export function firstJsonObject(raw: string): Record<string, unknown> | null {
  for (
    let start = raw.indexOf('{');
    start !== -1;
    start = raw.indexOf('{', start + 1)
  ) {
    const end = matchingBrace(raw, start);
    if (end === -1) continue;
    const parsed = parseLenient(raw.slice(start, end + 1));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      return parsed as Record<string, unknown>;
  }
  return null;
}

/** Tous les objets JSON de premier niveau d'une réponse (brouillon puis version finale). */
export function allJsonObjects(raw: string): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = [];
  let start = raw.indexOf('{');
  while (start !== -1) {
    const end = matchingBrace(raw, start);
    const parsed = end === -1 ? null : parseLenient(raw.slice(start, end + 1));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      found.push(parsed as Record<string, unknown>);
      start = raw.indexOf('{', end + 1);
    } else start = raw.indexOf('{', start + 1);
  }
  return found;
}

/** Premier tableau JSON d'une réponse de modèle (mêmes tolérances). */
export function firstJsonArray(raw: string): unknown[] | null {
  for (
    let start = raw.indexOf('[');
    start !== -1;
    start = raw.indexOf('[', start + 1)
  ) {
    const end = matchingBrace(raw, start);
    if (end === -1) continue;
    const parsed = parseLenient(raw.slice(start, end + 1));
    if (Array.isArray(parsed)) return parsed as unknown[];
  }
  return null;
}

/** Position de l'accolade (ou du crochet) fermante, hors des chaînes. */
function matchingBrace(text: string, start: number): number {
  const open = text[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === open) depth++;
    else if (c === close && --depth === 0) return i;
  }
  return -1;
}

function parseLenient(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    try {
      // Virgule finale avant une fermeture : tolérée.
      return JSON.parse(text.replace(/,\s*([}\]])/g, '$1'));
    } catch {
      return null;
    }
  }
}
