/**
 * Grand Entretien V8.2 — relecture éditoriale (clarté, langue, traduction).
 *
 * Le fichier `questions.v82.generated.ts` est généré à partir du modèle
 * validé (model.py) et ne se modifie pas à la main : les corrections de
 * libellés sont donc appliquées ici, par-dessus, au moment de l'assemblage
 * (`questions.v82.ts`). Les questions V7 reprises (M9_Q07, M10_Q15…) ne sont
 * corrigées que dans la V8.2 : la V7.1 reste inchangée.
 *
 * Règles : aucun identifiant, aucune clé de réponse, aucun nombre d'options et
 * aucun ordre ne change ; le sens validé est conservé. Les réponses étant
 * stockées par clé, un entretien commencé ou terminé reste lisible.
 * Les items du Mini-IPIP (V82_M7_*) et les échelles d'accord, de fréquence et
 * d'exactitude ne sont pas modifiés. Détail et raisons :
 * docs/CLARTE_GRAND_ENTRETIEN.md.
 */
import type { V82QuestionData, V82Translation } from './questions.v82';

export interface V82Correction {
  text?: string;
  options?: Record<string, string>;
  assistance?: string;
}

/** Corrections françaises (identifiant → libellés corrigés). */
export const V82_CLARITY_FR: Record<string, V82Correction> = {
  V82_M0_02: {
    text: "Et quelle tranche d'âge seriez-vous réellement prêt(e) à accepter, en incluant votre tranche idéale ?",
  },
  M0_Q02: {
    options: {
      C: 'Tout mon pays (national)',
      D: 'International (sans frontières)',
    },
  },
  M0_Q04: {
    options: {
      C: 'Veuf / veuve',
      D: 'En transition : séparation ou divorce en cours',
    },
  },
  V82_M8_01: {
    options: {
      D: 'Faire connaissance, sans décider tout de suite de la forme de la relation',
    },
  },
  V82_M8_02: {
    text: 'Si la relation se construit bien, dans quel délai souhaiteriez-vous un engagement officiel ?',
  },
  M8_Q16: {
    text: 'Pour vous, quelles cérémonies sont indispensables à un mariage ? (plusieurs réponses possibles)',
  },
  M0_Q11: {
    options: {
      D: 'Acceptable si le tabac reste hors de la maison et loin des enfants',
    },
  },
  M0_Q12: {
    options: { B: 'Seulement en certaines occasions (fêtes, repas)' },
  },
  M0_Q13: {
    options: {
      A: "Je ne pourrais pas vivre avec, même si c'est occasionnel",
      D: "Acceptable avec modération, sans jamais d'ivresse",
    },
  },
  M0_Q15: {
    text: "Vous-même, jouez-vous à des jeux d'argent (paris sportifs, casino, loterie) ?",
  },
  V82_M1_02: {
    options: {
      B: 'Oui, mais une différence de convictions reste compatible avec ma vision',
    },
  },
  M1_Q18: {
    text: 'Si la personne que vous aimez ne partageait pas votre religion ou vos convictions :',
  },
  V82_M1_04: {
    text: 'Si vos familles s’opposaient à votre union pour des raisons culturelles ou religieuses, quelle place donneriez-vous à leur avis dans votre décision ?',
  },
  M8_Q10: {
    text: 'Parmi ces signaux, lesquels vous feraient fuir rapidement ? (trois au plus)',
  },
  M8_Q12: {
    text: 'Parmi ces sujets, lesquels sont pour vous non négociables, au point qu’un désaccord vous ferait renoncer à la relation ? (trois au plus)',
  },
  V82_M10_01: {
    text: 'Qu’est-ce qui vous fait le plus souvent ressentir une proximité naissante avec quelqu’un ?',
  },
  V82_M10_02: {
    options: {
      A: 'Des échanges écrits d’abord, puis une conversation de vive voix',
      B: 'Une conversation de vive voix assez vite',
    },
  },
  V82_M3_02: {
    text: 'Aujourd’hui, quel lien gardez-vous avec votre dernier ou dernière partenaire ?',
  },
  V82_M6_03: {
    text: "Quand je me sens blessé(e), il m'arrive d'être ironique ou moqueur(euse).",
  },
  V82_M9_01: {
    text: 'Face à une décision importante sur laquelle vous n’êtes pas d’accord tous les deux, comment préférez-vous procéder ?',
  },
  M9_Q07: {
    options: {
      A: "Essentielles — c'est mon principal langage d'amour",
      B: 'Importantes, mais je ne suis pas très démonstratif(ive)',
    },
  },
  V82_M4_02: {
    text: 'Si votre partenaire se retrouvait sans emploi pendant plusieurs mois, tout en cherchant activement du travail, comment le vivriez-vous ?',
  },
  V82_M4_04: {
    text: 'Si, avant de vivre ensemble, vous découvriez que votre partenaire a un crédit important, quelle réaction serait la plus proche de la vôtre ?',
  },
  V82_M4_06: {
    options: {
      A: 'Je réduirais volontiers mon train de vie si nous étions d’accord',
    },
  },
};

