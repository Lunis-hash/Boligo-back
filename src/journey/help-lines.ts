/**
 * Numéros d'aide par pays, pour les messages privés envoyés à un membre
 * dont la réponse évoque une détresse ou des violences. Seuls les numéros
 * jugés fiables (confiance élevée ou moyenne, vérifiés le 7 octobre 2026)
 * figurent ici ; null : aucune ligne fiable, le message renvoie alors vers
 * une association du pays et vers les secours. Sources et revue tous les
 * six mois : docs/NUMEROS_AIDE.md.
 */
export interface HelpLines {
  /** Nom du pays, tel que l'affiche l'application. */
  name: string;
  emergency: string;
  /** Ligne d'écoute (détresse, prévention du suicide). */
  distress: string | null;
  /** Ligne d'aide aux victimes de violences. */
  violence: string | null;
  /** Consigne quand la ligne d'écoute a des horaires limités. */
  distressNote?: string;
  /** Consigne propre à la ligne d'aide aux victimes. */
  violenceNote?: string;
}

/** Union européenne et Norvège : le 112 répond partout, gratuitement. */
const EUROPEAN_112 = "112 (numéro d'urgence européen, gratuit)";
const europe = (name: string): HelpLines => ({
  name,
  emergency: EUROPEAN_112,
  distress: null,
  violence: null,
});

const FRENCH_DISTRESS = '3114 (prévention du suicide, gratuit, 24 h/24)';
const FRENCH_VIOLENCE =
  '3919 (Violences Femmes Info, gratuit, anonyme, 24 h/24)';
const overseas = (name: string, emergency: string): HelpLines => ({
  name,
  emergency,
  distress: FRENCH_DISTRESS,
  violence: FRENCH_VIOLENCE,
});
const OVERSEAS_EMERGENCY =
  '112 · 15 (SAMU) · 17 (police) · 18 (pompiers) · 114 (SMS, personnes sourdes)';

