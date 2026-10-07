/**
 * Regard clinique de l'IA du Sondeur : elle raisonne comme un clinicien du
 * couple formé à plusieurs écoles, pour poser les questions que les deux
 * membres ne se seraient pas posées eux-mêmes. La méthode reste invisible :
 * les membres ne voient ni jargon, ni étiquette, ni diagnostic, et BOLIGO ne
 * présente jamais l'IA comme psychologue.
 */

/** Points non négociables : la même liste dans toutes les consignes. */
export const NON_NEGOTIABLE_TOPICS =
  'foi exigée, conversion, enfants, polygamie, pays de vie, fidélité, intimité avant le mariage, alcool, règles alimentaires, ou toute condition posée par écrit';

export const CLINICAL_LENS = `CADRE DU SONDEUR (prioritaire sur tout le reste) :
- Les deux membres ne se sont encore jamais parlé : ils n'ont aucun passé commun. Ne parle jamais d'un souvenir à deux. Pour une exception ou une question circulaire, appuie-toi sur leur famille ou leurs proches. N'évoque une relation passée que sous la forme « si vous en avez vécu une », et seulement pour ce que chacun en a appris : jamais sa fin (rupture, divorce, veuvage), jamais son récit.
- La même question est posée aux deux : elle doit avoir un sens pour chacun, quelle que soit sa réponse à l'entretien (jamais « qu'est-ce que fumer vous apporte ? » à quelqu'un qui ne fume pas).
- Chaque réponse sera lue par l'autre. Évite toute question dont la réponse sincère serait gênante à montrer (« partiriez-vous ? », « cela change-t-il vos sentiments ? ») : demande ce que la situation réveille, protège ou rappelle.
- Réponse libre de 500 caractères : une question ouverte, à laquelle on ne peut pas répondre par oui ou non.
- La profondeur monte avec les jours : jour 1, ce que chacun protège ; jour 2, d'où cela vient ; jour 3, comment cela se vivra à deux, ou ce qu'il faudrait savoir avant de s'engager.
- Ce que tu sais d'eux en dehors de l'entretien (âge, genre, ville) sert seulement à éviter un présupposé : ne le mentionne jamais dans une question, ni un écart d'âge.
- Le Sondeur ne repose pas l'entretien : il cherche le sens et le fonctionnement derrière une réponse déjà donnée.
- Chacun peut répondre « J'aimerais en parler de vive voix » : la question doit rester légitime même pour quelqu'un de pudique.

TA POSTURE : tu raisonnes comme un clinicien du couple expérimenté, formé à plusieurs écoles, et tu choisis pour chaque question l'outil le plus juste :
- Attachement (Bowlby, Ainsworth, Hazan et Shaver) : besoin de sécurité, peur d'être abandonné ou envahi, réaction quand l'autre s'éloigne ou se rapproche.
- Méthode Gottman : problèmes perpétuels et problèmes solubles, manière d'entrer dans un désaccord et d'en sortir, demandes d'attention et réponses à ces demandes, rêve caché derrière une position ; mépris et mur de silence se repèrent sans jamais être nommés : explore plutôt comment chacun se calme et répare après un désaccord.
- Thérapie centrée sur les émotions (Sue Johnson) : l'émotion visible et celle qu'elle protège, le cycle « l'un insiste, l'autre se retire ».
- Approche psychodynamique et psychanalytique : ce que l'on rejoue de son histoire, loyautés envers ses parents, idéalisation, attentes jamais formulées, ce que l'on espère que l'autre répare.
- Approche systémique (Bowen, thérapies familiales) : place de la famille d'origine, rôles appris, manière dont chacun articule sa place dans sa famille et dans le couple, selon le modèle qu'il choisit.
- Thérapies cognitives et des schémas (Beck, Young) : croyances sur l'amour, l'argent, la fidélité ; peur d'être abandonné, méfiance, exigence envers soi ou l'autre.
- Approche orientée solutions et entretien motivationnel : questions d'échelle, d'exception, projection dans un moment précis du futur, ambivalence.
- Valeurs (Schwartz), triangle de l'amour (Sternberg), désir et sécurité (Esther Perel) : ce qui est sacré pour chacun, intimité, passion, engagement, besoin de proximité et besoin de liberté.

TECHNIQUES (adaptées à deux personnes qui ne se connaissent pas encore) :
- question circulaire, par un proche : « Comment un proche qui vous connaît bien décrirait-il votre façon de… ? » (jamais « votre partenaire » : il ne vous connaît pas encore)
- origine : « Dans votre famille, comment savait-on que… ? »
- échelle avec relance : « De 0 à 10, … ? Qu'est-ce qui vous fait choisir ce chiffre ? »
- exception : « Pensez à une fois, dans votre famille ou entre proches, où… s'est bien passé. Qu'est-ce qui était différent ? »
- projection positive : « Imaginez un jour ordinaire, dans trois ans, où ce sujet se passe bien pour vous : à quel petit signe le verriez-vous ? » (jamais une difficulté que personne n'a exprimée)
- besoin caché : « Qu'est-ce que votre façon de… vous permet de protéger ? »
- même mot, autre sens : « Que veut dire, très concrètement, … pour vous ? »
- scène ordinaire : un moment banal de la vie à deux, jamais une catastrophe.

CHOIX DE LA TECHNIQUE SELON LE SIGNAL :
- Écart sur un point non négociable (${NON_NEGOTIABLE_TOPICS}) : jamais de compromis, jamais de terrain d'entente ; demande d'où vient la position ou ce qu'elle protège. Au jour 3, demande ce que chacun aurait besoin de savoir ou de vérifier avant de s'engager, jamais comment vivre avec l'écart.
- Incompatibilité déclarée dans l'analyse : explore d'abord ce point, pour que chacun décide en connaissance de cause.
- Écart de rythme ou de style (dispute, temps ensemble, parole) : c'est un désaccord durable ; demande comment chacun le vit de l'intérieur, ou ce qui l'apaise.
- Même réponse des deux côtés : vérifie que les mots veulent dire la même chose ; demande une scène ordinaire où cette réponse se voit.
- Même réponse qui pose un risque (deux silences, deux réconciliations lentes) : exception tirée de la famille ou des proches, ou signal de réparation.
- L'un veut parler tout de suite, l'autre s'éloigne : demande à chacun ce qu'il espère que l'autre comprenne à ce moment-là.
- Violence, insultes, menaces, contrôle, dépendance à l'alcool, aux drogues ou au jeu (écart ou même réponse non absolue) : jamais « vivable », jamais « compromis », jamais de réconciliation ni de geste de réparation ; ces thèmes sont couverts par les questions de limite écrites par BOLIGO : n'écris jamais de question qui met en scène la violence, les insultes, les menaces ou le contrôle. Sur un sujet voisin, demande une valeur ou une règle de respect partagée, jamais un seuil personnel (« à partir de quand… »), un récit de ce que chacun a vécu ou vu, ni ce qu'il ferait pour se protéger ou où il irait (un plan de mise en sécurité reste confidentiel, et l'autre lira la réponse). Contrôle : téléphone ou localisation surveillés, argent confisqué ou accès refusé à ses propres ressources, proches interdits, jalousie présentée comme une preuve d'amour ; demande où chacun place la frontière entre confiance et surveillance, jamais l'accès au téléphone présenté comme une preuve d'amour.
- Rôles, autorité, argent, famille élargie : demande comment chacun vivrait la place qu'il occuperait (décider, suivre, dépendre, être aidé), jamais quel modèle est le bon ; ne présuppose ni l'égalité ni la hiérarchie.
- La neutralité culturelle s'arrête au contrôle : demander la permission pour sortir, travailler, voir ses proches ou disposer de son argent n'est jamais un rôle ni un modèle à choisir ; ce sujet relève des questions de limite de BOLIGO, tu n'écris pas de question dessus.

CE QUE TU CHERCHES : pas la faille, mais la question que les deux membres ne se seraient jamais posée eux-mêmes : l'attente implicite, le besoin derrière la position, l'héritage familial, le scénario jamais imaginé, deux réponses identiques qui cachent des sens différents.

FORME ET PUDEUR :
- 180 caractères au plus, une seule question (la relance d'une échelle est admise).
- Ne cite jamais les réponses entre guillemets ; nomme le sujet avec des mots simples (« l'argent que l'on envoie à sa famille »).
- Ne présuppose aucun fait de leur vie absent de l'analyse (parents séparés, enfants, ex, pratique religieuse).
- Ne demande jamais le récit d'un événement douloureux, d'un secret de famille ou d'un détail de la vie sexuelle.
- Ne demande jamais un montant, un revenu, une épargne, un employeur, un lieu précis, une situation administrative (titre de séjour, papiers), ni un détail sur des enfants ou un ex : explore le sens, jamais les chiffres ni ce qui identifie.
- Intimité : aux jours 1 et 2, seulement ce que les mots veulent dire (fidélité, pudeur, tendresse, désir) ; au jour 3 seulement, et pas plus loin, comment chacun dit oui ou non ; jamais une pratique, une expérience ou une fréquence.
- Pas de liste de choix dans le texte de la question ; un mot entre guillemets seulement pour « même mot, autre sens », trois mots au plus.

NEUTRALITÉ ABSOLUE :
- la méthode reste invisible : aucun jargon, aucune étiquette (anxieux, évitant, narcissique, trauma…), aucun diagnostic, aucune interprétation présentée comme une vérité ;
- aucune question n'oriente vers une « bonne » réponse ; aucune morale ;
- respect de toutes les cultures, croyances et choix de vie ;
- beaucoup de couples se construisent avec la famille élargie (accord des aînés, dot, soutien financier, cohabitation, polygamie choisie ou refusée) : c'est un modèle de vie, jamais une « dépendance » ni un manque d'autonomie ; explore la place que chacun veut lui donner, jamais si elle est trop grande ;
- ne demande jamais l'ethnie, la tribu, la caste ou l'origine : tu peux demander ce que sa famille attend d'un futur conjoint ;
- jamais de question sur le corps, l'apparence, la couleur de peau ou la santé ;
- une seule idée par question, une scène concrète, des mots simples, vouvoiement.

EXEMPLES (inspire-toi de l'écart entre les deux, ne les recopie pas) :
- Mauvais : « Est-ce une ligne rouge pour vous ? » (fermée, réponse de façade). Bon : « D'où vous vient la certitude que ce point ne se discute pas ? »
- Mauvais : « Comment votre partenaire décrirait-il votre façon de vous disputer ? » (ils ne se connaissent pas). Bon : « Comment un proche qui vous a vu(e) en colère décrirait-il votre façon de vous calmer ? »
- Mauvais : « Que représente la famille pour vous ? » (abstraite, banale). Bon : « Dans votre famille, comment montrait-on à quelqu'un qu'il comptait ? »
- Mauvais : « Comment rendre vivable votre différence sur la foi ? » (compromis sur un non-négociable). Bon : « Qui, dans votre entourage, aurait le plus à dire sur la religion de votre futur conjoint ? »
- Mauvais : « Au premier rendez-vous, qui paie ? » (déjà demandé dans l'entretien). Bon : « Quand quelqu'un paie l'addition pour vous, qu'est-ce que vous ressentez ? »`;

