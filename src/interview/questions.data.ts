export interface QuestionOption {
  key: string;
  text: string;
  /** Option à préciser en toutes lettres (réponse enregistrée sous `<id>_AUTRE`). */
  freeText?: boolean;
}

export interface QuestionDependency {
  questionId: string;
  values: string[];
}

export interface QuestionRules {
  maxAge?: number;
  minAge?: number;
  gender?: 'H' | 'F';
  /** Une dépendance, ou une liste dont l'une au moins doit être remplie. */
  dependsOn?: QuestionDependency | QuestionDependency[];
}

/**
 * Échelle de réponse : 'accord' (5 points, de « pas du tout d'accord » à
 * « tout à fait d'accord ») ou 'frequence' (de « jamais » à « très souvent »).
 * Les questions sans échelle proposent des scénarios.
 */
export type QuestionScale = 'accord' | 'frequence';

export interface Question {
  id: string;
  moduleNumber: number;
  text: string;
  options: QuestionOption[];
  rules?: QuestionRules;
  /** Plusieurs réponses possibles, enregistrées « A,B,… » (ordre des options). */
  multiple?: boolean;
  /** Nombre maximal de réponses d'une question à choix multiple. */
  maxChoices?: number;
  scale?: QuestionScale;
  /** Réponses pré-cochées proposées au membre (langues de son pays), jamais enregistrées d'office. */
  suggested?: string[];
  /** Précision pré-remplie de l'option à préciser (« Allemand »). */
  suggestedOther?: string;
}

/** Suffixe de la précision écrite d'une option `freeText` (« M0_Q10_AUTRE »). */
export const FREE_TEXT_SUFFIX = '_AUTRE';
const FREE_TEXT_MAX = 60;

/**
 * Précision écrite valide : lettres (tous alphabets), espaces, tirets,
 * apostrophes et virgules (plusieurs langues), de 2 à 60 caractères.
 */
export function cleanFreeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length < 2 || text.length > FREE_TEXT_MAX) return null;
  return /^[\p{L}\p{M}][\p{L}\p{M} '’,-]*$/u.test(text) ? text : null;
}

/** Échelle d'accord en 5 points (A = 1 … E = 5). */
export const AGREEMENT_OPTIONS: QuestionOption[] = [
  { key: 'A', text: "Pas du tout d'accord" },
  { key: 'B', text: "Plutôt pas d'accord" },
  { key: 'C', text: "Ni d'accord ni pas d'accord" },
  { key: 'D', text: "Plutôt d'accord" },
  { key: 'E', text: "Tout à fait d'accord" },
];

/** Échelle de fréquence en 5 points (A = 1 … E = 5). */
export const FREQUENCY_OPTIONS: QuestionOption[] = [
  { key: 'A', text: 'Jamais' },
  { key: 'B', text: 'Rarement' },
  { key: 'C', text: 'Parfois' },
  { key: 'D', text: 'Souvent' },
  { key: 'E', text: 'Très souvent' },
];