export const HELP_LINES: Record<string, HelpLines> = {
  FR: {
    name: 'France',
    emergency:
      '112 · 15 (SAMU) · 17 (police) · 18 (pompiers) · 114 (SMS ou visio, personnes sourdes ou malentendantes)',
    distress: FRENCH_DISTRESS,
    violence: FRENCH_VIOLENCE,
  },
  GP: overseas('Guadeloupe', OVERSEAS_EMERGENCY),
  MQ: overseas('Martinique', OVERSEAS_EMERGENCY),
  GF: overseas('Guyane', OVERSEAS_EMERGENCY),
  RE: overseas('La Réunion', OVERSEAS_EMERGENCY),
  YT: overseas('Mayotte', '112 · 15 (SAMU) · 17 (police) · 18 (pompiers)'),
  BE: {
    name: 'Belgique',
    emergency: '112 (pompiers, ambulance, police) · 101 (police)',
    distress:
      '0800 32 123 (Centre de prévention du suicide, en français, gratuit, 24 h/24) · 1813 (en néerlandais, gratuit, 24 h/24)',
    violence:
      '0800 30 030 (Écoute violences conjugales, en français, gratuit, anonyme, 24 h/24) · 1712 (en néerlandais, gratuit, jours ouvrables)',
  },
  CH: {
    name: 'Suisse',
    emergency: '112 · 117 (police) · 144 (ambulance) · 118 (pompiers)',
    distress:
      '143 (La Main Tendue, anonyme, 24 h/24 ; 0,70 CHF au plus par appel)',
    violence:
      "142 (ligne nationale d'aide aux victimes de violence, gratuite, confidentielle, 24 h/24)",
    violenceNote:
      "Le 142 n'est pas un numéro d'urgence : en danger immédiat, appelez le 117.",
  },
  LU: {
    name: 'Luxembourg',
    emergency: '112 (secours, ambulance, pompiers) · 113 (police)',
    distress:
      "45 45 45 (SOS Détresse, anonyme ; tous les jours de 11 h à 23 h, jusqu'à 3 h les vendredis et samedis)",
    violence: '2060 1060 (violence domestique, anonyme, 24 h/24)',
    distressNote:
      "SOS Détresse n'est pas joignable la nuit : en dehors de ses horaires, appelez le 112.",
  },
  MC: {
    name: 'Monaco',
    emergency: '112 · 17 (police) · 18 (pompiers)',
    distress: null,
    violence: null,
  },
  GB: {
    name: 'Royaume-Uni',
    emergency:
      '999 ou 112 (si vous ne pouvez pas parler depuis un mobile : composez le 999 puis le 55)',
    distress: '116 123 (Samaritans, gratuit, 24 h/24)',
    violence:
      'Angleterre : 0808 2000 247 (gratuit, 24 h/24) · Écosse : 0800 027 1234 (24 h/24) · pays de Galles : 0808 80 10 800 · Irlande du Nord : 0808 802 1414 (24 h/24)',
  },
  DE: europe('Allemagne'),
  ES: europe('Espagne'),
  IT: europe('Italie'),
  PT: europe('Portugal'),
  NL: europe('Pays-Bas'),
  SE: europe('Suède'),
  NO: europe('Norvège'),
  DK: europe('Danemark'),
  IE: europe('Irlande'),
  AT: europe('Autriche'),
  PL: europe('Pologne'),
  RO: europe('Roumanie'),
  GR: europe('Grèce'),
  CA: {
    name: 'Canada',
    emergency: '911',
    distress:
      '988 (appel ou texto, gratuit, 24 h/24 ; au Québec : 1 866 APPELLE, soit 1 866 277-3553)',
    violence:
      'Québec : 1 800 363-9010 (SOS violence conjugale, gratuit, 24 h/24) ; ailleurs, la ligne de votre province, sur sheltersafe.ca',
  },
  US: {
    name: 'États-Unis',
    emergency: '911',
    distress:
      '988 (Suicide & Crisis Lifeline, appel ou texto, gratuit, 24 h/24)',
    violence:
      '1 800 799-7233 (National Domestic Violence Hotline, 24 h/24) · texto START au 88788',
  },
  HT: {
    name: 'Haïti',
    emergency: '114 (police) · 115 (pompiers) · 116 (ambulance)',
    distress: null,
    violence: "8919 (ligne d'alerte pour les victimes de violences)",
  },
  CI: {
    name: "Côte d'Ivoire",
    emergency: '170, 110 ou 111 (police) · 180 (pompiers) · 185 (SAMU)',
    distress:
      '143 (aide psychologique et prévention du suicide, ministère de la Santé, gratuit, 24 h/24)',
    violence:
      '1308 (ligne verte contre les violences faites aux femmes, gratuite, confidentielle)',
  },
  SN: {
    name: 'Sénégal',
    emergency: '17 (police) · 18 (pompiers) · 1515 (SAMU)',
    distress: null,
    violence:
      '800 805 805 (numéro vert de l’Association des juristes sénégalaises, gratuit, de 8 h à 17 h)',
    violenceNote: 'En dehors des horaires du numéro vert, appelez le 17.',
  },
  CM: {
    name: 'Cameroun',
    emergency: '117 (police) · 118 (pompiers)',
    distress: null,
    violence: null,
  },
  CD: {
    name: 'Congo RDC',
    emergency: '112 (police, Kinshasa) · 118 (pompiers, Kinshasa)',
    distress: null,
    violence:
      '122 (ligne verte du ministère du Genre contre les violences faites aux femmes, gratuite, 24 h/24)',
  },
  CG: {
    name: 'Congo',
    emergency: '117 (police) · 118 (pompiers et urgences médicales)',
    distress: null,
    violence: null,
  },
  GA: {
    name: 'Gabon',
    emergency: '177 (police) · 18 (pompiers, Libreville) · 1300 (SAMU)',
    distress: null,
    violence:
      '1404 (numéro vert pour les femmes victimes de violences, gratuit, anonyme, 24 h/24)',
  },
  BJ: {
    name: 'Bénin',
    emergency: '117 (police) · 118 (pompiers et ambulance)',
    distress: null,
    violence: null,
  },
  TG: {
    name: 'Togo',
    emergency: '117 (police, gratuit, 24 h/24) · 118 (pompiers)',
    distress: null,
    violence:
      '1014 (numéro vert pour signaler des violences à la police, gratuit, 24 h/24)',
  },
  ML: {
    name: 'Mali',
    emergency: '17 (police) · 15 (SAMU) · 18 (pompiers)',
    distress: null,
    violence:
      '80333 (ligne verte contre les violences faites aux femmes, Police nationale, gratuite, 24 h/24)',
  },
  BF: {
    name: 'Burkina Faso',
    emergency:
      '17 (police) · 18 (pompiers et ambulance) ; hors de Ouagadougou : 112',
    distress: null,
    violence:
      '80 00 12 87 (numéro vert contre les violences faites aux femmes, gratuit, anonyme, 24 h/24)',
  },
  NE: {
    name: 'Niger',
    emergency: '17 (police) · 15 (ambulance) · 18 (pompiers)',
    distress: null,
    violence: null,
  },
  GN: {
    name: 'Guinée',
    emergency: '122 (police et gendarmerie)',
    distress: null,
    violence: null,
  },
  MG: {
    name: 'Madagascar',
    emergency:
      '117 (police ; 17 depuis un fixe) · 118 (pompiers ; 18 depuis un fixe)',
    distress: null,
    violence: null,
  },
  MA: {
    name: 'Maroc',
    emergency:
      '190 (police ; 19 depuis un fixe) · 150 (ambulance et pompiers ; 15 depuis un fixe) · 177 (gendarmerie, zones rurales)',
    distress: null,
    violence:
      "8350 (plateforme d'écoute Kolonamaak, 24 h/24, en arabe et en français)",
  },
  DZ: {
    name: 'Algérie',
    emergency:
      '17 ou 1548 (police) · 1055 (gendarmerie) · 14 ou 1021 (protection civile, ambulance)',
    distress: null,
    violence:
      '1026 (numéro vert pour les femmes victimes de violences, gratuit, 24 h/24)',
  },
  TN: {
    name: 'Tunisie',
    emergency:
      '197 (police) · 190 (SAMU) · 198 (protection civile) · 193 (garde nationale, zones rurales)',
    distress:
      '80 10 50 50 (consultations psychologiques gratuites du ministère de la Santé, en journée)',
    violence:
      '1899 (ligne verte pour les femmes victimes de violences, gratuite, 24 h/24)',
    distressNote:
      "Le 80 10 50 50 ne répond qu'en journée : en dehors de ses horaires, appelez le 190.",
  },
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[’]/g, "'")
    .toLowerCase()
    .trim();

/** Nom de pays (sans accents ni casse) vers son code, d'après HELP_LINES. */
const CODE_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(HELP_LINES).map(([code, lines]) => [norm(lines.name), code]),
);

/**
 * Numéros d'aide pour un lieu « Ville, Pays » (champ city du membre) ; null
 * si le pays n'est pas reconnu ou pas encore couvert.
 */
export function helpLinesFor(
  city: string | null | undefined,
): HelpLines | null {
  const parts = (city ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const code = CODE_BY_NAME[norm(parts[parts.length - 1])];
  return code ? HELP_LINES[code] : null;
}