/**
 * Consigne de lecture des réponses (lectures du jour, bilan) : décrire,
 * comparer, citer ; ne jamais expliquer ni attribuer une émotion.
 */
export const READING_LENS = `POUR LIRE LEURS RÉPONSES :
- Décris, compare, cite ; n'explique pas. Tu peux relever un mot commun, une différence de rythme, une réponse laissée courte.
- Toute hypothèse sur un besoin ou une émotion prend la forme d'une question qui leur est posée, jamais d'une affirmation.
- N'attribue jamais à l'un d'eux, à eux deux ni à un prénom une émotion, une peur, un besoin ou un trait de caractère qui n'a pas été écrit.
- Un accord n'existe que si les deux réponses comptent au moins quatre mots et décrivent la même chose concrète. Deux réponses qui emploient le même mot (« respect », « confiance ») vont dans « toDiscuss » comme « même mot, sens à préciser ».
- Une réponse qui s'en remet à Dieu, à la famille ou à la tradition est une position : décris-la telle quelle, jamais comme une esquive ou une dépendance.
- Sur un point non négociable (${NON_NEGOTIABLE_TOPICS}), ne propose jamais de compromis ni de terrain d'entente. Si l'un pose par écrit une condition que l'autre refuse par écrit, place-la en premier dans « toDiscuss » en décrivant les deux positions telles qu'écrites, sans les adoucir.
- Une réponse « [réservé à la rencontre] » n'est jamais interprétée : signale seulement que ce sujet sera abordé de vive voix.
- Si une réponse évoque une violence subie ou exercée, une menace, un contrôle, une détresse, une demande d'argent ou un âge de moins de 18 ans : ne la commente pas, n'en fais ni un accord, ni un écart, ni une question, et lève l'alerte prévue.
- Le titre décrit ce qu'ils ont exploré ; il n'évalue pas leur compatibilité.
- Violence, insultes, menaces ou contrôle : jamais présentés comme négociables.
- Aucun jargon, aucune étiquette, aucun diagnostic, aucune prédiction, aucun score.`;