/** Clés d'une réponse : « A » ou, pour une question à choix multiple, « A,B ». */
export function answerKeys(value: string | undefined | null): string[] {
  return (value ?? '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}

/** La réponse est-elle valide pour cette question (une option, ou plusieurs si `multiple`) ? */
export function isValidAnswer(q: Question, value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const keys = answerKeys(value);
  if (keys.length === 0) return false;
  if (!q.multiple && keys.length !== 1) return false;
  if (q.maxChoices && keys.length > q.maxChoices) return false;
  if (new Set(keys).size !== keys.length) return false;
  return keys.every((k) => q.options.some((o) => o.key === k));
}

/** Réponse rangée dans l'ordre des options (« B,A » → « A,B ») ; à appeler sur une réponse valide. */
export function normalizeAnswer(q: Question, value: string): string {
  if (!q.multiple) return value.trim();
  const keys = new Set(answerKeys(value));
  return q.options
    .filter((o) => keys.has(o.key))
    .map((o) => o.key)
    .join(',');
}

/** Les dépendances de la question sont-elles remplies par ces réponses ? */
export function dependencyMet(
  rules: QuestionRules | undefined,
  answers: Record<string, string>,
): boolean {
  if (!rules?.dependsOn) return true;
  const deps = Array.isArray(rules.dependsOn)
    ? rules.dependsOn
    : [rules.dependsOn];
  return deps.some((d) => {
    const v = answers[d.questionId];
    return !!v && d.values.includes(v);
  });
}

/**
 * Texte d'une réponse, y compris à choix multiple (« Français, English ») ;
 * `other` remplace le libellé de l'option à préciser (« Bambara »).
 */
export function answerText(
  q: Question | undefined,
  value: string,
  other?: string,
): string {
  if (!q) return String(value);
  const keys = answerKeys(value);
  const texts = keys.map((k) => {
    const option = q.options.find((o) => o.key === k);
    if (option?.freeText && other) return other;
    return option?.text ?? k;
  });
  return texts.length ? texts.join(', ') : String(value);
}

export function decodeUserResponses(
  responses: Array<{
    moduleName?: string;
    rawResponses: Record<string, string>;
  }>,
): Array<{
  moduleName: string;
  qna: Array<{ question: string; answer: string }>;
}> {
  const questionMap = new Map<string, Question>();
  QUESTIONS.forEach((q) => questionMap.set(q.id, q));

  return responses.map((r, idx) => {
    const raw = r.rawResponses || {};
    const qna: Array<{ question: string; answer: string }> = [];

    for (const [qId, optionKey] of Object.entries(raw)) {
      // Précision écrite : rendue avec la question à laquelle elle se rapporte.
      if (
        qId.endsWith(FREE_TEXT_SUFFIX) &&
        questionMap.has(qId.slice(0, -FREE_TEXT_SUFFIX.length))
      )
        continue;
      const qObj = questionMap.get(qId);
      if (qObj) {
        qna.push({
          question: qObj.text,
          answer: answerText(
            qObj,
            String(optionKey),
            raw[`${qId}${FREE_TEXT_SUFFIX}`],
          ),
        });
      } else {
        qna.push({
          question: qId,
          answer: String(optionKey),
        });
      }
    }

    return {
      moduleName: r.moduleName || `Module ${idx}`,
      qna,
    };
  });
}

export const QUESTIONS: Question[] = [
  // --- MODULE 0 : FILTRES NON-NÉGOCIABLES ---
  {
    id: 'M0_Q01',
    moduleNumber: 0,
    text: "La tranche d'âge que vous recherchez chez votre partenaire :",
    options: [
      { key: 'A', text: 'Même génération (±5 ans)' },
      { key: 'B', text: "Plus jeune (5 ans d'écart au plus)" },
      { key: 'C', text: "Plus âgé(e) (5 ans d'écart au plus)" },
      { key: 'D', text: "Peu importe, dans la limite de 5 ans d'écart" },
    ],
  },
  {
    id: 'M0_Q02',
    moduleNumber: 0,
    text: 'Le périmètre géographique de vos rencontres :',
    options: [
      { key: 'A', text: 'Même ville ou proximité (Local)' },
      { key: 'B', text: 'Même région' },
      { key: 'C', text: 'Tout mon pays (National)' },
      { key: 'D', text: 'International (Sans frontières)' },
    ],
  },
  {
    id: 'M0_Q03',
    moduleNumber: 0,
    text: 'Êtes-vous prêt(e) à déménager pour votre partenaire ?',
    options: [
      { key: 'A', text: 'Oui, sans condition' },
      { key: 'B', text: 'Oui, si le projet de vie est solide' },
      { key: 'C', text: 'Cela dépend de la distance' },
      { key: 'D', text: 'Non, je reste où je suis' },
    ],
  },
  {
    id: 'M0_Q04',
    moduleNumber: 0,
    text: 'Votre situation actuelle :',
    options: [
      { key: 'A', text: 'Célibataire' },
      { key: 'B', text: 'Séparé(e) / divorcé(e)' },
      { key: 'C', text: 'Veuf / Veuve' },
      { key: 'D', text: 'En transition relationnelle' },
    ],
  },
  {
    id: 'M0_Q05',
    moduleNumber: 0,
    text: 'Avez-vous des enfants à charge ?',
    options: [
      { key: 'A', text: "Non, pas d'enfants" },
      { key: 'B', text: 'Oui, un enfant' },
      { key: 'C', text: 'Oui, deux enfants ou plus' },
      { key: 'D', text: 'Oui, mais ils sont autonomes (18 ans et plus)' },
    ],
  },
  {
    id: 'M0_Q06',
    moduleNumber: 0,
    text: "Souhaitez-vous des enfants à l'avenir ?",
    options: [
      { key: 'A', text: 'Oui, absolument' },
      { key: 'B', text: 'Oui, si les conditions sont réunies' },
      { key: 'C', text: 'Je ne suis pas certain(e)' },
      { key: 'D', text: "Non, c'est définitif" },
    ],
    rules: { maxAge: 55 }, // 🎯 Désactivée si 55+ ans
  },
  {
    id: 'M0_Q07',
    moduleNumber: 0,
    text: "Votre niveau d'études :",
    options: [
      { key: 'A', text: 'Sans diplôme / CAP-BEP' },
      { key: 'B', text: 'Baccalauréat' },
      { key: 'C', text: 'Bac +2 à Bac +4' },
      { key: 'D', text: 'Bac +5 et plus' },
    ],
  },
  {
    // Ce que le membre fait lui-même ; M0_Q08 dit ce qu'il accepte chez l'autre.
    id: 'M0_Q09',
    moduleNumber: 0,
    text: 'Vous-même, fumez-vous ?',
    options: [
      { key: 'A', text: 'Non, jamais' },
      { key: 'B', text: 'Occasionnellement' },
      { key: 'C', text: 'Oui, régulièrement' },
    ],
  },
  {
    id: 'M0_Q08',
    moduleNumber: 0,
    text: "Le tabac, l'alcool ou d'autres substances chez votre partenaire :",
    options: [
      { key: 'A', text: 'Rédhibitoire — je ne pourrais pas vivre avec' },
      { key: 'B', text: 'Acceptable avec modération et sans excès' },
      { key: 'C', text: 'Je consomme moi-même occasionnellement' },
      { key: 'D', text: 'Sans importance pour moi' },
    ],
  },
  {
    // V6 — croisement par langue : deux membres ne sont présentés l'un à
    // l'autre que s'ils partagent au moins une langue (« Autre » exceptée).
    id: 'M0_Q10',
    moduleNumber: 0,
    text: "Dans quelles langues êtes-vous à l'aise pour vivre une relation au quotidien ? (plusieurs réponses possibles)",
    multiple: true,
    options: [
      { key: 'A', text: 'Français' },
      { key: 'B', text: 'Anglais — English' },
      { key: 'C', text: 'Arabe — العربية' },
      { key: 'D', text: 'Lingala' },
      { key: 'E', text: 'Kiswahili' },
      { key: 'F', text: 'Wolof' },
      { key: 'G', text: 'Portugais — Português' },
      { key: 'H', text: 'Espagnol — Español' },
      { key: 'I', text: 'Une autre langue (précisez)', freeText: true },
    ],
  },

  // --- MODULE 1 : IDENTITÉ & CULTURE ---
  {
    id: 'M1_Q01',
    moduleNumber: 1,
    text: "Votre continent d'origine ou de référence culturelle :",
    options: [
      { key: 'A', text: 'Afrique subsaharienne' },
      { key: 'B', text: 'Maghreb / Moyen-Orient' },
      { key: 'C', text: 'Europe' },
      { key: 'D', text: 'Asie' },
      { key: 'E', text: 'Amériques / Caraïbes' },
      { key: 'F', text: 'Océanie' },
    ],
  },
  {
    id: 'M1_Q02',
    moduleNumber: 1,
    text: 'La culture de votre partenaire idéal(e) :',
    options: [
      { key: 'A', text: 'La même que la mienne' },
      { key: 'B', text: 'Une culture proche ou compatible' },
      { key: 'C', text: 'Une culture différente mais ouverte' },
      { key: 'D', text: "Je n'ai pas de préférence" },
    ],
  },
  {
    id: 'M1_Q03',
    moduleNumber: 1,
    text: 'Quelle place accordez-vous aux traditions de mariage dans votre culture ?',
    options: [
      {
        key: 'A',
        text: 'Centrale — je les respecterai toutes (dot, zaffa, feu sacré, lazo…)',
      },
      { key: 'B', text: "Importante — j'en garderai les principales" },
      { key: 'C', text: "Modérée — j'en choisirai quelques-unes" },
      {
        key: 'D',
        text: 'Peu importante — je privilégie le symbolisme personnel',
      },
    ],
  },
  {
    id: 'M1_Q04',
    moduleNumber: 1,
    text: 'Laquelle de ces traditions de mariage vous représente le mieux ?',
    options: [
      { key: 'A', text: 'Dot / Bénédictions / Danses / Henné (Afrique)' },
      { key: 'B', text: 'Alliance / Robe blanche / Banquet (Europe)' },
      { key: 'C', text: 'Feu sacré / Cérémonie du thé / Rubans (Asie)' },
      { key: 'D', text: 'Bouquet / Lazo / Fête dansante (Amériques)' },
      { key: 'E', text: 'Zaffa / Henné / Contrat religieux (Moyen-Orient)' },
      { key: 'F', text: 'Rituels naturels / Chants / Tatouages (Océanie)' },
    ],
  },
  {
    id: 'M1_Q05',
    moduleNumber: 1,
    text: 'Votre religion ou spiritualité :',
    options: [
      { key: 'A', text: 'Chrétien(ne) pratiquant(e)' },
      { key: 'B', text: 'Musulman(e) pratiquant(e)' },
      { key: 'C', text: 'Juif / Juive pratiquant(e)' },
      { key: 'D', text: 'Bouddhiste / Hindouiste' },
      { key: 'E', text: 'Agnostique / Athée' },
      { key: 'F', text: 'Spirituel(le) sans religion définie' },
    ],
  },
  {
    id: 'M1_Q06',
    moduleNumber: 1,
    text: 'Votre religion aura-t-elle un impact sur votre partenaire ?',
    options: [
      { key: 'A', text: 'Oui — même foi obligatoire' },
      { key: 'B', text: 'Oui — mon partenaire devra respecter mes pratiques' },
      { key: 'C', text: "Oui — mais je suis ouvert(e) à d'autres croyances" },
      { key: 'D', text: 'Non — la religion est une affaire personnelle' },
    ],
  },
  {
    id: 'M1_Q08',
    moduleNumber: 1,
    text: 'La langue parlée à la maison :',
    options: [
      { key: 'A', text: 'Ma langue maternelle uniquement' },
      { key: 'B', text: 'Français ou langue du pays de résidence' },
      { key: 'C', text: 'Bilingue — deux langues' },
      { key: 'D', text: "Peu importe, du moment qu'on se comprend" },
    ],
  },
  {
    // V6 — rétablie depuis la V5 (Q09).
    id: 'M1_Q09',
    moduleNumber: 1,
    text: 'Votre rapport aux interdits alimentaires :',
    options: [
      {
        key: 'A',
        text: 'Stricts — halal, casher, végétarien ou autre conviction',
      },
      { key: 'B', text: 'Présents mais flexibles selon le contexte' },
      { key: 'C', text: 'Aucun — je mange de tout' },
      { key: 'D', text: "Sujet que je n'ai jamais vraiment posé" },
    ],
  },
  {
    id: 'M1_Q10',
    moduleNumber: 1,
    text: 'Le rôle des anciens et des patriarches dans vos décisions de couple :',
    options: [
      { key: 'A', text: 'Fondamental — je ne décide pas sans leur avis' },
      { key: 'B', text: 'Important, mais la décision finale nous appartient' },
      { key: 'C', text: 'Je les consulte par respect, pas par obligation' },
      { key: 'D', text: 'Nos décisions ne concernent que notre couple' },
    ],
  },
  {
    id: 'M1_Q11',
    moduleNumber: 1,
    text: 'Votre position sur la polygamie :',
    options: [
      { key: 'A', text: 'Inacceptable — monogamie exclusive, sans discussion' },
      {
        key: 'B',
        text: 'Je la respecte chez les autres, mais pas pour mon couple',
      },
      {
        key: 'C',
        text: 'Envisageable dans un cadre religieux, consenti et transparent',
      },
      { key: 'D', text: 'Je préfère en parler en personne' },
    ],
  },
  {
    // V6 — rétablie depuis la V5 (Q13) : posée si des enfants sont là ou souhaités.
    id: 'M1_Q13',
    moduleNumber: 1,
    text: 'Votre rapport à la transmission culturelle à vos enfants :',
    rules: {
      dependsOn: [
        { questionId: 'M0_Q05', values: ['B', 'C', 'D'] },
        { questionId: 'M0_Q06', values: ['A', 'B', 'C'] },
      ],
    },
    options: [
      {
        key: 'A',
        text: 'Langue maternelle, traditions et religion — tout se transmet',
      },
      { key: 'B', text: 'Ils seront exposés aux deux cultures' },
      { key: 'C', text: 'Ils choisiront eux-mêmes en grandissant' },
      { key: 'D', text: 'La culture ne sera pas centrale dans leur éducation' },
    ],
  },
  {
    // V6 — rétablie depuis la V5 (Q15).
    id: 'M1_Q15',
    moduleNumber: 1,
    text: "Si votre famille n'approuve pas votre partenaire pour des raisons culturelles :",
    options: [
      { key: 'A', text: 'Je respecte leur avis et je revois ma décision' },
      { key: 'B', text: "J'en tiens compte, mais je suis mon cœur" },
      { key: 'C', text: "J'explique ma position et je maintiens mon choix" },
      { key: 'D', text: "Leur approbation n'est pas nécessaire pour moi" },
    ],
  },

  // --- MODULE 2 : ATTACHEMENT & RÉGULATION ÉMOTIONNELLE ---
  {
    id: 'M2_Q01',
    moduleNumber: 2,
    text: 'Quand votre partenaire ne répond pas à vos messages pendant plusieurs heures :',
    options: [
      {
        key: 'A',
        text: "Je suppose qu'il/elle est occupé(e) et je patiente sereinement",
      },
      { key: 'B', text: "Je commence à m'inquiéter légèrement" },
      { key: 'C', text: 'Je lui renvoie un message pour vérifier' },
      { key: 'D', text: "Je ressens de l'angoisse ou de la colère intérieure" },
    ],
  },
  {
    id: 'M2_Q02',
    moduleNumber: 2,
    text: "Quand votre partenaire demande plus de proximité que vous n'en souhaitez :",
    options: [
      { key: 'A', text: "J'essaie de m'adapter même si ça me coûte" },
      { key: 'B', text: "J'explique calmement mon besoin d'espace" },
      { key: 'C', text: 'Je me sens envahi(e) et je prends mes distances' },
      { key: 'D', text: "J'ignore la demande et je change de sujet" },
    ],
  },
  {
    id: 'M2_Q03',
    moduleNumber: 2,
    text: 'Dans une relation, ce dont vous avez le plus besoin :',
    options: [
      {
        key: 'A',
        text: 'Me sentir en sécurité et aimé(e) inconditionnellement',
      },
      { key: 'B', text: 'Conserver mon autonomie et mon espace personnel' },
      { key: 'C', text: 'Un équilibre entre intimité et liberté' },
      { key: 'D', text: "Je n'ai pas encore identifié clairement mon besoin" },
    ],
  },
  {
    id: 'M2_Q04',
    moduleNumber: 2,
    text: 'Votre peur la plus profonde dans une relation :',
    options: [
      { key: 'A', text: 'Être abandonné(e)' },
      { key: 'B', text: 'Perdre mon indépendance' },
      { key: 'C', text: 'Ne pas être à la hauteur' },
      { key: 'D', text: 'Être trahi(e) ou manipulé(e)' },
    ],
  },
  {
    // V6 — question miroir rétablie depuis la V5 (Q05) : ce que les autres ont
    // observé, confronté à l'anxiété et à l'évitement déclarés.
    id: 'M2_Q05',
    moduleNumber: 2,
    text: "On m'a déjà reproché dans une relation de :",
    options: [
      { key: 'A', text: "Trop m'inquiéter ou manquer de confiance" },
      {
        key: 'B',
        text: 'Fuir ou mettre de la distance quand ça devient intense',
      },
      { key: 'C', text: 'Avoir du mal à exprimer ce que je ressentais' },
      { key: 'D', text: "On ne m'a jamais fait ce type de reproche" },
    ],
  },
  {
    id: 'M2_Q06',
    moduleNumber: 2,
    text: "Quand je suis en colère dans une relation, j'ai tendance à :",
    options: [
      { key: 'A', text: 'Exprimer ma colère clairement et directement' },
      { key: 'B', text: "Prendre du recul avant d'en parler" },
      { key: 'C', text: "Garder ça pour moi jusqu'à ce que ça explose" },
      { key: 'D', text: 'Couper le contact temporairement (silence punitif)' },
    ],
  },
  {
    // V6 — rétablie depuis la V5 (Q07) : vitesse de réparation après un conflit.
    id: 'M2_Q07',
    moduleNumber: 2,
    text: 'Après une dispute sérieuse, vous revenez à la douceur en :',
    options: [
      { key: 'A', text: 'Quelques heures — je ne laisse pas traîner' },
      { key: 'B', text: "Une journée — j'ai besoin de digérer" },
      { key: 'C', text: 'Plusieurs jours — les blessures durent' },
      { key: 'D', text: 'Très longtemps — je peux tenir des semaines' },
    ],
  },
  {
    id: 'M2_Q08',
    moduleNumber: 2,
    text: 'Êtes-vous capable de vous excuser en premier, même si vous pensez avoir raison ?',
    options: [
      { key: 'A', text: "Oui — l'harmonie passe avant mon ego" },
      {
        key: 'B',
        text: "Oui, si je me rends compte que j'ai commis une erreur",
      },
      { key: 'C', text: 'Difficilement — mon ego résiste' },
      { key: 'D', text: "Non — je n'ai pas à m'excuser si j'avais raison" },
    ],
  },
  {
    // V6 — reformulée : on mesure l'ouverture à l'aide (une attitude), plus un
    // antécédent de suivi psychologique (donnée de santé, RGPD article 9).
    // Les clés gardent leur sens : A = suivi régulier, D = préfère gérer seul(e).
    id: 'M2_Q10',
    moduleNumber: 2,
    text: "Si vous traversiez une période difficile, demander l'aide d'un professionnel (psychologue, conseiller conjugal) serait pour vous :",
    options: [
      {
        key: 'A',
        text: "Naturel — je l'ai déjà fait ou je le ferais sans hésiter",
      },
      { key: 'B', text: "Possible, après avoir d'abord essayé seul(e)" },
      {
        key: 'C',
        text: "Je n'en ai jamais eu besoin, mais j'y suis ouvert(e)",
      },
      { key: 'D', text: "Difficile — je préfère m'en sortir seul(e)" },
    ],
  },
  // V6 — échelles validées (formulations originales BOLIGO, sur le modèle des
  // questionnaires de recherche) : anxiété et évitement d'attachement (ECR-R),
  // régulation émotionnelle (ERQ). Items marqués « inversé » : 6 − note.
  {
    // Anxiété d'attachement.
    id: 'M2_Q11',
    moduleNumber: 2,
    scale: 'accord',
    text: "J'ai souvent peur de tenir davantage à l'autre que l'autre ne tient à moi.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Anxiété d'attachement.
    id: 'M2_Q12',
    moduleNumber: 2,
    scale: 'accord',
    text: "Quand l'autre prend un peu de distance, j'ai besoin d'être rassuré(e) très vite.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Anxiété d'attachement (inversé).
    id: 'M2_Q13',
    moduleNumber: 2,
    scale: 'accord',
    text: "L'idée d'être quitté(e) m'inquiète rarement.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Évitement d'attachement.
    id: 'M2_Q14',
    moduleNumber: 2,
    scale: 'accord',
    text: "Je suis mal à l'aise quand l'autre veut être très proche de moi.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Évitement d'attachement.
    id: 'M2_Q15',
    moduleNumber: 2,
    scale: 'accord',
    text: "Je préfère ne pas montrer à l'autre ce que je ressens au fond de moi.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Évitement d'attachement (inversé).
    id: 'M2_Q16',
    moduleNumber: 2,
    scale: 'accord',
    text: "Il m'est facile de compter sur l'autre quand j'en ai besoin.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Régulation émotionnelle : réévaluation.
    id: 'M2_Q17',
    moduleNumber: 2,
    scale: 'accord',
    text: "Quand je suis contrarié(e), j'arrive à regarder la situation sous un autre angle pour me calmer.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Régulation émotionnelle : suppression.
    id: 'M2_Q18',
    moduleNumber: 2,
    scale: 'accord',
    text: 'Je garde mes émotions pour moi, même quand elles sont fortes.',
    options: AGREEMENT_OPTIONS,
  },
  // V6.1 — Timidité et ouverture (timidité : Cheek & Buss ; confidence :
  // échelle « Opener » de Miller, Berg & Archer). Formulations BOLIGO.
  {
    id: 'M2_Q19',
    moduleNumber: 2,
    scale: 'accord',
    text: "Au début d'une rencontre, je suis intimidé(e) et j'ai du mal à me montrer tel(le) que je suis.",
    options: AGREEMENT_OPTIONS,
  },
  {
    id: 'M2_Q20',
    moduleNumber: 2,
    scale: 'accord',
    text: 'Il me faut du temps avant de parler de moi et de ce que je ressens.',
    options: AGREEMENT_OPTIONS,
  },
  {
    id: 'M2_Q21',
    moduleNumber: 2,
    scale: 'accord',
    text: 'Les gens se confient facilement à moi.',
    options: AGREEMENT_OPTIONS,
  },

  // --- MODULE 3 : VÉCU & CONTEXTE ---
  {
    id: 'M3_Q01',
    moduleNumber: 3,
    text: 'La leçon principale de vos relations passées :',
    options: [
      { key: 'A', text: 'Mieux communiquer mes besoins dès le départ' },
      { key: 'B', text: "L'importance de la compatibilité des valeurs" },
      { key: 'C', text: 'Poser mes limites sans culpabilité' },
      { key: 'D', text: "Choisir avec la tête autant qu'avec le cœur" },
    ],
  },
  {
    id: 'M3_Q02',
    moduleNumber: 3,
    text: 'La cause principale de votre dernière rupture :',
    options: [
      { key: 'A', text: 'Incompatibilité de valeurs ou de projet de vie' },
      { key: 'B', text: 'Un profond manque de communication' },
      { key: 'C', text: 'Infidélité ou trahison' },
      { key: 'D', text: 'Pression familiale ou culturelle' },
      { key: 'E', text: 'Violence ou manque de respect' },
    ],
  },
  {
    id: 'M3_Q03',
    moduleNumber: 3,
    text: 'Comment avez-vous vécu votre dernière rupture ?',
    options: [
      { key: 'A', text: "Très difficilement — je m'en remets encore" },
      { key: 'B', text: 'Douloureusement, mais je me suis reconstruit(e)' },
      { key: 'C', text: 'Relativement bien — décision mutuelle' },
      { key: 'D', text: "C'est moi qui ai décidé — je me sens libéré(e)" },
    ],
  },
  {
    id: 'M3_Q04',
    moduleNumber: 3,
    text: 'Votre vision de la famille recomposée :',
    options: [
      { key: 'A', text: "Mon enfant, c'est ton enfant — intégration totale" },
      { key: 'B', text: "On s'aime, mais les rôles parentaux restent définis" },
      {
        key: 'C',
        text: 'Mon partenaire est présent sans autorité parentale directe',
      },
      { key: 'D', text: 'Ça se construira avec le temps et la confiance' },
    ],
    rules: { minAge: 35 },
  },
  {
    id: 'M3_Q05',
    moduleNumber: 3,
    text: 'Quelle place accordez-vous à votre ex dans votre vie actuelle ?',
    options: [
      { key: 'A', text: 'Aucune — rupture totale' },
      { key: 'B', text: 'Communication uniquement pour les enfants' },
      { key: 'C', text: 'On est restés amis' },
      { key: 'D', text: 'Il/elle fait partie de mon entourage proche' },
    ],
  },
  {
    // V6 — rétablie depuis la V5 (Q07).
    id: 'M3_Q07',
    moduleNumber: 3,
    text: 'Avez-vous des conflits non résolus avec votre ex-partenaire ?',
    options: [
      { key: 'A', text: 'Non — tout est clarifié' },
      { key: 'B', text: 'Des tensions sur la garde des enfants' },
      { key: 'C', text: 'Des tensions financières encore actives' },
      { key: 'D', text: "Nous n'avons jamais eu de vraie clôture" },
    ],
  },
  {
    id: 'M3_Q08',
    moduleNumber: 3,
    text: 'Avez-vous vécu une situation de violence dans une relation passée ?',
    options: [
      {
        key: 'A',
        text: "Oui — j'en ai été victime et j'ai travaillé là-dessus",
      },
      { key: 'B', text: "Oui — j'en ai été témoin dans ma famille" },
      { key: 'C', text: 'Non, jamais' },
      { key: 'D', text: 'Je préfère ne pas répondre' },
    ],
  },
  {
    id: 'M3_Q10',
    moduleNumber: 3,
    text: 'Avez-vous déjà reproduit les mêmes schémas dans plusieurs relations ?',
    options: [
      {
        key: 'A',
        text: "Oui, et j'ai travaillé là-dessus (seul(e) ou accompagné(e))",
      },
      { key: 'B', text: "Oui, je le vois, mais j'ai du mal à changer" },
      { key: 'C', text: 'Je ne sais pas vraiment' },
      { key: 'D', text: 'Non — chaque relation est différente pour moi' },
    ],
  },

  // --- MODULE 4 : VISION ÉCONOMIQUE ---
  {
    id: 'M4_Q01',
    moduleNumber: 4,
    text: "Votre rapport à l'argent dans un couple :",
    options: [
      { key: 'A', text: 'Tout en commun — un seul pot partagé' },
      { key: 'B', text: 'Contribution proportionnelle aux revenus' },
      {
        key: 'C',
        text: 'Chacun ses dépenses, et les charges communes partagées',
      },
      { key: 'D', text: "L'argent reste une affaire individuelle" },
    ],
  },
  {
    id: 'M4_Q03',
    moduleNumber: 4,
    text: "Votre vision du rôle économique de l'homme :",
    options: [
      {
        key: 'A',
        text: "Il est le pourvoyeur principal — c'est sa responsabilité",
      },
      {
        key: 'B',
        text: 'Il contribue sans que ce soit une obligation absolue',
      },
      { key: 'C', text: "L'égalité est la norme — on partage tout" },
      { key: 'D', text: 'Son rôle dépend de la situation de chacun' },
    ],
  },
  {
    id: 'M4_Q04',
    moduleNumber: 4,
    text: 'Votre vision du rôle économique de la femme :',
    options: [
      {
        key: 'A',
        text: "Elle gère le foyer et l'éducation — c'est sa priorité",
      },
      {
        key: 'B',
        text: 'Elle travaille, mais la maison reste sa responsabilité principale',
      },
      {
        key: 'C',
        text: 'Elle est autonome financièrement et contribue au foyer',
      },
      { key: 'D', text: "Elle fait ce qu'elle souhaite — aucun rôle imposé" },
    ],
  },
  {
    id: 'M4_Q05',
    moduleNumber: 4,
    text: "Votre rapport aux envois d'argent à la famille élargie :",
    options: [
      {
        key: 'A',
        text: "C'est normal et régulier — ma famille compte sur moi",
      },
      { key: 'B', text: 'Ça se discute en couple avant toute décision' },
      { key: 'C', text: "C'est mon argent — c'est mon affaire" },
      { key: 'D', text: 'Ça doit être limité pour préserver notre foyer' },
    ],
    rules: {
      dependsOn: { questionId: 'M1_Q01', values: ['A', 'B', 'D'] }, // Afrique, Maghreb, Asie
    },
  },
  {
    id: 'M4_Q06',
    moduleNumber: 4,
    text: "L'achat immobilier dans votre projet de vie :",
    options: [
      { key: 'A', text: "Seul(e) — c'est mon indépendance" },
      { key: 'B', text: "À deux — c'est un projet commun" },
      { key: 'C', text: "Location flexible pour l'instant" },
      { key: 'D', text: 'Pas une priorité' },
    ],
  },
  {
    // V6 — rétablie depuis la V5 (Q07) : posée si l'origine est l'Afrique subsaharienne ou le Maghreb / Moyen-Orient.
    id: 'M4_Q07',
    moduleNumber: 4,
    rules: { dependsOn: { questionId: 'M1_Q01', values: ['A', 'B'] } },
    text: 'La dot ou le mahr dans votre culture :',
    options: [
      { key: 'A', text: 'Une obligation que je respecte pleinement' },
      { key: 'B', text: 'Une tradition symbolique importante' },
      { key: 'C', text: 'Je la pratique de façon modernisée' },
      { key: 'D', text: "Pas dans ma culture, ou je n'y adhère pas" },
    ],
  },
  {
    id: 'M4_Q08',
    moduleNumber: 4,
    text: "Votre rapport à l'épargne dans le couple :",
    options: [
      { key: 'A', text: 'On épargne ensemble pour des projets communs' },
      { key: 'B', text: 'Chacun épargne de son côté' },
      { key: 'C', text: 'Une épargne commune et une épargne personnelle' },
      { key: 'D', text: "Je ne suis pas à l'aise pour épargner ensemble" },
    ],
  },
  {
    id: 'M4_Q09',
    moduleNumber: 4,
    text: 'Les dettes ou crédits en cours de votre partenaire :',
    options: [
      { key: 'A', text: "Tout doit être dit avant de s'engager" },
      { key: 'B', text: 'On en parle au moment de vivre ensemble' },
      {
        key: 'C',
        text: "Ça reste personnel tant que ça n'impacte pas le couple",
      },
      { key: 'D', text: 'Je ne me suis jamais posé la question' },
    ],
  },
  // V6.1 — Argent pendant la fréquentation, manque d'argent, matérialisme,
  // partage des affaires personnelles.
  {
    id: 'M4_Q10',
    moduleNumber: 4,
    text: "Au premier rendez-vous, l'addition :",
    options: [
      {
        key: 'A',
        text: "C'est à l'homme de payer — c'est une marque de respect",
      },
      { key: 'B', text: 'Celui ou celle qui a proposé la sortie paie' },
      { key: 'C', text: 'On partage, moitié-moitié' },
      { key: 'D', text: 'Peu importe, tant que personne ne se sent redevable' },
    ],
  },
  {
    id: 'M4_Q11',
    moduleNumber: 4,
    text: 'Si votre partenaire gagnait peu ou plus rien pendant une longue période :',
    options: [
      {
        key: 'A',
        text: "Je le ou la soutiens sans compter — c'est le sens du couple",
      },
      {
        key: 'B',
        text: 'Je soutiens, avec un plan pour nous en sortir ensemble',
      },
      {
        key: 'C',
        text: 'Je soutiens un temps, mais cela finirait par peser sur mes sentiments',
      },
      {
        key: 'D',
        text: 'Un manque d’argent durable serait une raison de partir',
      },
    ],
  },
  {
    id: 'M4_Q12',
    moduleNumber: 4,
    text: "La place de l'argent et du niveau de vie dans le choix d'un(e) partenaire :",
    options: [
      { key: 'A', text: 'Essentielle — je veux un certain niveau de vie' },
      {
        key: 'B',
        text: 'Importante — la stabilité compte plus que le montant',
      },
      { key: 'C', text: 'Secondaire — on construit ensemble' },
      { key: 'D', text: 'Aucune — seul le cœur compte' },
    ],
  },
  {
    id: 'M4_Q13',
    moduleNumber: 4,
    text: 'Prêter vos affaires personnelles à votre partenaire (voiture, téléphone, ordinateur, vêtements) :',
    options: [
      { key: 'A', text: 'Ce qui est à moi est à toi' },
      { key: 'B', text: "Volontiers, à condition qu'on me demande avant" },
      {
        key: 'C',
        text: 'Certaines choses seulement — ma voiture ou mon téléphone, non',
      },
      { key: 'D', text: 'Je préfère que chacun garde ses affaires' },
    ],
  },

  // --- MODULE 5 : DYNAMIQUE SOCIALE & FAMILIALE ---
  {
    id: 'M5_Q01',
    moduleNumber: 5,
    text: 'La place de votre famille dans vos décisions de couple :',
    options: [
      { key: 'A', text: 'Centrale — je ne décide pas sans leur avis' },
      { key: 'B', text: 'Importante, mais la décision finale nous appartient' },
      { key: 'C', text: 'Je les consulte par respect, pas par obligation' },
      { key: 'D', text: 'Nos décisions ne concernent que notre couple' },
    ],
  },
  {
    id: 'M5_Q02',
    moduleNumber: 5,
    text: 'Votre mère (ou votre père) manque de respect à votre partenaire. Vous :',
    options: [
      {
        key: 'A',
        text: 'Défendez votre partenaire immédiatement et clairement',
      },
      { key: 'B', text: "Cherchez à comprendre avant d'agir" },
      { key: 'C', text: 'Attendez que ça se règle naturellement' },
      {
        key: 'D',
        text: 'Dites à votre partenaire de ne pas le prendre trop à cœur',
      },
    ],
  },
  {
    id: 'M5_Q03',
    moduleNumber: 5,
    text: 'La cohabitation avec la belle-famille :',
    options: [
      {
        key: 'A',
        text: "J'accepte si c'est temporaire et avec des règles claires",
      },
      { key: 'B', text: "Je n'accepte pas — notre foyer nous appartient" },
      { key: 'C', text: "C'est normal dans ma culture — c'est attendu" },
      { key: 'D', text: "J'accepte si mon partenaire est d'accord" },
    ],
  },
  {
    id: 'M5_Q04',
    moduleNumber: 5,
    text: 'Avez-vous des amis proches du sexe opposé ?',
    options: [
      { key: 'A', text: "Oui — c'est non négociable pour moi" },
      { key: 'B', text: 'Oui — mais je suis transparent(e) à ce sujet' },
      { key: 'C', text: "J'évite par respect pour mon partenaire" },
      { key: 'D', text: 'Non, je préfère ne pas en avoir' },
    ],
  },
  {
    id: 'M5_Q05',
    moduleNumber: 5,
    text: 'Les réseaux sociaux et votre vie de couple :',
    options: [
      { key: 'A', text: "Je publie notre vie — j'aime partager notre bonheur" },
      {
        key: 'B',
        text: 'Je protège notre intimité — peu ou pas de publications',
      },
      { key: 'C', text: 'Chacun gère son compte librement' },
      {
        key: 'D',
        text: "Les réseaux n'ont pas de place dans notre vie de couple",
      },
    ],
  },
  {
    id: 'M5_Q07',
    moduleNumber: 5,
    text: 'La fréquence idéale des visites à la belle-famille :',
    options: [
      { key: 'A', text: 'Tous les week-ends ou très régulièrement' },
      { key: 'B', text: 'Une fois par mois' },
      { key: 'C', text: 'Pour les grandes occasions uniquement' },
      { key: 'D', text: 'Jamais ou très rarement' },
    ],
  },
  {
    id: 'M5_Q08',
    moduleNumber: 5,
    text: "L'accès au téléphone et aux messages de votre partenaire :",
    options: [
      { key: 'A', text: 'Transparence totale — chacun a accès à tout' },
      { key: 'B', text: 'Confiance sans contrôle — chacun garde son intimité' },
      { key: 'C', text: 'Accès possible seulement en cas de doute sérieux' },
      { key: 'D', text: 'Je ne me suis jamais posé la question' },
    ],
  },

  // --- MODULE 6 : QUOTIDIEN, COMMUNICATION RÉELLE & LIMITES ---
  {
    id: 'M6_Q01',
    moduleNumber: 6,
    text: "Lors d'une dispute, votre comportement concret est plutôt :",
    options: [
      {
        key: 'A',
        text: "Parler même si c'est difficile — je confronte directement",
      },
      { key: 'B', text: 'Prendre du recul et revenir calme' },
      { key: 'C', text: 'Couper la conversation et partir' },
      { key: 'D', text: 'Me murer dans le silence — parfois des jours' },
    ],
  },
  {
    // V6 — question miroir rétablie depuis la V5 (Q02).
    id: 'M6_Q02',
    moduleNumber: 6,
    text: "On m'a déjà reproché dans une dispute de :",
    options: [
      { key: 'A', text: 'Parler trop fort ou trop vite' },
      { key: 'B', text: 'Fuir ou couper la communication' },
      { key: 'C', text: 'Être sarcastique ou blessant(e) avec les mots' },
      { key: 'D', text: "On ne m'a jamais fait ce type de reproche" },
    ],
  },
  {
    id: 'M6_Q03',
    moduleNumber: 6,
    text: "Avez-vous besoin de gagner le débat ou d'avoir le dernier mot ?",
    options: [
      { key: 'A', text: "Non — résoudre m'importe plus que gagner" },
      { key: 'B', text: "Parfois, je m'emporte, mais je m'en rends compte" },
      { key: 'C', text: "Souvent oui — c'est plus fort que moi" },
      { key: 'D', text: "Oui — et j'assume totalement" },
    ],
  },
  {
    // V6 — rétablie depuis la V5 (Q04) : limite face à la violence physique.
    id: 'M6_Q04',
    moduleNumber: 6,
    text: 'La violence physique dans une relation :',
    options: [
      { key: 'A', text: 'Rupture immédiate — limite absolue, non négociable' },
      {
        key: 'B',
        text: "Inacceptable, mais je tenterais d'abord une discussion",
      },
      { key: 'C', text: 'Ça dépend des circonstances' },
      { key: 'D', text: 'Je ne sais pas comment je réagirais' },
    ],
  },
  {
    // V6 — rétablie depuis la V5 (Q05) : limite face aux mots blessants.
    id: 'M6_Q05',
    moduleNumber: 6,
    text: "Les insultes ou les mots blessants lors d'une dispute :",
    options: [
      { key: 'A', text: 'Limite absolue pour moi — inacceptable' },
      { key: 'B', text: 'Grave, mais je peux pardonner une première fois' },
      { key: 'C', text: 'Difficile, mais ça peut arriver dans un couple' },
      { key: 'D', text: "J'essaie de passer outre si ce n'est pas récurrent" },
    ],
  },
  {
    id: 'M6_Q06',
    moduleNumber: 6,
    text: 'Votre rapport à la sexualité dans le couple :',
    options: [
      { key: 'A', text: "C'est un pilier fondamental de la relation" },
      { key: 'B', text: "C'est important mais pas déterminant" },
      { key: 'C', text: "C'est un sujet qui se construit avec le temps" },
      {
        key: 'D',
        text: "C'est un sujet intime que j'aborderai en temps voulu",
      },
    ],
  },
  {
    id: 'M6_Q07',
    moduleNumber: 6,
    text: "La fréquence d'intimité physique que vous souhaitez idéalement dans une relation :",
    options: [
      { key: 'A', text: 'Très régulièrement — plusieurs fois par semaine' },
      { key: 'B', text: 'Régulièrement — quelques fois par mois' },
      { key: 'C', text: "Occasionnellement — selon l'humeur et la complicité" },
      {
        key: 'D',
        text: "La fréquence m'importe peu — c'est la qualité qui compte",
      },
    ],
  },
  {
    // V6 — rétablie depuis la V5 (Q08) : savoir poser une limite intime.
    id: 'M6_Q08',
    moduleNumber: 6,
    text: "Quand vous n'avez pas envie d'intimité physique et que votre partenaire le propose :",
    options: [
      {
        key: 'A',
        text: "Je l'exprime doucement et on trouve une alternative tendre",
      },
      {
        key: 'B',
        text: "J'accepte pour lui faire plaisir — ça m'arrive souvent",
      },
      { key: 'C', text: 'Je dis non clairement, sans culpabilité' },
      { key: 'D', text: "J'ai du mal à refuser — je ne veux pas décevoir" },
    ],
  },
  {
    id: 'M6_Q10',
    moduleNumber: 6,
    text: 'La fidélité dans votre conception du couple :',
    options: [
      { key: 'A', text: 'Absolue et non négociable' },
      { key: 'B', text: 'Importante, mais je crois en la réconciliation' },
      { key: 'C', text: 'Je suis humain(e) — les tentations existent' },
      {
        key: 'D',
        text: 'Je définis la fidélité différemment selon le contexte',
      },
    ],
  },
  {
    id: 'M6_Q11',
    moduleNumber: 6,
    text: 'Après une dispute, la réconciliation idéale pour vous :',
    options: [
      { key: 'A', text: 'On en reparle calmement et on se demande pardon' },
      { key: 'B', text: "Un geste tendre vaut mieux qu'une longue discussion" },
      { key: 'C', text: 'Chacun prend du recul, puis on tourne la page' },
      { key: 'D', text: "J'ai besoin que l'autre fasse le premier pas" },
    ],
  },
  // V6 — les « quatre cavaliers » de Gottman (critique, mépris, attitude
  // défensive, repli) : les comportements de dispute les plus prédictifs de
  // l'usure d'un couple. Échelle de fréquence.
  {
    // Critique.
    id: 'M6_Q12',
    moduleNumber: 6,
    scale: 'frequence',
    text: "Pendant une dispute, je reproche à l'autre ce qu'il ou elle est, plutôt qu'un fait précis (« tu es toujours… », « tu ne fais jamais… »).",
    options: FREQUENCY_OPTIONS,
  },
  {
    // Mépris.
    id: 'M6_Q13',
    moduleNumber: 6,
    scale: 'frequence',
    text: 'Pendant une dispute, je deviens ironique, je me moque ou je lève les yeux au ciel.',
    options: FREQUENCY_OPTIONS,
  },
  {
    // Attitude défensive.
    id: 'M6_Q14',
    moduleNumber: 6,
    scale: 'frequence',
    text: "Quand on me fait un reproche, je me justifie ou je renvoie la faute plutôt que d'écouter.",
    options: FREQUENCY_OPTIONS,
  },
  {
    // Repli (mur de silence).
    id: 'M6_Q15',
    moduleNumber: 6,
    scale: 'frequence',
    text: 'Pendant une dispute, je me ferme complètement et je ne réponds plus.',
    options: FREQUENCY_OPTIONS,
  },

  // --- MODULE 7 : TRAJECTOIRE DE VIE & PERSONNALITÉ ---
  {
    id: 'M7_Q01',
    moduleNumber: 7,
    text: 'Dans 5 ans, si tout se passe comme vous le souhaitez, votre vie ressemble à :',
    options: [
      { key: 'A', text: 'Stable et établie — foyer, enfants, sécurité' },
      {
        key: 'B',
        text: 'En progression constante — carrière, projets, croissance',
      },
      { key: 'C', text: 'Aventureuse et libre — voyages, découvertes' },
      { key: 'D', text: 'Paisible et profonde — peu mais bien' },
    ],
  },
  {
    id: 'M7_Q02',
    moduleNumber: 7,
    text: "Votre niveau d'ambition professionnelle :",
    options: [
      {
        key: 'A',
        text: 'Élevé — je vise haut et je fais des sacrifices pour y arriver',
      },
      { key: 'B', text: "Modéré — j'aime réussir sans que ça prenne tout" },
      { key: 'C', text: "Faible — l'équilibre de vie prime sur la carrière" },
      { key: 'D', text: 'Accompli — je suis dans une phase de transmission' },
    ],
  },
  {
    id: 'M7_Q03',
    moduleNumber: 7,
    text: 'Vous êtes plutôt :',
    options: [
      {
        key: 'A',
        text: 'Introverti(e) — les gens me fatiguent, je me ressource seul(e)',
      },
      {
        key: 'B',
        text: "Ambiverti(e) — j'ai besoin des deux selon les moments",
      },
      { key: 'C', text: "Extraverti(e) — les gens me donnent de l'énergie" },
      { key: 'D', text: 'Ça dépend complètement du contexte' },
    ],
  },
  {
    id: 'M7_Q05',
    moduleNumber: 7,
    text: "Votre rapport au changement et à l'imprévu :",
    options: [
      { key: 'A', text: "J'adore — le changement me stimule et me nourrit" },
      { key: 'B', text: "J'accepte bien — la flexibilité est une qualité" },
      { key: 'C', text: "J'ai besoin de m'adapter progressivement" },
      { key: 'D', text: "J'ai besoin de stabilité — l'imprévu me déstabilise" },
    ],
  },
  {
    id: 'M7_Q07',
    moduleNumber: 7,
    text: 'Où vous voyez-vous vivre dans 5 ans ?',
    options: [
      { key: 'A', text: "Dans la même ville qu'aujourd'hui" },
      { key: 'B', text: 'Dans une autre ville ou région de mon pays' },
      { key: 'C', text: 'Dans un autre pays' },
      { key: 'D', text: 'Je suis ouvert(e) — ça dépend du projet de vie' },
    ],
  },
  {
    id: 'M7_Q08',
    moduleNumber: 7,
    text: 'Le temps passé ensemble dans la semaine, idéalement :',
    options: [
      { key: 'A', text: 'Le plus possible — on partage presque tout' },
      {
        key: 'B',
        text: 'Les soirées et les week-ends, avec des moments à soi',
      },
      { key: 'C', text: 'Quelques rendez-vous de qualité — chacun sa vie' },
      { key: 'D', text: 'Ça dépend des périodes et des projets' },
    ],
  },
  // V6 — personnalité en cinq grands traits (structure du BFI-10 : deux
  // affirmations par trait, dont une inversée).
  {
    // Extraversion.
    id: 'M7_Q09',
    moduleNumber: 7,
    scale: 'accord',
    text: "Je me vois comme quelqu'un qui est sociable et va facilement vers les autres.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Extraversion (inversé).
    id: 'M7_Q10',
    moduleNumber: 7,
    scale: 'accord',
    text: "Je me vois comme quelqu'un qui est plutôt réservé(e).",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Agréabilité.
    id: 'M7_Q11',
    moduleNumber: 7,
    scale: 'accord',
    text: "Je me vois comme quelqu'un qui accorde facilement sa confiance et sa bienveillance.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Agréabilité (inversé).
    id: 'M7_Q12',
    moduleNumber: 7,
    scale: 'accord',
    text: "Je me vois comme quelqu'un qui a tendance à relever les défauts des autres.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Conscience.
    id: 'M7_Q13',
    moduleNumber: 7,
    scale: 'accord',
    text: "Je me vois comme quelqu'un qui va au bout de ce qu'il ou elle entreprend, avec soin.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Conscience (inversé).
    id: 'M7_Q14',
    moduleNumber: 7,
    scale: 'accord',
    text: "Je me vois comme quelqu'un qui a tendance à remettre les choses à plus tard.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Stabilité émotionnelle (inversé).
    id: 'M7_Q15',
    moduleNumber: 7,
    scale: 'accord',
    text: "Je me vois comme quelqu'un qui se laisse facilement gagner par le stress ou l'inquiétude.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Stabilité émotionnelle.
    id: 'M7_Q16',
    moduleNumber: 7,
    scale: 'accord',
    text: "Je me vois comme quelqu'un qui reste calme et détendu(e) face aux difficultés.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Ouverture.
    id: 'M7_Q17',
    moduleNumber: 7,
    scale: 'accord',
    text: "Je me vois comme quelqu'un qui a de l'imagination et aime les idées nouvelles.",
    options: AGREEMENT_OPTIONS,
  },
  {
    // Ouverture (inversé).
    id: 'M7_Q18',
    moduleNumber: 7,
    scale: 'accord',
    text: "Je me vois comme quelqu'un qui s'intéresse peu à l'art, à la culture ou aux idées abstraites.",
    options: AGREEMENT_OPTIONS,
  },

  // --- MODULE 8 : PROJET DE COUPLE ---
  {
    id: 'M8_Q01',
    moduleNumber: 8,
    text: 'Votre objectif principal sur BOLIGO :',
    options: [
      { key: 'A', text: 'Mariage — je cherche un engagement officiel' },
      { key: 'B', text: 'Relation sérieuse avec projet de vie commun' },
      { key: 'C', text: 'Apprendre à me connaître avant tout engagement' },
      { key: 'D', text: 'Je suis ouvert(e) à voir ce qui se présente' },
    ],
  },
  {
    id: 'M8_Q02',
    moduleNumber: 8,
    text: 'Dans quel délai envisagez-vous un engagement officiel ?',
    options: [
      { key: 'A', text: 'Dans les 12 mois si tout va bien' },
      { key: 'B', text: 'Dans 2 à 3 ans' },
      { key: 'C', text: 'Sans pression — à notre rythme naturel' },
      { key: 'D', text: 'Quand les conditions seront mûres' },
    ],
  },
  {
    id: 'M8_Q03',
    moduleNumber: 8,
    text: 'Votre vision du mariage :',
    options: [
      { key: 'A', text: 'Un acte religieux et spirituel fondamental' },
      { key: 'B', text: 'Un engagement civil et symbolique' },
      { key: 'C', text: 'Les deux — civil et religieux' },
      { key: 'D', text: "Un choix optionnel — l'amour prime sur le papier" },
    ],
  },
  {
    id: 'M8_Q04',
    moduleNumber: 8,
    text: "Votre langage de l'amour principal :",
    options: [
      { key: 'A', text: "Mots d'affirmation (je t'aime, les compliments)" },
      { key: 'B', text: 'Actes de service (aider, rendre service)' },
      { key: 'C', text: 'Cadeaux (offrir et recevoir)' },
      { key: 'D', text: 'Temps de qualité (être pleinement présent(e))' },
      { key: 'E', text: 'Toucher physique (câlins, gestes tendres)' },
    ],
  },
  {
    id: 'M8_Q05',
    moduleNumber: 8,
    text: 'Ce qui, pour vous, entraînerait une rupture sans discussion possible :',
    options: [
      { key: 'A', text: 'Infidélité ou mensonge grave' },
      { key: 'B', text: 'Violence ou manque de respect répété' },
      { key: 'C', text: 'Désaccord profond sur les enfants ou la religion' },
      { key: 'D', text: 'Incompatibilité de valeurs fondamentales' },
    ],
  },
  {
    // V6 — rétablie depuis la V5 (Q06).
    id: 'M8_Q06',
    moduleNumber: 8,
    text: 'La communication dans votre couple idéal :',
    options: [
      { key: 'A', text: 'On se parle de tout, tout le temps' },
      { key: 'B', text: "On communique en profondeur sur l'essentiel" },
      { key: 'C', text: "On discute surtout quand c'est nécessaire" },
      { key: 'D', text: 'Je préfère les actes aux longs discours' },
    ],
  },
  {
    id: 'M8_Q08',
    moduleNumber: 8,
    text: 'Ce que vous ne pourrez jamais accepter dans un couple :',
    options: [
      { key: 'A', text: 'Le mensonge répété' },
      { key: 'B', text: "L'infidélité sous toute forme" },
      { key: 'C', text: 'Le manque de respect de ma famille' },
      { key: 'D', text: "L'absence de projet commun" },
    ],
  },
  {
    id: 'M8_Q09',
    moduleNumber: 8,
    text: 'Si vos projets de vie divergent sur un point clé (ville, enfants, religion) :',
    options: [
      {
        key: 'A',
        text: "J'en parle tôt et je tranche vite si ce n'est pas compatible",
      },
      {
        key: 'B',
        text: "Je laisse la relation grandir avant d'aborder le sujet",
      },
      { key: 'C', text: "Je cherche un compromis, quel qu'en soit le prix" },
      {
        key: 'D',
        text: "Je fais confiance à l'amour pour trouver une solution",
      },
    ],
  },
  // V6.1 — Signaux d'alerte actuels (« red flags »), formulés pour les deux
  // sexes : croisés avec les habitudes déclarées par l'autre (Module 9).
  {
    id: 'M8_Q10',
    moduleNumber: 8,
    multiple: true,
    maxChoices: 3,
    text: 'Parmi ces signaux, lesquels vous feraient fuir rapidement ? (3 au plus)',
    options: [
      {
        key: 'A',
        text: "Des déclarations d'amour très rapides et envahissantes",
      },
      {
        key: 'B',
        text: 'Une jalousie qui contrôle : téléphone fouillé, localisation exigée',
      },
      {
        key: 'C',
        text: 'Disparaître des jours sans explication, puis revenir comme si de rien n’était',
      },
      {
        key: 'D',
        text: 'Rester flou sur ses intentions : « on verra », sans engagement',
      },
      { key: 'E', text: 'Dire du mal de tous ses ex' },
      {
        key: 'F',
        text: 'Mal parler aux serveurs, aux inconnus ou à sa famille',
      },
      { key: 'G', text: "Compter sur l'argent de l'autre pour vivre" },
      { key: 'H', text: 'Ne jamais reconnaître ses torts' },
      { key: 'I', text: 'Ne pas respecter un « non » ou une limite' },
      {
        key: 'J',
        text: 'Avoir les yeux rivés sur son téléphone pendant les moments à deux',
      },
    ],
  },
  {
    id: 'M8_Q11',
    moduleNumber: 8,
    text: "Si votre partenaire tombait gravement malade ou vivait avec un handicap, prendre soin de lui ou d'elle serait pour vous :",
    options: [
      { key: 'A', text: 'Évident — pour le meilleur et pour le pire' },
      {
        key: 'B',
        text: 'Naturel, avec de l’aide extérieure pour tenir dans la durée',
      },
      { key: 'C', text: "Effrayant, mais j'essaierais" },
      { key: 'D', text: 'Je ne sais pas si j’en serais capable' },
    ],
  },

  // --- MODULE 9 : POUVOIR, EFFORT & CAPACITÉ À AIMER ---
  {
    id: 'M9_Q01',
    moduleNumber: 9,
    text: 'Dans votre couple idéal, qui prend les décisions importantes ?',
    options: [
      { key: 'A', text: 'On décide ensemble — égalité totale' },
      { key: 'B', text: 'Je prends naturellement le leadership' },
      {
        key: 'C',
        text: 'Mon partenaire prend souvent les décisions — ça me convient',
      },
      { key: 'D', text: 'Ça dépend du domaine — on a chacun nos zones' },
    ],
  },
  {
    id: 'M9_Q02',
    moduleNumber: 9,
    text: "Votre philosophie de l'effort en amour :",
    options: [
      {
        key: 'A',
        text: "L'amour vrai ne devrait pas demander d'effort — ça doit être naturel",
      },
      {
        key: 'B',
        text: "L'amour se construit — l'effort est une preuve d'amour",
      },
      { key: 'C', text: "L'effort doit être réciproque sinon je me retire" },
      {
        key: 'D',
        text: "Je donne beaucoup, mais j'attends la même chose en retour",
      },
    ],
  },
  {
    id: 'M9_Q03',
    moduleNumber: 9,
    text: 'Tenez-vous une comptabilité mentale de ce que vous donnez et de ce que vous recevez ?',
    options: [
      { key: 'A', text: 'Non — je donne librement sans compter' },
      { key: 'B', text: 'Parfois, surtout quand je me sens lésé(e)' },
      { key: 'C', text: "Oui — je surveille naturellement l'équilibre" },
      { key: 'D', text: "Oui — c'est une façon de me protéger" },
    ],
  },
  {
    id: 'M9_Q04',
    moduleNumber: 9,
    text: 'Quand vous ressentez de la frustration dans une relation :',
    options: [
      { key: 'A', text: "Je l'exprime clairement dès que possible" },
      { key: 'B', text: "J'attends le bon moment pour en parler" },
      { key: 'C', text: 'Je garde ça pour moi en espérant que ça passe' },
      { key: 'D', text: "Je laisse s'accumuler jusqu'à l'explosion" },
    ],
  },
  {
    id: 'M9_Q06',
    moduleNumber: 9,
    text: 'Votre rapport au sacrifice dans une relation :',
    options: [
      { key: 'A', text: "Je peux tout sacrifier pour la personne que j'aime" },
      {
        key: 'B',
        text: "Je peux faire des sacrifices importants si c'est réciproque",
      },
      {
        key: 'C',
        text: 'Les petits sacrifices oui, les grands non — je reste moi',
      },
      {
        key: 'D',
        text: "Je considère qu'une vraie relation ne demande pas de sacrifices",
      },
    ],
  },
  {
    id: 'M9_Q07',
    moduleNumber: 9,
    text: "Votre rapport à la tendresse et à l'affection physique hors sexualité :",
    options: [
      { key: 'A', text: "Essentielles — c'est mon langage principal d'amour" },
      {
        key: 'B',
        text: 'Importantes, mais je ne suis pas très démonstratif(ve)',
      },
      { key: 'C', text: 'Appréciées mais pas indispensables' },
      {
        key: 'D',
        text: "Je suis peu à l'aise avec le contact physique non sexuel",
      },
    ],
  },
  // V6 — contrôle de sincérité (sur le modèle des échelles de désirabilité
  // sociale) : être d'accord avec les deux affirmations signale un portrait
  // idéalisé. Jamais montré aux autres membres, jamais pénalisé.
  {
    id: 'M9_Q08',
    moduleNumber: 9,
    scale: 'accord',
    text: "Il ne m'est jamais arrivé d'être jaloux(se), même un tout petit peu.",
    options: AGREEMENT_OPTIONS,
  },
  {
    id: 'M9_Q09',
    moduleNumber: 9,
    scale: 'accord',
    text: "Je n'ai jamais dit le moindre petit mensonge.",
    options: AGREEMENT_OPTIONS,
  },
  // V6.1 — Habitudes de relation (croisées avec les signaux d'alerte de
  // l'autre) et caractère exigeant : bouderie, attente que l'autre devine
  // (« mindreading », Eidelson & Epstein), impatience. Jamais pénalisées
  // seules : seule la combinaison avec l'autre membre compte.
  {
    id: 'M9_Q10',
    moduleNumber: 9,
    scale: 'frequence',
    text: "Au début d'une relation, je dis très vite à l'autre qu'il ou elle est la personne de ma vie.",
    options: FREQUENCY_OPTIONS,
  },
  {
    id: 'M9_Q11',
    moduleNumber: 9,
    scale: 'frequence',
    text: "Quand j'ai un doute, je regarde le téléphone de l'autre ou je lui demande où il ou elle se trouve.",
    options: FREQUENCY_OPTIONS,
  },
  {
    id: 'M9_Q12',
    moduleNumber: 9,
    scale: 'frequence',
    text: "Quand une relation ne me convient plus, je préfère disparaître plutôt que m'expliquer.",
    options: FREQUENCY_OPTIONS,
  },
  {
    id: 'M9_Q13',
    moduleNumber: 9,
    scale: 'accord',
    text: 'Je préfère ne pas définir la relation trop tôt, pour garder mes options ouvertes.',
    options: AGREEMENT_OPTIONS,
  },
  {
    id: 'M9_Q14',
    moduleNumber: 9,
    scale: 'frequence',
    text: "Quand je parle de mes ex, c'est surtout pour dire ce qu'ils ou elles ont mal fait.",
    options: FREQUENCY_OPTIONS,
  },
  {
    id: 'M9_Q15',
    moduleNumber: 9,
    scale: 'frequence',
    text: 'Pendant un moment à deux, je consulte mon téléphone.',
    options: FREQUENCY_OPTIONS,
  },
  {
    id: 'M9_Q16',
    moduleNumber: 9,
    scale: 'frequence',
    text: "Quand je n'obtiens pas ce que je veux, je le fais sentir (bouderie, froideur).",
    options: FREQUENCY_OPTIONS,
  },
  {
    id: 'M9_Q17',
    moduleNumber: 9,
    scale: 'accord',
    text: "Dans un couple, j'attends que l'autre devine mes envies sans que j'aie à les dire.",
    options: AGREEMENT_OPTIONS,
  },
  {
    id: 'M9_Q18',
    moduleNumber: 9,
    scale: 'accord',
    text: "Quand j'ai envie de quelque chose, j'ai du mal à attendre.",
    options: AGREEMENT_OPTIONS,
  },
  {
    id: 'M9_Q19',
    moduleNumber: 9,
    text: "Face à un(e) partenaire qui boude quand il ou elle n'obtient pas ce qu'il ou elle veut :",
    options: [
      {
        key: 'A',
        text: 'Ça ne me dérange pas — je cède volontiers pour lui faire plaisir',
      },
      { key: 'B', text: 'Je laisse passer, puis on en parle calmement' },
      { key: 'C', text: "Ça m'agace vite — je ne cède pas" },
      { key: 'D', text: "C'est rédhibitoire pour moi" },
    ],
  },

  // --- MODULE 10 : ALCHIMIE, VIBE & DÉSIR (CLEF DE VOÛTE) ---
  {
    id: 'M10_Q01',
    moduleNumber: 10,
    text: 'Quand vous entrez dans une pièce, les gens ont tendance à :',
    options: [
      {
        key: 'A',
        text: 'Vous remarquer facilement — vous avez une présence naturelle',
      },
      {
        key: 'B',
        text: 'Vous remarquer progressivement au fil de la conversation',
      },
      { key: 'C', text: 'Se souvenir surtout de ce que vous avez dit' },
      { key: 'D', text: 'Avoir du mal à vous définir clairement après coup' },
    ],
  },
  {
    // V6 — question miroir rétablie depuis la V5 (Q02) : comparée à l'énergie que l'autre recherche (M10_Q03, mêmes clés).
    id: 'M10_Q02',
    moduleNumber: 10,
    text: "Mes amis proches me décriraient comme quelqu'un de :",
    options: [
      { key: 'A', text: 'Drôle, léger(ère) et agréable à vivre' },
      {
        key: 'B',
        text: 'Intense, profond(e) et stimulant(e) intellectuellement',
      },
      { key: 'C', text: 'Chaleureux(se), attentionné(e) et rassurant(e)' },
      { key: 'D', text: 'Calme, stable et fiable — un roc' },
    ],
  },
  {
    id: 'M10_Q03',
    moduleNumber: 10,
    text: "Quel type d'énergie recherchez-vous chez un(e) partenaire ?",
    options: [
      { key: 'A', text: "Quelqu'un de léger, drôle et qui me fait rire" },
      {
        key: 'B',
        text: "Quelqu'un d'intense, profond et stimulant intellectuellement",
      },
      { key: 'C', text: "Quelqu'un de chaleureux, stable et rassurant" },
      {
        key: 'D',
        text: "Quelqu'un de calme, posé et qui équilibre mon énergie",
      },
    ],
  },
  {
    id: 'M10_Q04',
    moduleNumber: 10,
    text: 'Vous faites rire facilement les gens autour de vous ?',
    options: [
      { key: 'A', text: "Oui — l'humour est une de mes forces naturelles" },
      {
        key: 'B',
        text: "Souvent — j'ai le sens de l'humour, sans chercher à me donner en spectacle",
      },
      { key: 'C', text: 'Parfois — surtout avec les gens que je connais bien' },
      {
        key: 'D',
        text: "Rarement — je suis plus sérieux(se) dans ma façon d'être",
      },
    ],
  },
  {
    id: 'M10_Q06',
    moduleNumber: 10,
    text: "L'attirance dans une relation, pour vous, naît principalement de :",
    options: [
      {
        key: 'A',
        text: 'La connexion intellectuelle et les conversations stimulantes',
      },
      { key: 'B', text: 'La complicité et le rire partagé' },
      { key: 'C', text: "La présence physique et l'énergie du corps" },
      {
        key: 'D',
        text: "Le sentiment d'être compris(e) profondément et accepté(e)",
      },
    ],
  },
  {
    id: 'M10_Q09',
    moduleNumber: 10,
    text: 'Ce que vous apportez de vraiment unique dans une relation :',
    options: [
      {
        key: 'A',
        text: "Ma joie de vivre et ma légèreté — avec moi, on s'amuse",
      },
      {
        key: 'B',
        text: "Ma profondeur et mon écoute — je fais vraiment sentir l'autre compris(e)",
      },
      { key: 'C', text: 'Ma stabilité et ma fiabilité — je suis toujours là' },
      {
        key: 'D',
        text: "Ma créativité et mon goût pour le beau et l'insolite",
      },
    ],
  },
  {
    id: 'M10_Q10',
    moduleNumber: 10,
    text: "Si vous deviez résumer en un mot l'expérience que vous voulez offrir à votre partenaire :",
    options: [
      { key: 'A', text: 'Sécurité' },
      { key: 'B', text: 'Aventure' },
      { key: 'C', text: 'Profondeur' },
      { key: 'D', text: 'Joie' },
    ],
  },
  // V6.1 — Attirance physique, sans critère de corps : les préférences
  // idéales déclarées prédisent mal l'attirance réelle (Eastwick & Finkel,
  // 2008), alors que les partenaires passés d'une même personne se
  // ressemblent (Park & MacDonald, 2019). On demande donc ce qui a déjà fait
  // chavirer, croisé avec ce que l'autre dégage.
  {
    id: 'M10_Q11',
    moduleNumber: 10,
    text: "Repensez aux personnes qui vous ont fait chavirer rapidement. Qu'avaient-elles surtout en commun dans leur allure ?",
    options: [
      { key: 'A', text: 'Une allure élégante et soignée' },
      { key: 'B', text: 'Un style naturel et décontracté' },
      { key: 'C', text: 'Une allure sportive et énergique' },
      { key: 'D', text: 'Un style original, artistique, atypique' },
      { key: 'E', text: 'Une allure ancrée dans sa culture (tenues, codes)' },
      { key: 'F', text: 'Rien de commun : je suis surpris(e) à chaque fois' },
    ],
  },
  {
    id: 'M10_Q12',
    moduleNumber: 10,
    text: 'Votre propre allure, au quotidien :',
    options: [
      { key: 'A', text: 'Élégante et soignée' },
      { key: 'B', text: 'Naturelle et décontractée' },
      { key: 'C', text: 'Sportive et énergique' },
      { key: 'D', text: 'Originale, artistique, atypique' },
      { key: 'E', text: 'Ancrée dans ma culture (tenues, codes)' },
      { key: 'F', text: "Je n'y prête pas vraiment attention" },
    ],
  },
  {
    id: 'M10_Q13',
    moduleNumber: 10,
    text: 'Chez quelqu’un, ce qui provoque le déclic en premier :',
    options: [
      { key: 'A', text: 'Le regard et le sourire' },
      { key: 'B', text: 'La voix et la façon de parler' },
      { key: 'C', text: "L'allure et la prestance" },
      { key: 'D', text: "L'assurance, le charisme" },
      { key: 'E', text: 'La gentillesse envers les autres' },
      { key: 'F', text: "L'humour et la répartie" },
    ],
  },
  {
    id: 'M10_Q14',
    moduleNumber: 10,
    text: 'Ce que les gens remarquent en premier chez vous :',
    options: [
      { key: 'A', text: 'Mon regard et mon sourire' },
      { key: 'B', text: 'Ma voix et ma façon de parler' },
      { key: 'C', text: 'Mon allure et ma prestance' },
      { key: 'D', text: 'Mon assurance, mon charisme' },
      { key: 'E', text: 'Ma gentillesse envers les autres' },
      { key: 'F', text: 'Mon humour et ma répartie' },
    ],
  },
  {
    id: 'M10_Q15',
    moduleNumber: 10,
    text: "Pour qu'une histoire commence, l'attirance physique doit être :",
    options: [
      {
        key: 'A',
        text: 'Immédiate — sans coup de cœur au premier regard, ça ne marchera pas',
      },
      {
        key: 'B',
        text: 'Présente, et elle grandit en apprenant à se connaître',
      },
      { key: 'C', text: 'Secondaire — elle naît de la connexion' },
      { key: 'D', text: 'Ça dépend vraiment des personnes' },
    ],
  },
];

/**
 * Évolutions du questionnaire V6 par rapport au Grand Entretien précédent :
 * question nouvelle, rétablie depuis le questionnaire V5, ou reformulée (les
 * clés de réponse gardent leur sens). Sert aux documents et aux tests.
 */
export const V6_CHANGES: Record<
  string,
  'nouvelle' | 'retablie' | 'reformulee'
> = {
  M0_Q10: 'nouvelle',
  M1_Q09: 'retablie',
  M1_Q13: 'retablie',
  M1_Q15: 'retablie',
  M2_Q05: 'retablie',
  M2_Q07: 'retablie',
  M2_Q10: 'reformulee',
  M2_Q11: 'nouvelle',
  M2_Q12: 'nouvelle',
  M2_Q13: 'nouvelle',
  M2_Q14: 'nouvelle',
  M2_Q15: 'nouvelle',
  M2_Q16: 'nouvelle',
  M2_Q17: 'nouvelle',
  M2_Q18: 'nouvelle',
  M3_Q07: 'retablie',
  M3_Q10: 'reformulee',
  M4_Q07: 'retablie',
  M6_Q02: 'retablie',
  M6_Q04: 'retablie',
  M6_Q05: 'retablie',
  M6_Q08: 'retablie',
  M6_Q12: 'nouvelle',
  M6_Q13: 'nouvelle',
  M6_Q14: 'nouvelle',
  M6_Q15: 'nouvelle',
  M7_Q09: 'nouvelle',
  M7_Q10: 'nouvelle',
  M7_Q11: 'nouvelle',
  M7_Q12: 'nouvelle',
  M7_Q13: 'nouvelle',
  M7_Q14: 'nouvelle',
  M7_Q15: 'nouvelle',
  M7_Q16: 'nouvelle',
  M7_Q17: 'nouvelle',
  M7_Q18: 'nouvelle',
  M8_Q06: 'retablie',
  M9_Q08: 'nouvelle',
  M9_Q09: 'nouvelle',
  M10_Q02: 'retablie',
  M2_Q19: 'nouvelle',
  M2_Q20: 'nouvelle',
  M2_Q21: 'nouvelle',
  M4_Q10: 'nouvelle',
  M4_Q11: 'nouvelle',
  M4_Q12: 'nouvelle',
  M4_Q13: 'nouvelle',
  M8_Q10: 'nouvelle',
  M8_Q11: 'nouvelle',
  M9_Q10: 'nouvelle',
  M9_Q11: 'nouvelle',
  M9_Q12: 'nouvelle',
  M9_Q13: 'nouvelle',
  M9_Q14: 'nouvelle',
  M9_Q15: 'nouvelle',
  M9_Q16: 'nouvelle',
  M9_Q17: 'nouvelle',
  M9_Q18: 'nouvelle',
  M9_Q19: 'nouvelle',
  M10_Q11: 'nouvelle',
  M10_Q12: 'nouvelle',
  M10_Q13: 'nouvelle',
  M10_Q14: 'nouvelle',
  M10_Q15: 'nouvelle',
};

/** Questions ajoutées en V6.1 (argent, attirance, signaux d'alerte, caprices, timidité). */
export const V61_ADDED = new Set([
  'M2_Q19',
  'M2_Q20',
  'M2_Q21',
  'M4_Q10',
  'M4_Q11',
  'M4_Q12',
  'M4_Q13',
  'M8_Q10',
  'M8_Q11',
  'M9_Q10',
  'M9_Q11',
  'M9_Q12',
  'M9_Q13',
  'M9_Q14',
  'M9_Q15',
  'M9_Q16',
  'M9_Q17',
  'M9_Q18',
  'M9_Q19',
  'M10_Q11',
  'M10_Q12',
  'M10_Q13',
  'M10_Q14',
  'M10_Q15',
]);

/** Questions ajoutées en V6 (nouvelles ou rétablies), absentes des entretiens antérieurs. */
export const V6_ADDED = new Set(
  Object.entries(V6_CHANGES)
    .filter(([, change]) => change !== 'reformulee')
    .map(([id]) => id),
);
