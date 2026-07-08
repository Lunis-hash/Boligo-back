/**
 * Politique d'appel Groq pour la modération : réduire les coûts sans affaiblir la sécurité.
 */

const RISKY_HINT =
  /\b(sexe|sexy|nude|nudes|plan\s*cul|baise|porn|onlyfans|escort|sugar|daddy|maman\s*paye|send\s*pic|photo\s*hot|chaud(e)?\s*ce\s*soir)\b/i;

/** Groq uniquement si le message mérite une analyse sémantique. */
export function shouldRunAiModeration(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;

  if (RISKY_HINT.test(t)) return true;
  if (/https?:\/\/|www\./i.test(t)) return true;
  if (t.length > 120) return true;

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length >= 18) return true;

  return false;
}