/** Corrections anglaises (même forme). */
export const V82_CLARITY_EN: Record<string, V82Correction> = {
  V82_M0_02: {
    text: 'And what age range would you genuinely accept, including your ideal range?',
  },
  M0_Q10: {
    text: 'Which languages are you comfortable using in a day-to-day relationship? (select all that apply)',
  },
  V82_M0_03: {
    text: 'Do you have children? If so, where do they mostly live? (select all that apply)',
  },
  M0_Q14: {
    options: {
      A: 'I’m completely fine with it',
      B: 'I’m fine with it, as long as they don’t live with us full-time',
    },
  },
  M3_Q04: {
    text: 'In a blended family, the step-parent’s role with their partner’s children:',
    options: {
      A: 'A full parent, treating all the children the same',
      B: 'An affectionate role, with each parent keeping their own role with their children',
      D: 'A role that develops with time and trust',
    },
  },
  V82_M8_01: {
    options: {
      D: 'Getting to know someone, without deciding yet what form the relationship will take',
    },
  },
  M8_Q16: {
    text: 'For you, which ceremonies are essential to a marriage? (select all that apply)',
  },
  M0_Q11: {
    text: 'A partner who smokes:',
    options: {
      B: 'Acceptable if it’s only occasional',
      D: 'Acceptable if they never smoke at home or around children',
    },
  },
  M0_Q12: {
    options: { B: 'Only on certain occasions (celebrations, meals)' },
  },
  M0_Q13: {
    text: 'A partner who drinks alcohol:',
    options: {
      B: 'Acceptable if it’s only occasional',
      D: 'Acceptable in moderation, never to the point of getting drunk',
    },
  },
  M0_Q15: {
    text: 'Do you gamble yourself (sports betting, casino, lottery)?',
  },
  M0_Q16: {
    text: 'A partner who gambles (sports betting, casino, lottery):',
  },
  V82_M1_01: {
    text: 'Which cultures, family languages or traditions matter to your identity? (up to two, optional)',
  },
  M1_Q16: {
    options: { C: 'Christian: another church' },
  },
  V82_M1_02: {
    options: {
      B: 'Yes, but a difference in beliefs is still compatible with my outlook',
    },
  },
  M1_Q19: {
    options: { F: 'No rules: I eat anything' },
  },
  V82_M1_03: {
    text: "What role would you like each partner's traditions to play in your future home?",
  },
  V82_M1_04: {
    text: 'If your families opposed your relationship for cultural or religious reasons, how much weight would you give their opinion in your decision?',
  },
  M4_Q17: {
    options: {
      D: 'I don’t subscribe to it, even if my partner cares about it',
    },
  },
  M1_Q20: {
    options: {
      C: 'Something I could consider if everyone consents, within a religious or customary framework',
    },
  },
  M6_Q19: {
    text: 'In your view, which of these behaviours by your partner would already count as infidelity? (select all that apply)',
  },
  V82_M8_04: {
    options: {
      A: 'Firm, consistent rules, with the reasons explained',
      C: 'Plenty of independence within safe limits',
    },
  },
  M8_Q18: {
    options: { B: 'In the religion of one of us, chosen together' },
  },
  M8_Q10: {
    text: 'Which of these warning signs would make you walk away quickly? (up to 3)',
    options: {
      D: 'Staying vague about their intentions: “we’ll see”, no commitment',
      J: 'Being glued to their phone during time together',
    },
  },
  M8_Q12: {
    text: 'Which of these topics are non-negotiable for you, to the point that a disagreement would make you end the relationship? (up to 3)',
    options: { F: 'The role of family in the relationship' },
  },
  V82_M8_06: {
    text: 'If, after several years, your relationship went through a long, difficult period, with no violence or danger for anyone, what would your attitude be?',
    options: {
      D: 'I would leave fairly quickly: staying only out of obligation makes no sense to me',
    },
  },
  M6_Q05: {
    options: {
      B: 'Serious, but I can forgive it once',
      D: 'I try to let it go if it doesn’t keep happening',
    },
  },
  V82_M9_01: {
    text: 'When you and your partner disagree on an important decision, how do you prefer to proceed?',
  },
  M5_Q08: {
    options: {
      A: 'Total transparency — we each have access to everything',
      B: 'We each keep our phone private',
    },
  },
  V82_M9_05: {
    options: { A: "I'd like that, if we both agree to it" },
  },
  M9_Q07: {
    text: 'Your attitude to tenderness and non-sexual physical affection:',
  },
  M10_Q19: {
    options: {
      A: 'I simply say so, and we find another moment of tenderness',
    },
  },
  M10_Q15: {
    text: 'For a relationship to begin, physical attraction has to be:',
    options: { B: 'Present, and it grows as we get to know each other' },
  },
  V82_M4_02: {
    text: 'If your partner were out of work for several months while actively looking for a job, how would you handle it?',
  },
  M4_Q16: {
    text: 'Supporting your family financially (parents, brothers and sisters…) once you are in a relationship:',
  },
  V82_M4_03: {
    options: {
      C: 'Regularly, with a small share of my income',
      D: 'Regularly, with a large share of my income',
    },
  },
  V82_M4_04: {
    text: 'If, before moving in together, you found out that your partner had a large loan, which reaction would be closest to yours?',
  },
  V82_M4_06: {
    options: {
      A: 'I would gladly cut back if we agreed',
      B: 'I would accept, with a budget and a date to review the situation',
    },
  },
  V82_M5_03: {
    options: {
      A: 'I would gladly welcome them, even with no end date',
      D: 'I don’t want anyone living with us long-term',
    },
  },
};

/** Question française corrigée (mêmes clés, même ordre, mêmes attributs). */
export function withClarityFr<Q extends V82QuestionData>(q: Q): Q {
  const c = V82_CLARITY_FR[q.id];
  if (!c) return q;
  return {
    ...q,
    ...(c.text ? { text: c.text } : {}),
    ...(c.assistance ? { assistance: c.assistance } : {}),
    options: q.options.map((o) =>
      c.options?.[o.key] ? { ...o, text: c.options[o.key] } : o,
    ),
  };
}

/** Traduction anglaise corrigée (mêmes clés). */
export function withClarityEn(id: string, t: V82Translation): V82Translation {
  const c = V82_CLARITY_EN[id];
  if (!c) return t;
  return {
    ...t,
    ...(c.text ? { text: c.text } : {}),
    ...(c.assistance ? { assistance: c.assistance } : {}),
    options: Object.fromEntries(
      Object.entries(t.options).map(([k, v]) => [k, c.options?.[k] ?? v]),
    ),
  };
}