/** Grille du relecteur indépendant : chaque question est refusée au moindre défaut. */
export const CRITIC_RULES = `Refuse une question si :
1. elle oriente vers une réponse, juge ou fait la morale ;
2. elle contient du jargon, une étiquette, un diagnostic ou une interprétation présentée comme un fait (« vous avez tendance à… ») ;
3. elle porte sur le corps, l'apparence, la couleur de peau ou la santé, ou demande une coordonnée ;
4. elle mélange plusieurs idées, propose une liste de choix dans son texte, ou reste abstraite ;
5. elle répète une question de la liste ou déjà posée (même sens, autres mots), ou une question de l'entretien ;
6. elle est banale : elle échoue au test du premier dîner (deux inconnus se la poseraient spontanément) ;
7. elle contient une faute, oublie le vouvoiement, cite les réponses entre guillemets ou dit qui a répondu quoi ;
8. on peut y répondre par oui ou par non ;
9. elle suppose un passé commun aux deux membres, ou un fait de leur vie absent de l'analyse ou du contexte fournis (invention) ;
10. sa réponse sincère serait difficile à montrer à l'autre (ultimatum, « partiriez-vous ? ») ;
11. elle demande le récit d'un événement douloureux, un secret de famille ou un détail de la vie sexuelle ;
12. elle traite la violence, les insultes, les menaces, le contrôle ou une dépendance comme une différence à aménager ou « vivable », ou y associe une réconciliation ou un geste de réparation ;
13. elle dépasse 180 caractères ;
14. sa « méthode » n'est pas reconnaissable dans le texte, ou elle ne peut pas révéler sa « cible » ;
15. elle n'a pas de sens pour l'un des deux, compte tenu de sa réponse à l'entretien ;
16. elle demande un montant, un revenu, un employeur, un lieu précis, des papiers, un détail sur des enfants ou un ex ;
17. elle invite à un compromis ou à un terrain d'entente sur un point non négociable ;
18. elle mentionne l'âge, le genre, la ville, ou un écart entre eux ;
19. elle reprend, même reformulé, un exemple de la consigne ;
20. elle présente un modèle culturel, religieux ou familial (égalité ou hiérarchie, famille élargie, dot, polygamie, cohabitation) comme allant de soi, dépassé ou problématique, ou demande l'ethnie, la tribu ou la caste (sauf le contrôle, règle 21) ;
21. elle met en scène une violence, une insulte, une menace ou un contrôle, subis ou exercés (« que ressentiriez-vous si… », « si l'on vous… »), présente une permission à demander (sortir, travailler, voir ses proches, dépenser) comme un rôle, demande un seuil personnel (« à partir de quand », « jusqu'où », « combien de… avant que… ») ou ce que l'on ferait pour se protéger, où l'on irait, qui l'on appellerait.`;

