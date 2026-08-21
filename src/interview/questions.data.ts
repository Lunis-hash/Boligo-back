export interface QuestionOption {
  key: string;
  text: string;
}

export interface QuestionRules {
  maxAge?: number;
  minAge?: number;
  gender?: 'H' | 'F';
  dependsOn?: {
    questionId: string;
    values: string[];
  };
}

export interface Question {
  id: string;
  moduleNumber: number;
  text: string;
  options: QuestionOption[];
  rules?: QuestionRules;
}

export function decodeUserResponses(responses: Array<{ moduleName?: string; rawResponses: Record<string, string> }>): Array<{ moduleName: string; qna: Array<{ question: string; answer: string }> }> {
  const questionMap = new Map<string, Question>();
  QUESTIONS.forEach((q) => questionMap.set(q.id, q));

  return responses.map((r, idx) => {
    const raw = r.rawResponses || {};
    const qna: Array<{ question: string; answer: string }> = [];

    for (const [qId, optionKey] of Object.entries(raw)) {
      const qObj = questionMap.get(qId);
      if (qObj) {
        const optObj = qObj.options.find((o) => o.key === optionKey);
        const answerText = optObj ? optObj.text : String(optionKey);
        qna.push({
          question: qObj.text,
          answer: answerText,
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
      { key: 'B', text: 'Partenaire plus jeune' },
      { key: 'C', text: 'Partenaire plus âgé(e)' },
      { key: 'D', text: "L'âge ne m'importe pas" },
    ],
  },
  {
    id: 'M0_Q03',
    moduleNumber: 0,
    text: 'Êtes-vous prêt(e) à déménager pour votre partenaire ?',
    options: [
      { key: 'A', text: 'Oui, sans condition' },
      { key: 'B', text: 'Oui si le projet de vie est solide' },
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
      { key: 'D', text: 'Oui mais ils sont autonomes (18+)' },
    ],
  },
  {
    id: 'M0_Q06',
    moduleNumber: 0,
    text: 'Souhaitez-vous des enfants à l\'avenir ?',
    options: [
      { key: 'A', text: 'Oui, absolument' },
      { key: 'B', text: 'Oui si les conditions sont réunies' },
      { key: 'C', text: 'Je ne suis pas certain(e)' },
      { key: 'D', text: "Non, c'est définitif" },
    ],
    rules: { maxAge: 55 }, // 🎯 Désactivée si 55+ ans
  },
  {
    id: 'M0_Q07',
    moduleNumber: 0,
    text: 'Votre niveau d\'études :',
    options: [
      { key: 'A', text: 'Sans diplôme / CAP-BEP' },
      { key: 'B', text: 'Baccalauréat' },
      { key: 'C', text: 'Bac +2 à Bac +4' },
      { key: 'D', text: 'Bac +5 et plus' },
    ],
  },

  // --- MODULE 1 : IDENTITÉ & CULTURE ---
  {
    id: 'M1_Q01',
    moduleNumber: 1,
    text: 'Votre continent d\'origine ou de référence culturelle :',
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
      { key: 'D', text: 'Je n\'ai pas de préférence' },
    ],
  },
  {
    id: 'M1_Q03',
    moduleNumber: 1,
    text: 'Quelle place accordez-vous aux traditions de mariage dans votre culture ?',
    options: [
      { key: 'A', text: 'Centrale — je les respecterai toutes (dot, zaffa, feu sacré, lazo…)' },
      { key: 'B', text: 'Importante — j\'en garderai les principales' },
      { key: 'C', text: 'Modérée — j\'en choisirai quelques-unes' },
      { key: 'D', text: 'Peu importante — je privilégie le symbolisme personnel' },
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
      { key: 'C', text: 'Oui — mais je suis ouvert(e) à d\'autres croyances' },
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
      { key: 'D', text: 'Peu importe du moment qu\'on se comprend' },
    ],
  },
  {
    id: 'M1_Q10',
    moduleNumber: 1,
    text: 'Le rôle des anciens et patriarches dans vos décisions de couple :',
    options: [
      { key: 'A', text: 'Fondamental — je ne décide pas sans leur avis' },
      { key: 'B', text: 'Important mais la décision finale nous appartient' },
      { key: 'C', text: 'Je les consulte par respect, pas par obligation' },
      { key: 'D', text: 'Nos décisions ne concernent que notre couple' },
    ],
  },

  // --- MODULE 2 : ATTACHEMENT & RÉGULATION ÉMOTIONNELLE ---
  {
    id: 'M2_Q01',
    moduleNumber: 2,
    text: 'Quand votre partenaire ne répond pas à vos messages pendant plusieurs heures :',
    options: [
      { key: 'A', text: 'Je suppose qu\'il/elle est occupé(e) et je patiente sereinement' },
      { key: 'B', text: 'Je commence à m\'inquiéter légèrement' },
      { key: 'C', text: 'Je lui renvoie un message pour vérifier' },
      { key: 'D', text: 'Je ressens de l\'angoisse ou de la colère intérieure' },
    ],
  },
  {
    id: 'M2_Q02',
    moduleNumber: 2,
    text: 'Quand votre partenaire demande plus de proximité que vous n\'en souhaitez :',
    options: [
      { key: 'A', text: 'J\'essaie de m\'adapter même si ça me coûte' },
      { key: 'B', text: 'J\'explique calmement mon besoin d\'espace' },
      { key: 'C', text: 'Je me sens envahi(e) et prends mes distances' },
      { key: 'D', text: 'J\'ignore la demande et change de sujet' },
    ],
  },
  {
    id: 'M2_Q03',
    moduleNumber: 2,
    text: 'Dans une relation, ce dont vous avez le plus besoin :',
    options: [
      { key: 'A', text: 'Me sentir en sécurité et aimé(e) inconditionnellement' },
      { key: 'B', text: 'Conserver mon autonomie et mon espace personnel' },
      { key: 'C', text: 'Un équilibre entre intimité et liberté' },
      { key: 'D', text: 'Je n\'ai pas encore identifié clairement mon besoin' },
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
    id: 'M2_Q06',
    moduleNumber: 2,
    text: 'Quand je suis en colère dans une relation, j\'ai tendance à :',
    options: [
      { key: 'A', text: 'Exprimer ma colère clairement et directement' },
      { key: 'B', text: 'Prendre du recul avant d\'en parler' },
      { key: 'C', text: 'Garder ça pour moi jusqu\'à ce que ça explose' },
      { key: 'D', text: 'Couper le contact temporairement (silence punitif)' },
    ],
  },
  {
    id: 'M2_Q08',
    moduleNumber: 2,
    text: 'Êtes-vous capable de vous excuser en premier, même si vous pensez avoir raison ?',
    options: [
      { key: 'A', text: 'Oui — l\'harmonie passe avant mon ego' },
      { key: 'B', text: 'Oui si je réalise avoir commis une erreur' },
      { key: 'C', text: 'Difficilement — mon ego résiste' },
      { key: 'D', text: 'Non — je n\'ai pas à m\'excluser si j\'avais raison' },
    ],
  },
  {
    id: 'M2_Q10',
    moduleNumber: 2,
    text: 'Avez-vous suivi un accompagnement psychologique ?',
    options: [
      { key: 'A', text: 'Oui, régulièrement — c\'est un pilier de ma vie' },
      { key: 'B', text: 'Oui, ponctuellement après une crise' },
      { key: 'C', text: 'Non mais je suis ouvert(e)' },
      { key: 'D', text: 'Non — je préfère gérer seul(e)' },
    ],
  },

  // --- MODULE 3 : VÉCU & CONTEXTE ---
  {
    id: 'M3_Q01',
    moduleNumber: 3,
    text: 'La leçon principale de vos relations passées :',
    options: [
      { key: 'A', text: 'Mieux communiquer mes besoins dès le départ' },
      { key: 'B', text: 'L\'importance de la compatibilité des valeurs' },
      { key: 'C', text: 'Poser mes limites sans culpabilité' },
      { key: 'D', text: 'Choisir avec la tête autant qu\'avec le cœur' },
    ],
  },
  {
    id: 'M3_Q02',
    moduleNumber: 3,
    text: 'La cause principale de votre dernière rupture :',
    options: [
      { key: 'A', text: 'Incompatibilité de valeurs ou de projet de vie' },
      { key: 'B', text: 'Manque de communication profond' },
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
      { key: 'A', text: 'Très difficilement — je m\'en remets encore' },
      { key: 'B', text: 'Douloureusement mais je me suis reconstruit(e)' },
      { key: 'C', text: 'Relativement bien — décision mutuelle' },
      { key: 'D', text: 'C\'est moi qui ai décidé — je me sens libéré(e)' },
    ],
  },
  {
    id: 'M3_Q04',
    moduleNumber: 3,
    text: 'Votre vision de la famille recomposée :',
    options: [
      { key: 'A', text: 'Mon enfant c\'est ton enfant — intégration totale' },
      { key: 'B', text: 'On s\'aime mais les rôles parentaux restent définis' },
      { key: 'C', text: 'Mon partenaire est présent sans autorité parentale directe' },
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
    id: 'M3_Q08',
    moduleNumber: 3,
    text: 'Avez-vous vécu une situation de violence dans une relation passée ?',
    options: [
      { key: 'A', text: 'Oui — j\'en ai été victime et j\'ai travaillé là-dessus' },
      { key: 'B', text: 'Oui — j\'en ai été témoin dans ma famille' },
      { key: 'C', text: 'Non, jamais' },
      { key: 'D', text: 'Je préfère ne pas répondre' },
    ],
  },
  {
    id: 'M3_Q10',
    moduleNumber: 3,
    text: 'Avez-vous déjà reproduit les mêmes schémas dans plusieurs relations ?',
    options: [
      { key: 'A', text: 'Oui et j\'ai travaillé là-dessus en thérapie' },
      { key: 'B', text: 'Oui, je le vois mais j\'ai du mal à changer' },
      { key: 'C', text: 'Je ne sais pas vraiment' },
      { key: 'D', text: 'Non — chaque relation est différente pour moi' },
    ],
  },

  // --- MODULE 4 : VISION ÉCONOMIQUE ---
  {
    id: 'M4_Q01',
    moduleNumber: 4,
    text: 'Votre rapport à l\'argent dans un couple :',
    options: [
      { key: 'A', text: 'Tout en commun — un seul pot partagé' },
      { key: 'B', text: 'Contribution proportionnelle aux revenus' },
      { key: 'C', text: 'Chacun ses dépenses + charges communes partagées' },
      { key: 'D', text: 'L\'argent reste une affaire individuelle' },
    ],
  },
  {
    id: 'M4_Q03',
    moduleNumber: 4,
    text: 'Votre vision du rôle économique de l\'homme :',
    options: [
      { key: 'A', text: 'Il est le pourvoyeur principal — c\'est sa responsabilité' },
      { key: 'B', text: 'Il contribue sans que ce soit une obligation absolue' },
      { key: 'C', text: 'L\'égalité est la norme — on partage tout' },
      { key: 'D', text: 'Son rôle dépend de la situation de chacun' },
    ],
  },
  {
    id: 'M4_Q04',
    moduleNumber: 4,
    text: 'Votre vision du rôle économique de la femme :',
    options: [
      { key: 'A', text: 'Elle gère le foyer et l\'éducation — c\'est sa priorité' },
      { key: 'B', text: 'Elle travaille mais la maison reste sa responsabilité principale' },
      { key: 'C', text: 'Elle est autonome financièrement et contribue au foyer' },
      { key: 'D', text: 'Elle fait ce qu\'elle souhaite — aucun rôle imposé' },
    ],
  },
  {
    id: 'M4_Q05',
    moduleNumber: 4,
    text: 'Votre rapport aux envois d\'argent à la famille élargie :',
    options: [
      { key: 'A', text: 'C\'est normal et régulier — ma famille compte sur moi' },
      { key: 'B', text: 'Ça se discute en couple avant toute décision' },
      { key: 'C', text: 'C\'est mon argent — c\'est mon affaire' },
      { key: 'D', text: 'Ça doit être limité pour préserver notre foyer' },
    ],
    rules: {
      dependsOn: { questionId: 'M1_Q01', values: ['A', 'B', 'D'] }, // Afrique, Maghreb, Asie
    },
  },
  {
    id: 'M4_Q06',
    moduleNumber: 4,
    text: 'L\'achat immobilier dans votre projet de vie :',
    options: [
      { key: 'A', text: 'Seul(e) — c\'est mon indépendance' },
      { key: 'B', text: 'À deux — c\'est un projet commun' },
      { key: 'C', text: 'Location flexible pour l\'instant' },
      { key: 'D', text: 'Pas une priorité' },
    ],
  },
  {
    id: 'M4_Q08',
    moduleNumber: 4,
    text: 'Votre rapport à l\'épargne dans le couple :',
    options: [
      { key: 'A', text: 'On épargne ensemble pour des projets communs' },
      { key: 'B', text: 'Chacun épargne de son côté' },
      { key: 'C', text: 'Épargne commune + épargne personnelle' },
      { key: 'D', text: 'Je ne suis pas à l\'aise pour épargner ensemble' },
    ],
  },

  // --- MODULE 5 : DYNAMIQUE SOCIALE & FAMILIALE ---
  {
    id: 'M5_Q01',
    moduleNumber: 5,
    text: 'La place de votre famille dans vos décisions de couple :',
    options: [
      { key: 'A', text: 'Centrale — je ne décide pas sans leur avis' },
      { key: 'B', text: 'Importante mais la décision finale nous appartient' },
      { key: 'C', text: 'Je les consulte par respect, pas par obligation' },
      { key: 'D', text: 'Nos décisions ne concernent que notre couple' },
    ],
  },
  {
    id: 'M5_Q02',
    moduleNumber: 5,
    text: 'Votre mère (ou père) manque de respect à votre partenaire. Vous :',
    options: [
      { key: 'A', text: 'Défendez votre partenaire immédiatement et clairement' },
      { key: 'B', text: 'Cherchez à comprendre avant d\'agir' },
      { key: 'C', text: 'Attendez que ça se règle naturellement' },
      { key: 'D', text: 'Dites à votre partenaire de ne pas trop prendre à cœur' },
    ],
  },
  {
    id: 'M5_Q03',
    moduleNumber: 5,
    text: 'La cohabitation avec la belle-famille :',
    options: [
      { key: 'A', text: 'J\'accepte si c\'est temporaire et avec des règles claires' },
      { key: 'B', text: 'Je n\'accepte pas — notre foyer nous appartient' },
      { key: 'C', text: 'C\'est normal dans ma culture — c\'est attendu' },
      { key: 'D', text: 'J\'accepte si mon partenaire est d\'accord' },
    ],
  },
  {
    id: 'M5_Q04',
    moduleNumber: 5,
    text: 'Avez-vous des amis proches du sexe opposé ?',
    options: [
      { key: 'A', text: 'Oui — c\'est non-négociable pour moi' },
      { key: 'B', text: 'Oui — mais je suis transparent(e) à ce sujet' },
      { key: 'C', text: 'J\'évite par respect pour mon partenaire' },
      { key: 'D', text: 'Non, je préfère ne pas en avoir' },
    ],
  },
  {
    id: 'M5_Q05',
    moduleNumber: 5,
    text: 'Les réseaux sociaux et votre vie de couple :',
    options: [
      { key: 'A', text: 'Je publie notre vie — j\'aime partager notre bonheur' },
      { key: 'B', text: 'Je protège notre intimité — peu ou pas de publications' },
      { key: 'C', text: 'Chacun gère son compte librement' },
      { key: 'D', text: 'Les réseaux n\'ont pas de place dans notre vie de couple' },
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

  // --- MODULE 6 : QUOTIDIEN, COMMUNICATION RÉELLE & LIMITES ---
  {
    id: 'M6_Q01',
    moduleNumber: 6,
    text: 'Lors d\'une dispute, votre comportement concret est plutôt :',
    options: [
      { key: 'A', text: 'Parler même si c\'est difficile — je confronte directement' },
      { key: 'B', text: 'Prendre du recul et revenir calme' },
      { key: 'C', text: 'Couper la conversation et partir' },
      { key: 'D', text: 'Me murer dans le silence — parfois des jours' },
    ],
  },
  {
    id: 'M6_Q03',
    moduleNumber: 6,
    text: 'Avez-vous besoin de gagner le débat ou d\'avoir le dernier mot ?',
    options: [
      { key: 'A', text: 'Non — résoudre m\'importe plus que gagner' },
      { key: 'B', text: 'Parfois je m\'emporte mais je m\'en rends compte' },
      { key: 'C', text: 'Souvent oui — c\'est plus fort que moi' },
      { key: 'D', text: 'Oui — et j\'assume totalement' },
    ],
  },
  {
    id: 'M6_Q06',
    moduleNumber: 6,
    text: 'Votre rapport à la sexualité dans le couple :',
    options: [
      { key: 'A', text: 'C\'est un pilier fondamental de la relation' },
      { key: 'B', text: 'C\'est important mais pas déterminant' },
      { key: 'C', text: 'C\'est un sujet qui se construit avec le temps' },
      { key: 'D', text: 'C\'est un sujet intime que j\'aborderai en temps voulu' },
    ],
  },
  {
    id: 'M6_Q07',
    moduleNumber: 6,
    text: 'La fréquence d\'intimité physique que vous souhaitez idéalement dans une relation :',
    options: [
      { key: 'A', text: 'Très régulièrement — plusieurs fois par semaine' },
      { key: 'B', text: 'Régulièrement — quelques fois par mois' },
      { key: 'C', text: 'Occasionnellement — selon l\'humeur et la complicité' },
      { key: 'D', text: 'La fréquence m\'importe peu — c\'est la qualité qui compte' },
    ],
  },
  {
    id: 'M6_Q10',
    moduleNumber: 6,
    text: 'La fidélité dans votre conception du couple :',
    options: [
      { key: 'A', text: 'Absolue et non-négociable' },
      { key: 'B', text: 'Importante mais je crois en la réconciliation' },
      { key: 'C', text: 'Je suis humain(e) — les tentations existent' },
      { key: 'D', text: 'Je définis la fidélité différemment selon le contexte' },
    ],
  },

  // --- MODULE 7 : TRAJECTOIRE DE VIE & PERSONNALITÉ ---
  {
    id: 'M7_Q01',
    moduleNumber: 7,
    text: 'Dans 5 ans, si tout se passe comme vous le souhaitez, votre vie ressemble à :',
    options: [
      { key: 'A', text: 'Stable et établie — foyer, enfants, sécurité' },
      { key: 'B', text: 'En progression constante — carrière, projets, croissance' },
      { key: 'C', text: 'Aventureuse et libre — voyages, découvertes' },
      { key: 'D', text: 'Paisible et profonde — peu mais bien' },
    ],
  },
  {
    id: 'M7_Q02',
    moduleNumber: 7,
    text: 'Votre niveau d\'ambition professionnelle :',
    options: [
      { key: 'A', text: 'Élevé — je vise haut et je sacrifie pour ça' },
      { key: 'B', text: 'Modéré — j\'aime réussir sans que ça prenne tout' },
      { key: 'C', text: 'Faible — l\'équilibre de vie prime sur la carrière' },
      { key: 'D', text: 'Accompli — je suis dans une phase de transmission' },
    ],
  },
  {
    id: 'M7_Q03',
    moduleNumber: 7,
    text: 'Vous êtes plutôt :',
    options: [
      { key: 'A', text: 'Introverti(e) — les gens me fatiguent, je me ressource seul(e)' },
      { key: 'B', text: 'Ambiverti(e) — j\'ai besoin des deux selon les moments' },
      { key: 'C', text: 'Extraverti(e) — les gens me donnent de l\'énergie' },
      { key: 'D', text: 'Ça dépend complètement du contexte' },
    ],
  },
  {
    id: 'M7_Q05',
    moduleNumber: 7,
    text: 'Votre rapport au changement et à l\'imprévu :',
    options: [
      { key: 'A', text: 'J\'adore — le changement me stimule et me nourrit' },
      { key: 'B', text: 'J\'accepte bien — la flexibilité est une qualité' },
      { key: 'C', text: 'J\'ai besoin de m\'adapter progressivement' },
      { key: 'D', text: 'J\'ai besoin de stabilité — l\'imprévu me déstabilise' },
    ],
  },
  {
    id: 'M7_Q07',
    moduleNumber: 7,
    text: 'Où vous voyez-vous vivre dans 5 ans ?',
    options: [
      { key: 'A', text: 'Dans la même ville qu\'aujourd\'hui' },
      { key: 'B', text: 'Dans une autre ville ou région de mon pays' },
      { key: 'C', text: 'Dans un autre pays' },
      { key: 'D', text: 'Je suis ouvert(e) — ça dépend du projet de vie' },
    ],
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
      { key: 'C', text: 'Les deux — civil ET religieux' },
      { key: 'D', text: 'Un choix optionnel — l\'amour prime sur le papier' },
    ],
  },
  {
    id: 'M8_Q04',
    moduleNumber: 8,
    text: 'Votre langage de l\'amour principal :',
    options: [
      { key: 'A', text: 'Mots d\'affirmation (je t\'aime, les compliments)' },
      { key: 'B', text: 'Actes de service (aider, rendre service)' },
      { key: 'C', text: 'Cadeaux (offrir et recevoir)' },
      { key: 'D', text: 'Temps de qualité (être pleinement présent(e))' },
      { key: 'E', text: 'Toucher physique (câlins, gestes tendres)' },
    ],
  },
  {
    id: 'M8_Q05',
    moduleNumber: 8,
    text: 'Les ruptures non-négociables dans votre relation :',
    options: [
      { key: 'A', text: 'Infidélité ou mensonge grave' },
      { key: 'B', text: 'Violence ou manque de respect répété' },
      { key: 'C', text: 'Désaccord profond sur les enfants ou la religion' },
      { key: 'D', text: 'Incompatibilité de valeurs fondamentales' },
    ],
  },
  {
    id: 'M8_Q08',
    moduleNumber: 8,
    text: 'Ce que vous ne pourrez jamais accepter dans un couple :',
    options: [
      { key: 'A', text: 'Le mensonge répété' },
      { key: 'B', text: 'L\'infidélité sous toute forme' },
      { key: 'C', text: 'Le manque de respect de ma famille' },
      { key: 'D', text: 'L\'absence de projet commun' },
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
      { key: 'C', text: 'Mon partenaire prend souvent les décisions — ça me convient' },
      { key: 'D', text: 'Ça dépend du domaine — on a chacun nos zones' },
    ],
  },
  {
    id: 'M9_Q02',
    moduleNumber: 9,
    text: 'Votre philosophie de l\'effort en amour :',
    options: [
      { key: 'A', text: 'L\'amour vrai ne devrait pas demander d\'effort — ça doit être naturel' },
      { key: 'B', text: 'L\'amour se construit — l\'effort est une preuve d\'amour' },
      { key: 'C', text: 'L\'effort doit être réciproque sinon je me retire' },
      { key: 'D', text: 'Je donne beaucoup mais j\'attends la même chose en retour' },
    ],
  },
  {
    id: 'M9_Q03',
    moduleNumber: 9,
    text: 'Tenez-vous une comptabilité mentale de ce que vous donnez vs recevez ?',
    options: [
      { key: 'A', text: 'Non — je donne librement sans compter' },
      { key: 'B', text: 'Parfois, surtout quand je me sens lésé(e)' },
      { key: 'C', text: 'Oui — je surveille naturellement l\'équilibre' },
      { key: 'D', text: 'Oui — c\'est une façon de me protéger' },
    ],
  },
  {
    id: 'M9_Q04',
    moduleNumber: 9,
    text: 'Quand vous ressentez de la frustration dans une relation :',
    options: [
      { key: 'A', text: 'Je l\'exprime clairement dès que possible' },
      { key: 'B', text: 'J\'attends le bon moment pour en parler' },
      { key: 'C', text: 'Je garde pour moi en espérant que ça passe' },
      { key: 'D', text: 'Je laisse s\'accumuler jusqu\'à l\'explosion' },
    ],
  },
  {
    id: 'M9_Q06',
    moduleNumber: 9,
    text: 'Votre rapport au sacrifice dans une relation :',
    options: [
      { key: 'A', text: 'Je peux tout sacrifier pour la personne que j\'aime' },
      { key: 'B', text: 'Je peux faire des sacrifices importants si c\'est réciproque' },
      { key: 'C', text: 'Les petits sacrifices oui, les grands non — je reste moi' },
      { key: 'D', text: 'Je considère qu\'une vraie relation ne demande pas de sacrifices' },
    ],
  },
  {
    id: 'M9_Q07',
    moduleNumber: 9,
    text: 'Votre rapport à la tendresse et à l\'affection physique hors sexualité :',
    options: [
      { key: 'A', text: 'Essentielles — c\'est mon langage principal d\'amour' },
      { key: 'B', text: 'Importantes mais je ne suis pas très démonstratif(ve)' },
      { key: 'C', text: 'Appréciées mais pas indispensables' },
      { key: 'D', text: 'Je suis peu à l\'aise avec le contact physique non-sexuel' },
    ],
  },

  // --- MODULE 10 : ALCHIMIE, VIBE & DÉSIR (CLEF DE VOÛTE) ---
  {
    id: 'M10_Q01',
    moduleNumber: 10,
    text: 'Quand vous entrez dans une pièce, les gens ont tendance à :',
    options: [
      { key: 'A', text: 'Vous remarquer facilement — vous avez une présence naturelle' },
      { key: 'B', text: 'Vous remarquer progressivement au fil de la conversation' },
      { key: 'C', text: 'Se souvenir surtout de ce que vous avez dit' },
      { key: 'D', text: 'Avoir du mal à vous définir clairement après coup' },
    ],
  },
  {
    id: 'M10_Q03',
    moduleNumber: 10,
    text: 'Quel type d\'énergie recherchez-vous chez un(e) partenaire ?',
    options: [
      { key: 'A', text: 'Quelqu\'un de léger, drôle et qui me fait rire' },
      { key: 'B', text: 'Quelqu\'un d\'intense, profond et stimulant intellectuellement' },
      { key: 'C', text: 'Quelqu\'un de chaleureux, stable et rassurant' },
      { key: 'D', text: 'Quelqu\'un de calme, posé et qui équilibre mon énergie' },
    ],
  },
  {
    id: 'M10_Q04',
    moduleNumber: 10,
    text: 'Vous faites rire facilement les gens autour de vous ?',
    options: [
      { key: 'A', text: 'Oui — l\'humour est une de mes forces naturelles' },
      { key: 'B', text: 'Souvent — j\'ai le sens de l\'humour mais sans en faire une scène' },
      { key: 'C', text: 'Parfois — surtout avec les gens que je connais bien' },
      { key: 'D', text: 'Rarement — je suis plus sérieux(se) dans ma façon d\'être' },
    ],
  },
  {
    id: 'M10_Q06',
    moduleNumber: 10,
    text: 'L\'attirance dans une relation, pour vous, naît principalement de :',
    options: [
      { key: 'A', text: 'La connexion intellectuelle et les conversations stimulantes' },
      { key: 'B', text: 'La complicité et le rire partagé' },
      { key: 'C', text: 'La présence physique et l\'énergie du corps' },
      { key: 'D', text: 'Le sentiment d\'être compris(e) profondément et accepté(e)' },
    ],
  },
  {
    id: 'M10_Q09',
    moduleNumber: 10,
    text: 'Ce que vous apportez de vraiment unique dans une relation :',
    options: [
      { key: 'A', text: 'Ma joie de vivre et ma légèreté — être avec moi, c\'est fun' },
      { key: 'B', text: 'Ma profondeur et mon écoute — je fais vraiment sentir l\'autre compris(e)' },
      { key: 'C', text: 'Ma stabilité et ma fiabilité — je suis toujours là' },
      { key: 'D', text: 'Ma créativité et mon goût pour le beau et l\'insolite' },
    ],
  },
  {
    id: 'M10_Q10',
    moduleNumber: 10,
    text: 'Si vous deviez résumer en un mot l\'expérience que vous voulez offrir à votre partenaire :',
    options: [
      { key: 'A', text: 'Sécurité' },
      { key: 'B', text: 'Aventure' },
      { key: 'C', text: 'Profondeur' },
      { key: 'D', text: 'Joie' },
    ],
  },
];
