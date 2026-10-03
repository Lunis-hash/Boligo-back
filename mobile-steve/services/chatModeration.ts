/**
 * Modération locale des messages (avant envoi et à l'affichage).
 *
 * La correspondance se fait sur des MOTS ENTIERS, après normalisation
 * (minuscules + suppression des accents) : « con » est bloqué, mais
 * « conseil », « second », « consensus » ou « contrat » passent.
 * Le backend applique sa propre modération, plus complète.
 */

/** Formes interdites, déjà normalisées (minuscules, sans accents). */
const PROFANITY_LIST = [
  'con',
  'cons',
  'conne',
  'connes',
  'connard',
  'connards',
  'connarde',
  'connardes',
  'connasse',
  'connasses',
  'merde',
  'merdes',
  'putain',
  'putains',
  'pute',
  'putes',
  'salope',
  'salopes',
  'salopard',
  'salopards',
  'encule',
  'encules',
  'enculee',
  'enculees',
  'batard',
  'batards',
  'batarde',
  'batardes',
  'chienne',
  'chiennes',
];

const PROFANITY_SET = new Set(PROFANITY_LIST);

/** Une suite de lettres (avec leurs éventuels accents combinants) = un mot. */
const WORD_REGEX = /\p{L}[\p{L}\p{M}]*/gu;

const BLOCKED_REASON = 'Votre message contient des termes inappropriés non autorisés.';

/** Minuscules + suppression des accents (« Bâtard » → « batard »). */
function normalizeWord(word: string): string {
  // normalize() peut manquer sur certains moteurs JS mobiles : repli sans accents retirés.
  const decomposed = typeof word.normalize === 'function' ? word.normalize('NFD') : word;
  return decomposed.replace(/\p{M}/gu, '').toLowerCase();
}

function isProfane(word: string): boolean {
  return PROFANITY_SET.has(normalizeWord(word));
}

export function moderateOutgoingMessage(text: string): { success: true } | { reason: string } {
  const words = (text ?? '').match(WORD_REGEX) ?? [];
  if (words.some(isProfane)) {
    return { reason: BLOCKED_REASON };
  }
  return { success: true };
}

export function maskProfanityForDisplay(text: string): string {
  if (!text) return '';
  return text.replace(WORD_REGEX, (word) => (isProfane(word) ? '***' : word));
}