/**
 * Étiquettes cliniques interdites dans un texte montré aux membres. Le relecteur
 * les refuse déjà : ce filtre du code les arrête même sans lui.
 */
const JARGON_WORDS = [
  // Mots courants exclus (« en évitant », « anxieux de bien faire ») : seules
  // les étiquettes sont refusées.
  '(?<!en )évitant(?:e|es|s)?(?!\\p{L})',
  '(?<!en )evitant(?:e|es|s)?(?!\\p{L})',
  'profil (?:anxieu|évitant|insécure)',
  'anxieux-ambivalent',
  'narciss',
  'trauma',
  'patholog',
  'névros',
  'nevros',
  'psychos',
  'borderline',
  'bipolaire',
  'pervers',
  'toxique',
  'dépressi',
  'depressi',
  'diagnosti',
  'trouble de la personnalité',
  'attachement (?:anxieu|évitant|insécure|sécure|désorganis|ambivalent)',
  "théorie de l['’]attachement",
  "style d['’]attachement",
  'dépendance (?:affective|émotionnelle)',
  'in?sécure(?!\\p{L})',
  'mécanismes? de défense',
  'évitement',
  'evitement',
  'hypersensib',
  'ambivalen',
  'différenciation du soi',
  'contre-dépendan',
  'clivage',
  'pattern',
  'codépendan',
  'manipulat(?:eur|rice)',
  'manipulation affective',
  "peur de l['’]abandon",
  "angoisse d['’]abandon",
  "(?:peur|crainte|craindre) d['’]être abandonn",
  'abandonnique',
  'insécurité affective',
  "(?:votre|son|sa|leur|l['’])\\s?inconscient",
  'loyauté invisible',
  'loyautés? familiales?',
  'triangul',
  'enfant intérieur',
  'projection',
  'projet(?:ez|er|te|tent|ons)(?:-vous)? sur',
  'fusionnel',
  'transfert affectif',
  'rejou',
  'parentifi',
  'red flag',
  'love bombing',
  'gaslighting',
  'emprise',
  'refoulé',
  'schéma précoce',
  "complexe d['’]?(?:œ|oe)dipe",
];
// Début de mot en tenant compte des lettres accentuées (\b ne les connaît pas).
const JARGON = new RegExp(`(?<!\\p{L})(?:${JARGON_WORDS.join('|')})`, 'iu');

export function hasClinicalJargon(text: string): boolean {
  return JARGON.test(text);
}

const STOPWORDS = new Set(
  'avec avez aviez aurait auriez avoir partenaire partenaires couple question situation imaginez réagiriez réagissez feriez faites pensez souhaitez cela celle celui cette ceux chez comme comment dans des deux donc elle elles entre est était être fait faire leur leurs mais même moins nous notre par parce pas peut plus pour quand que quel quelle quelles quels qui quoi sans selon ses son sont sur tout toute toutes tous très une vers vos votre vous vraiment autre autres alors aussi ainsi encore jamais déjà ici cas fois chaque ceci'.split(
    ' ',
  ),
);

/** Mots porteurs de sens d'une question (sans les mots outils). */
export function contentWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/«[^»]*»/g, ' ')
      .split(/[^a-zàâäçéèêëîïôöùûüÿœæ]+/)
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
  );
}

/**
 * Deux questions trop proches (même sens, presque les mêmes mots) : une seule
 * est gardée. Mesure de recouvrement des mots porteurs de sens.
 */
export function similarQuestions(a: string, b: string): boolean {
  const wa = contentWords(a);
  const wb = contentWords(b);
  if (wa.size < 3 || wb.size < 3) return false;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return common / (wa.size + wb.size - common) >= 0.5;
}

/**
 * Interprétations présentées comme des faits dans une lecture : « au fond »,
 * « inconsciemment », « cela révèle une… », « vous avez tendance à… ».
 */
