/**
 * Modération messages BOLIGO — règles locales (rapides, sans API).
 * Complétée par Groq pour contenus sexuels / harcèlement / menaces.
 */

export type LocalModerationResult =
  | { allowed: true }
  | { allowed: false; reason: string; category: 'profanity' | 'pattern' };

function normalizeForScan(raw: string): string {
  let s = raw.toLowerCase();
  s = s.normalize('NFD').replace(/\p{M}/gu, '');
  s = s.replace(/[@4]/g, 'a').replace(/[13!|]/g, 'i').replace(/0/g, 'o').replace(/[$5]/g, 's').replace(/7/g, 't');
  s = s.replace(/(.)\1{2,}/g, '$1$1');
  s = s.replace(/[^a-zàâäéèêëïîôùûüçœæ0-9\s]/gi, ' ');
  return s;
}

const BANNED_SOURCES = [
  String.raw`merde|merd`,
  String.raw`putain|putes?`,
  String.raw`salopes?|connards?|connasses?`,
  String.raw`encul[eé]s?|ntm|nique[rz]?`,
  String.raw`fdp|fils\s*de\s*pute`,
  String.raw`ta\s*gueule|\btg\b|ferme\s*la`,
  String.raw`bites?|couilles?|couillons?`,
  String.raw`chier|chiasse|pétasse|pouffiasse`,
  String.raw`branle\w*|foutre|dégage|crève`,
  String.raw`salauds?|batards?`,
  String.raw`tafiole`,
  String.raw`porn\w*|sexe\s*cam|nudes?|nude|onlyfans`,
  String.raw`baise[rz]?|plan\s*cul|cul\s*rapide`,
  String.raw`pédé|pédale|tapette`,
];

function bannedRegexes(): RegExp[] {
  return BANNED_SOURCES.map((src) => new RegExp(`\\b(?:${src})\\b`, 'gi'));
}

/** Liens suspects hors phase contacts (anti-spam / arnaque). */
const SUSPICIOUS_LINK = /https?:\/\/|www\.|\.(com|net|org|xyz|tk)\b/i;

export function moderateMessageLocally(text: string): LocalModerationResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { allowed: false, reason: 'Message vide.', category: 'pattern' };
  }
  if (trimmed.length > 2000) {
    return {
      allowed: false,
      reason: 'Message trop long (2000 caractères max).',
      category: 'pattern',
    };
  }

  const normalized = normalizeForScan(trimmed);
  for (const re of bannedRegexes()) {
    if (re.test(normalized) || re.test(trimmed)) {
      return {
        allowed: false,
        reason:
          'Formulation incompatible avec le respect du dialogue BOLIGO (insultes, vulgarité ou contenu explicite).',
        category: 'profanity',
      };
    }
  }

  return { allowed: true };
}

export function maskProfanityForDisplay(text: string): string {
  if (!text) return text;
  let out = text;
  for (const re of bannedRegexes()) {
    out = out.replace(re, (m) => '*'.repeat(Math.max(4, m.length)));
  }
  return out;
}

export function containsSuspiciousLink(text: string): boolean {
  return SUSPICIOUS_LINK.test(text);
}
