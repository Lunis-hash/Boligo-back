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
  s = s
    .replace(/[@4]/g, 'a')
    .replace(/[13!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/7/g, 't');
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

/**
 * Discours rapporté (« mon ex me traitait de… », « il me criait « dégage » ») :
 * une personne qui cite les mots qu'elle a subis ne les adresse à personne.
 */
const REPORTED_SPEECH =
  /\b(?:trait\w*|appel\w*|insult\w*|cri\w*|hurl\w*|disai\w*|disait|dit|lan[cç]\w*)\b[^.!?]{0,40}(?:\bde\b|«|"|:)|«[^»]{1,60}»|\b(?:il|elle|on|mon ex|mon (?:mari|copain|ex-mari)|ma (?:femme|copine|ex-femme))\s+(?:me|m['’])\s*(?:trait|appel|insult|cri|hurl|disai|dis|répét|repet|lan[cç])\w*/i;

/**
 * Coordonnées (téléphone, messagerie, réseau, e-mail) : jamais dans le
 * Sondeur, elles s'échangent à l'étape prévue du parcours.
 */
const CONTACT_DETAILS =
  /(?:\+|\b00)\d{2,3}[\s.-]?\d[\d\s.-]{6,}\d|\b0\d(?:[\s.-]?\d{2}){4}\b|\b(?:whats?app|wa\.me|telegram|t\.me|snap(?:chat)?|insta(?:gram)?|facebook|messenger)\b|\S+@\S+\.\w{2,}/i;

export function containsContactDetails(text: string): boolean {
  return CONTACT_DETAILS.test(text);
}

/**
 * Modération locale d'une réponse au Sondeur : comme un message, sauf qu'un
 * mot grossier cité dans un récit (discours rapporté) n'est pas refusé. Il
 * est masqué à l'affichage chez l'autre membre.
 */
export function moderateAnswerLocally(text: string): LocalModerationResult {
  const result = moderateMessageLocally(text);
  if (
    !result.allowed &&
    result.category === 'profanity' &&
    REPORTED_SPEECH.test(normalizeQuotes(text))
  ) {
    return { allowed: true };
  }
  return result;
}

function normalizeQuotes(text: string): string {
  return text.replace(/[“”]/g, '"');
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
