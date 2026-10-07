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
  String.raw`ta\s*gueule|\btg\b|ferme\s*la(?!\s+(?:porte|fenetre|boutique|lumiere|radio|tele|voiture|maison|marche))`,
  String.raw`bites?|couilles?|couillons?`,
  String.raw`chier|chiasse|pétasse|pouffiasse`,
  String.raw`branle\w*|foutre|(?<!(?:se|s|ca|qui)\s)d[ée]gage(?![a-z])(?!\s+(?:de|d|une|un|la|le|les|du|des)\b)|cr[eè]ve(?!\s+d\W*envie|\s+de\s+(?:faim|chaud|froid|fatigue|rire))`,
  String.raw`salauds?|batards?`,
  String.raw`tafiole`,
  String.raw`porn\w*|sexe\s*cam|nudes?|nude|onlyfans`,
  String.raw`(?<!(?:un|le|ce|du|mon|ton|son|des|les|premier|petit|gros|doux)\s)baise[rz]?|plan\s*cul|cul\s*rapide`,
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

/** Vraies coordonnées : numéro, e-mail, lien direct, pseudonyme. */
const COORDINATES =
  /(?:\+|\b00)\d{2,3}[\s.-]?\d[\d\s.-]{6,}\d|\b0\d(?:[\s.-]?\d{2}){4}\b|\bwa\.me\b|\bt\.me\b|\S+@\S+\.\w{2,}|(?<![\w.])@[a-z0-9_.]{3,}/i;
/** Invitation à se retrouver sur un réseau (« ajoute-moi sur Snap », « mon insta : … »). */
const PLATFORM_INVITE =
  /(?:ajoute|add|[ée]cri[st]|contacte|retrouve|rejoins|suis[- ]moi|follow|dm|mp|inbox|appelle|cherche)\S*[^.!?]{0,20}\b(?:whats?app|snap(?:chat)?|insta(?:gram)?|telegram|facebook|fb|messenger|tiktok)\b|\b(?:mon|ma|my) (?:snap(?:chat)?|insta(?:gram)?|whats?app|telegram|tiktok|facebook|fb)\b\s*(?:[:=]|(?:c['’]est|is)\s*@?(?=[a-z0-9_.]*[_.\d])[a-z0-9_.]{3,})/i;

/**
 * Coordonnées dans une réponse au Sondeur : un numéro, un e-mail, un lien ou
 * une invitation à se retrouver ailleurs. Le simple nom d'une messagerie
 * (« il lisait mes messages WhatsApp ») n'en est pas une.
 */
export function containsSondeurContact(text: string): boolean {
  return COORDINATES.test(text) || PLATFORM_INVITE.test(text);
}

/**
 * Modération locale d'une réponse au Sondeur : comme un message, sauf qu'un
 * mot grossier cité dans un récit (discours rapporté) n'est pas refusé. Il
 * est masqué à l'affichage chez l'autre membre.
 */
export function moderateAnswerLocally(text: string): LocalModerationResult {
  const result = moderateMessageLocally(text);
  const quoted = normalizeQuotes(text);
  if (
    !result.allowed &&
    result.category === 'profanity' &&
    (REPORTED_SPEECH.test(quoted) ||
      (NAMED_INSULT.test(quoted) && LIMIT_WORDS.test(quoted)))
  ) {
    return { allowed: true };
  }
  return result;
}

/**
 * Une limite qui nomme l'insulte qu'elle refuse (« Dire 'ferme ta gueule'…
 * jamais », « les mots comme connard n'ont rien à faire dans un couple ») :
 * elle répond à la question de limite, elle n'insulte personne.
 */
const NAMED_INSULT =
  /\b(?:dire|traiter (?:l['’]autre )?de|des mots|les mots|mots comme|insultes? comme|qu['’]on me dise|entendre)\b|(?:^|\s)'[^']{2,40}'/i;
const LIMIT_WORDS =
  /\b(?:jamais|exclu|inacceptable|interdit|rien à faire|pas de place|non négociable|bannis?|hors de question)\b/i;

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