const INTERPRETATION =
  /(?<!\p{L})(?:au fond|inconsciemment|en réalité|en vérité|sans le savoir|vous avez tendance|a tendance à|(?:semble(?:nt)?|para[iî]t|paraissent) (?:craindre|cacher|avoir peur|redouter)|(?:cache|révèle|trahit|traduit)(?:nt)? (?:une|un|votre|vos|son|sa|ses|leur|leurs)(?!\p{L})|(?:vieille|ancienne) blessure|blessure (?:ancienne|d['’]enfance))/iu;

/** Interprétation présentée comme un fait (questions et lectures). */
export function hasInterpretation(text: string): boolean {
  return INTERPRETATION.test(text);
}

/**
 * Tournures d'interprétation propres à une lecture (une affirmation sur les
 * membres) : « cette réponse montre un besoin… », « on sent chez… ».
 */
const READING_INTERPRETATION =
  /(?<!\p{L})(?:montre(?:nt)? (?:un|une|que)(?!\p{L})|montre(?:nt)? (?:votre|vos|son|sa|leur) (?:besoin|peur|manque|blessure|difficult\p{L}*|rejet|fragilit\p{L}*)|témoigne(?:nt)? d|reflète(?:nt)?|dénote\p{L}*|(?:indique|signale|trahit)(?:nt)? (?:un|une) (?:besoin|peur|manque|désir)|dit beaucoup|disent beaucoup|on sent|probablement|visiblement|manifestement|signe qu\p{L}*|par peur d|se cache|derrière (?:ces|ses|vos|cette|leurs?) (?:mots|réponses?)|blessure)/iu;

/**
 * Interprétation dans une lecture. `written` : ce que les membres ont écrit ;
 * un mot qu'ils ont employé eux-mêmes (« une vieille blessure ») peut être
 * rapporté par une phrase qui les cite (`reports`).
 */
export function hasReadingInterpretation(
  text: string,
  written = '',
  reports = false,
): boolean {
  return [INTERPRETATION, READING_INTERPRETATION].some((re) =>
    unwrittenMatch(re, text, written, reports),
  );
}

/**
 * Le texte emploie-t-il un mot de `re` que les membres n'ont pas écrit (ou
 * sans le rapporter comme le leur) ?
 */
export function unwrittenMatch(
  re: RegExp,
  text: string,
  written: string,
  reports: boolean,
): boolean {
  const global = new RegExp(
    re.source,
    re.flags.includes('g') ? re.flags : `${re.flags}g`,
  );
  const mine = written.toLowerCase();
  return [...text.matchAll(global)].some(
    (m) => !reports || !mine.includes(m[0].toLowerCase()),
  );
}

/** Longueur maximale d'une question de l'IA (la consigne en demande 180). */
export const MAX_QUESTION_LENGTH = 200;

/**
 * Mot interrogatif ou invitation à décrire : sans lui, on répond par oui ou
 * par non (« Pour vous, la fidélité est-elle négociable ? »).
 */
const OPEN_MARKER =
  /(?<!\p{L})(?:comment|pourquoi|combien|quel(?:le)?s?|lequel|laquelle|lesquel(?:le)?s|quoi|décrire|raconter|dire ce)(?!\p{L})|(?:^|[,:;«]\s*|(?<!\p{L})(?:à|de|d['’]|dans|pour|avec|chez|sur|par|en|vers|jusqu['’])\s*)(?:(?:qui|que|où)(?!\p{L})|qu['’])|(?<!\p{L})qu['’]est-ce/iu;

/**
 * Verbe inversé (« accepteriez-vous », « est-elle », « y a-t-il ») : une
 * question qui commence ainsi, sans mot interrogatif avant, est fermée.
 * Les invitations (« pouvez-vous décrire… », « rappelez-vous… ») n'en sont pas.
 */
const INVERSION =
  /(?<!\p{L})(?!(?:pouvez|sauriez|rappelez|souvenez|imaginez|demandez|représentez|figurez|rendez)-vous)\p{L}+-(?:t-)?(?:je|tu|il|elle|on|nous|vous|ils|elles|ce)(?!\p{L})/iu;

/** Question ouverte : la dernière phrase a un mot interrogatif avant tout verbe inversé. */
export function isOpenQuestion(text: string): boolean {
  const sentences = text.trim().split(/(?<=[.?!])\s+/);
  const sentence = sentences[sentences.length - 1] ?? '';
  // « Comment dire : la fidélité est-elle négociable ? » : la question qui
  // suit les deux-points doit être ouverte à elle seule.
  const parts = sentence.split(/\s*:\s+/);
  const tail = parts[parts.length - 1];
  const last = parts.length > 1 && INVERSION.test(tail) ? tail : sentence;
  // « Votre famille, qui est très présente, accepterait-elle… » : un « qui »
  // relatif n'ouvre pas la question.
  const plain = last.replace(
    /,\s*qui\s(?:est|sont|était|étaient|a|ont|avait|avaient)\s[^,?]+,/giu,
    ',',
  );
  const inversion = INVERSION.exec(plain);
  const head = inversion
    ? plain.slice(0, inversion.index + inversion[0].length)
    : plain;
  return OPEN_MARKER.test(head);
}

/**
 * Demande intrusive ou exploitable par un inconnu (montant, employeur,
 * papiers…), présupposé sur des enfants, un ex ou une séparation, détail de la
 * vie sexuelle, ou invitation au compromis.
 */
const INTRUSIVE =
  /(?<!\p{L})(?:montants?|quel(?:le)? (?:est|sont|serait|seraient) (?:votre|vos) (?:salaire|revenus?|épargne|économies|budget)|combien (?:d['’]argent|de partenaires|d['’]amants?|d['’]ex|de dot|seriez-vous prêt|gagn|envoy|épargn|mett|vers|pai|dépens|avez-vous|vous gagnez)\p{L}*|euros?|fcfa|francs? cfa|dollars?|nairas?|dirhams?|employeur|où travaillez|habitez-vous|adresse|titre de séjour|statut migratoire|visa|sans[- ]papiers|vos papiers|situation administrative|(?:votre|vos) (?:ethnie|tribu|caste|origines? ethniques?)|quel(?:le)? (?:ethnie|tribu|caste)|séparation de vos parents|vos (?:futurs |éventuels )?enfants|votre (?:ex|ancien(?:ne)? (?:conjoint\p{L}*|partenaire|compagn\p{L}*|mari|femme|époux|épouse)|dernière relation|précédente? (?:relation|union)|précédent mariage|premier mariage|rupture|veuvage|divorce)|fai(?:t|re|tes) l['’]amour|rapports? sexuels?|relations? sexuelles?|(?:votre|la) première fois|fantasme\p{L}*|virginité|rendre vivable|vivable|rapprocher vos positions|terrain (?:d['’]entente|commun)|(?:trouver|faire) (?:un |des )?compromis|voie médiane|juste milieu)(?!\p{L})|[€$£]/iu;

/**
 * Compromis ou « vivre avec » : interdit sur un point non négociable (foi
 * exigée, conversion, enfants, polygamie, pays de vie, condition déclarée),
 * dans une question comme dans une lecture.
 */
export const COMPROMISE =
  /(?<!\p{L})(?:rendre vivable|vivable|rapprocher vos positions|terrain (?:d['’]entente|commun)|compromis|concessions?|concilier (?:vos|leurs|les deux) (?:positions|visions|croyances|religions)|voie médiane|juste milieu|pas[^?.]{0,30} vers l['’]autre|chacun (?:fait|ferait|pourrait faire) (?:un|des) (?:pas|efforts?)|trouve\p{L}* un chemin|conversion progressive|eau dans (?:son|votre|leur) vin|mi-chemin|équilibre (?:à|reste à) trouver|trouver un équilibre|arrangement|accommodement|s['’]adapter l['’]un à l['’]autre|(?:pourra|devra|pourrait|pourrez|devrez) s['’]adapter|lâcher du lest|céder)(?!\p{L})/iu;

export function isIntrusiveQuestion(text: string): boolean {
  return INTRUSIVE.test(text);
}

/** Question qui dit qui a répondu quoi : la même question est posée aux deux. */
const REPORTS_ANSWER =
  /(?<!\p{L})(?:vous avez (?:répondu|écrit)|vous avez dit (?:que|à l['’]entretien)|l['’]un de vous (?:a|aurait) (?:répondu|écrit|dit)|l['’]autre a (?:répondu|écrit|dit)|votre réponse (?:à|sur) l['’]entretien)/iu;

/** Guillemets admis seulement pour « même mot, autre sens » : trois mots au plus. */
function quotesAllowed(text: string): boolean {
  const spans = [...text.matchAll(/[«“"]([^«»“”"]*)[»”"]/g)];
  const stripped = text.replace(/[«“"][^«»“”"]*[»”"]/g, '');
  if (/[«»“”"]/.test(stripped)) return false;
  return spans.every(
    (m) => m[1].trim().split(/\s+/).filter(Boolean).length <= 3,
  );
}

// ─── Règles de forme partagées par les gabarits et les questions de l'IA ─────

const L = '\\p{L}';
const word = (alternatives: string) =>
  new RegExp(`(?<!${L})(?:${alternatives})(?!${L})`, 'iu');
const prefix = (alternatives: string) =>
  new RegExp(`(?<!${L})(?:${alternatives})`, 'iu');

/** Ultimatum : une réponse sincère difficile à montrer (« partiriez-vous ? »). */
export const ULTIMATUM = prefix(
  'partiriez|quitteriez|resteriez|romp|rupture|mettre fin|vous retiendrait dans la relation|renonceriez',
);
/** Morale ou « bonne réponse » suggérée. */
export const MORALE = word(
  "devriez|devrait|devraient|(?<!qu['’](?:un|une|on)(?: \\p{L}+)? )doit|(?<!qu['’](?:un|une|on|ils|elles)(?: \\p{L}+)? )doivent|dois|(?<!qu'il )faut|bonne réponse|normale?|anormale?|mauvaise?|immature|bien ou mal|coupable|tendance",
);
export const MORALE_PREFIX = prefix('égoïs|caprice|capricieu');
/** Passé commun supposé entre deux personnes qui ne se sont jamais parlé. */
export const SHARED_PAST = prefix(
  "vous vous êtes|depuis que vous|votre dernière|vos dernières|la dernière fois que vous|votre première dispute|votre relation(?! avec)|votre couple|cette relation|vos disputes(?! avec)|vous vous connaissez|vous avez vécu ensemble|votre partenaire|l'un de vous a répondu",
);
/** Corps, apparence, santé : jamais. */
export const BODY_HEALTH = new RegExp(
  `(?<!${L})(?:corps|physique|apparence|allure|poids|taille(?! de (?:la )?famille)|beauté|beau(?![\\p{L}-])|belle(?![\\p{L}-])|sexy|malad(?!roit)|handicap|santé|médic|médecin|enceinte|grossesse|fertil|stéril|nudité|maigr|silhouette|visage|peau|cheveux|épuis|dépress)`,
  'iu',
);
/** Détail de la vie sexuelle : jamais. */
export const SEXUAL_DETAIL = prefix(
  'sexe|sexu|orgasm|fantasm|au lit|préliminaire|virginit|rapports? intime',
);
/** Récit d'un événement douloureux : jamais. */
export const PAINFUL_STORY = prefix(
  'racontez|décrivez|traumat|abus|agression|deuil|décès|décédé|mort |violences? subies?|secret de famille|vos blessures|votre pire|le pire moment|ce que vous avez subi|divorce de vos parents',
);
/** « ton » possessif, pas le ton de la voix (« le ton », « quel ton »). */
export const TUTOIEMENT = word(
  "tu|toi|(?<!(?:le|quel|un|du|au|ce|son|mon|votre|même) )ton|ta|tes|te|t'|t’",
);
export const VOUVOIEMENT = word(
  'vous|votre|vos|pensez|imaginez|rappelez|souvenez|décrivez|choisissez|citez|dites|prenez|regardez',
);
/** Impératif tutoyé en tête de question (« Imagine un dimanche… »). */
export const TUTOIEMENT_IMPERATIVE =
  /^\s*(?:imagine|pense|dis|décris|raconte|explique|choisis|écris|réfléchis|regarde|essaie|cite|rappelle-toi|souviens-toi)(?!\p{L})/iu;
/**
 * Deux questions en une : une seconde question n'est admise que pour relancer
 * une échelle (« Qu'est-ce qui vous fait choisir ce chiffre ? »).
 */
export function isDoubleQuestion(text: string): boolean {
  const questions = text
    .split(/(?<=\?)\s*/)
    .map((q) => q.trim())
    .filter(Boolean);
  if (questions.length > 2) return true;
  if (
    questions.length === 2 &&
    !/^(?:qu['’]est-ce qui vous fait choisir|pourquoi ce chiffre|pourquoi pas un point)/iu.test(
      questions[1],
    )
  )
    return true;
  // « Comment gérez-vous… et comment la montrez-vous ? » : deux questions au
  // membre ; « qui avait le dernier mot, et comment le saviez-vous ? » : une
  // relance de la même question.
  return questions.some(
    (q) =>
      ((q.match(/\p{L}-vous(?!\p{L})/giu) ?? []).length >= 2 &&
        /(?<!\p{L})et (?:comment|pourquoi|quel\p{L}*|combien|quand|où|que|qu['’])/iu.test(
          q,
        )) ||
      /,\s*et (?:votre|vos|ce que|ce qui)(?!\p{L})/iu.test(q),
  );
}

/** Demandes identifiantes ou chiffrées que la liste INTRUSIVE ne couvre pas. */
export const INTRUSIVE_MORE =
  /(?<!\p{L})(?:quelle somme|mariage précédent|union précédente|fréquence[^?]{0,40}intim\p{L}*|intim\p{L}*[^?]{0,40}fréquence|quel traitement|traitement (?:suivez|prenez|médical)|combien (?:touchez|percevez|gagnez|empochez)|que gagnez|(?:votre|son) salaire|ancienne relation|parents (?:se sont |étaient )?séparés|vos ex(?!\p{L})|premier baiser|fréquence (?:de vos|des) (?:moments|rapports|relations) intimes|(?:où|dans quelle ville)[^?]{0,30}vivent vos parents|pays d['’]origine|(?:dans )?quel(?:le)? (?:quartier|village|immeuble|entreprise|société)|votre origine|originaire|\d{2} ans|écart d['’]âge|votre âge)(?!\p{L})/iu;
/** Violence présentée comme excusable, pardonnable ou réparable. */
export const VIOLENCE_NORMALIZE =
  /(?<!\p{L})(?:gifl|frapp|coups?(?!\p{L})|violen|insult|menac|mots blessants|geste brusque|geste déplacé|bouscul)\p{L}*[^?]{0,60}(?:excus|justifi|réconcili|pardonn|répar|vivable|tourner la page|passer l['’]éponge)|(?<!\p{L})(?:excus|justifi|réconcili|pardonn|répar)\p{L}*[^?]{0,60}(?:gifl|frapp|coups?(?!\p{L})|violen|insult|menac|mots blessants|geste brusque|geste déplacé|bouscul)/iu;
/** Trait de caractère ou difficulté présupposés (« votre jalousie », « avez-vous du mal à »). */
export const PRESUPPOSED =
  /(?<!\p{L})(?:votre (?:jalousie|possessivité|méfiance|colère|immaturité|égoïsme|besoin de contrôle)|(?:avez|auriez)-vous du mal à|vous empêche encore|encore d['’]accepter|toujours pas)(?!\p{L})/iu;

/** Bonnes questions données en exemple dans la consigne : jamais recopiées. */
export const LENS_EXAMPLES = [
  ...CLINICAL_LENS.matchAll(/Bon : « ([^»]+) »/g),
].map((m) => m[1]);

/**
 * Contrôle de forme par le code, avant toute relecture : une question
 * ouverte, courte, sans citation des réponses, sans jargon, interprétation
 * ni demande intrusive, et qui ne recopie pas un exemple de la consigne.
 */
/**
 * Question de l'IA qui met en scène un geste violent, un contrôle ou une
 * blessure (« que ressentiriez-vous s'il vous giflait une seule fois ? »,
 * « …s'il lisait vos messages par amour ? ») : jamais posée. Les gabarits de
 * limite de l'équipe, relus par des humains, ne passent pas par ce filtre.
 */
const STAGED_HARM =
  /(?<!\p{L})(?:gifl\p{L}*|frapp\p{L}*|cogn\p{L}*|battr\p{L}*|bat(?:tu|tue|tait)|coups?(?! de (?:cœur|coeur|foudre|main|fil|pouce|tête|chance))|violen\p{L}*|étrangl\p{L}*|(?:le plus |la plus )bless\p{L}*|bless\p{L}* (?:dans|pendant|durant) (?:votre|ton) enfance|humili\p{L}*|lis\p{L}* vos messages|fouill\p{L}* (?:votre|vos)|à l['’]abri|vous protéger|vous réfugier|où iriez|(?:le )?code de (?:votre|son) téléphone|accès à (?:votre|son|leur) téléphone|bouscul\p{L}*|l[eè]v\p{L}* la main|petite tape|cri\p{L}* dessus|contrôl\p{L}* (?:vos|ses|son|sa|le|les|votre) (?:dépenses|téléphone|messages|sorties|fréquentations)|par amour)(?!\p{L})/iu;

/** Arrangement ou concession sur un sujet non négociable, dans une question de l'IA. */
const NN_ARRANGEMENT =
  /(?:mettre|trouver) d['’]accord sur (?:la religion|la foi|les enfants|la polygamie|le pays|la conversion)|devenir acceptable|à mi-(?:temps|chemin)|(?:religion|foi|polygamie|conversion|enfants)[^?]{0,40}(?:céder|lâcher|assouplir|renoncer)/iu;

/**
 * Sujets de sécurité : couverts par les questions de limite écrites par
 * BOLIGO. Une question de l'IA qui les nomme, même sans les mettre en scène,
 * est écartée.
 */
const SAFETY_TOPIC =
  /(?<!\p{L})(?:gifl\p{L}*|claques?|frapp\p{L}*|cogn\p{L}*|(?<!(?:tout |à ))coups?(?! de (?:cœur|coeur|foudre|main|fil|pouce|tête|chance|génie))|violen\p{L}*|empoign\p{L}*|serr\p{L}* le cou|étrangl\p{L}*|bouscul\p{L}*|cris|crier|hurl\p{L}*|insult\p{L}*|trait\p{L}* de (?!vos|votre|famille)\p{L}+|humili\p{L}*|rabaiss\p{L}*|menac\p{L}*|contrôl\p{L}*|(?<!entre (?:la )?confiance et (?:la )?)surveill\p{L}*|espionn\p{L}*|fouill\p{L}*|mots? de passe|en cachette|rendre compte de chaque|partir avec les enfants|dormir ce soir|chez qui pourriez|dégénér\p{L}*|invivable|lever la main|(?:permission|autorisation) (?:de|pour|avant de) (?:sortir|travailler|voir|dépenser|partir)|demander (?:la permission|l['’]autorisation))(?!\p{L})/iu;
/** Seuil personnel de tolérance (« à partir de combien de cris… »). */
const THRESHOLD =
  /(?:à partir de (?:quand|combien|quel moment)|jusqu['’]où)[^?]{0,60}(?:accept|tolér|support|invivable|trop|limite|parler de|aller)/iu;
/** Sujet non négociable dans une question : aucun arrangement proposé. */
const NN_QUESTION_TOPIC =
  /(?<!\p{L})(?:foi|relig\p{L}*|pri(?:e|ère|ent|ez)\p{L}*|conver\p{L}*|polygam\p{L}*|pays|enfants?|fidélité|pratique)(?!\p{L})/iu;
const ARRANGE =
  /(?<!\p{L})(?:concili\p{L}*|intermédiaire|acceptable|lâcher|raisonnables?|céder|renoncer|sacrifier|assouplir|compromis|mi-chemin|terrain d['’]entente|formule)(?!\p{L})/iu;

export function isWellFormedQuestion(text: string): boolean {
  const t = text.trim();
  return (
    passesFormRules(t) &&
    !STAGED_HARM.test(t) &&
    !SAFETY_TOPIC.test(t) &&
    !THRESHOLD.test(t) &&
    !(NN_QUESTION_TOPIC.test(t) && ARRANGE.test(t)) &&
    !NN_ARRANGEMENT.test(t) &&
    !LENS_EXAMPLES.some((e) => similarQuestions(e, t) || e === t)
  );
}

/**
 * Règles de forme communes aux gabarits écrits par l'équipe et aux questions
 * de l'IA (sans le contrôle des exemples de la consigne, réservé à l'IA).
 */
export function passesFormRules(text: string): boolean {
  const t = text.trim();
  const marks = (t.match(/\?/g) ?? []).length;
  return (
    t.length >= 20 &&
    t.length <= MAX_QUESTION_LENGTH &&
    t.endsWith('?') &&
    marks <= 2 &&
    quotesAllowed(t) &&
    isOpenQuestion(t) &&
    !hasClinicalJargon(t) &&
    !hasInterpretation(t) &&
    !isIntrusiveQuestion(t) &&
    !REPORTS_ANSWER.test(t) &&
    !ULTIMATUM.test(t) &&
    !MORALE.test(t) &&
    !MORALE_PREFIX.test(t) &&
    !SHARED_PAST.test(t) &&
    !BODY_HEALTH.test(t) &&
    !SEXUAL_DETAIL.test(t) &&
    !PAINFUL_STORY.test(t) &&
    !TUTOIEMENT.test(t) &&
    !TUTOIEMENT_IMPERATIVE.test(t) &&
    !isDoubleQuestion(t) &&
    VOUVOIEMENT.test(t) &&
    !INTRUSIVE_MORE.test(t) &&
    !VIOLENCE_NORMALIZE.test(t) &&
    !PRESUPPOSED.test(t)
  );
}
