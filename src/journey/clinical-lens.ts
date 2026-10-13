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
- Tu n'écris de question que sur un ÉCART RÉEL détecté par le moteur (preuve de nature « écart »). Accord ou sujet neutre : aucune question, les questions écrites par l'équipe BOLIGO s'en chargent.
- Chaque question part de l'écart détecté (DETECTED_GAP) : le sujet et les deux positions telles que l'analyse les donne. Elle cite ses preuves.
- Les deux membres ne se sont encore jamais parlé : aucun passé commun, aucun souvenir à deux.
- La même question est posée aux deux : elle a un sens pour chacun, quelle que soit sa position.
- Chaque réponse sera lue par l'autre ; la réponse est libre (500 caractères), on peut nuancer après un oui ou un non.
- Ce que tu sais d'eux en dehors de l'entretien (âge, genre, ville) sert seulement à éviter un présupposé : ne le mentionne jamais.
- Ne redemande jamais un fait déjà connu par l'entretien : va au cran suivant.
- Chacun peut répondre « J'aimerais en parler de vive voix ».

CE QUE FAIT UNE BONNE QUESTION : elle confronte l'écart à la réalité, pour que chacun sache avant de s'engager.
- combien, jusqu'où, pourriez-vous réellement, si cela ne changeait jamais, avec quoi pourriez-vous vivre, qu'est-ce que vous ne pourriez pas accepter ;
- une hypothèse concrète et chiffrée quand c'est possible (un nombre d'enfants, une somme de 1 000 €, 5 jours sur 7, après 21 h) ;
- une seule idée par question, aussi courte que naturelle, des mots de tous les jours, vouvoiement ;
- jamais de souvenir d'enfance, de famille d'origine (« dans votre famille », « où vous avez grandi »), de regard d'un proche (« un proche qui vous connaît »), d'« angle mort » ni de « sacré » ;
- jamais de jargon, aucune étiquette, aucun diagnostic, ni de tournure alambiquée (« dans ce souhait », « cette divergence », « votre positionnement », « qu'est-ce qui, pour vous, », « dans quelle mesure », « que signifie pour vous »).

RÉCIPROCITÉ : la même question est posée à A et à B. Elle vaut pour chacun des deux, quelle que soit sa position. Jamais une hypothèse qui ne vise que l'un des deux (« si votre partenaire ne voulait jamais d'enfant » n'a de sens que pour celui qui en veut) : formule l'écart de façon symétrique (« vos positions », « l'un de vous », « chacun »).

RISQUE PARTAGÉ (mêmes réponses des deux, signalé comme un risque) : ce n'est pas un écart, aucune question. Sujet proche de la violence (élever la voix, cris, menace) : jamais de question, cela relève des questions de limite de BOLIGO.

EXEMPLES (écart détecté → plusieurs formulations possibles ; ne recopie jamais un exemple mot pour mot, invente ta propre question) :
- Nombre d'enfants différent (2 contre 4) → « Jusqu'à combien d'enfants pourriez-vous réellement aller ? » ou « Quel nombre d'enfants serait pour vous un vrai renoncement ? »
- L'un hésite à avoir des enfants, l'autre en veut absolument → « Si vos positions sur les enfants ne bougeaient jamais, resteriez-vous ensemble ? » ou « Dans dix ans sans enfant, qu'est-ce qui vous manquerait le plus ? »
- L'un épargne presque tout, l'autre dépense pour ses envies → « Sur 1 000 € qui vous restent en fin de mois, combien mettriez-vous de côté à deux ? » ou « Quelle dépense plaisir mensuelle vous semblerait trop élevée dans un couple ? »
- Enfants d'une union précédente, présents chez l'un la plupart du temps → « Si des enfants vivaient chez vous cinq jours sur sept, pourriez-vous le vivre au quotidien ? »
- Temps à deux contre carrière prenante → « Si l'un de vous rentrait après 21 h plusieurs soirs par semaine, pourriez-vous vivre ainsi pendant des années ? »
- Lieu de vie → « Si l'un de vous ne quittait jamais sa ville, pourriez-vous vous y installer pour de bon ? »

CONTRE-EXEMPLES (à ne jamais écrire) :
- Hypothèse retournée : « Si votre partenaire gardait un moment à soi chaque semaine, qu'est-ce que vous ne pourriez pas accepter ? » (on suppose une position puis on demande l'inverse) → demande directement : « Combien de soirées seul(e) par semaine vous sembleraient trop ? »
- Deux alternatives opposées : « Si votre partenaire ne voulait jamais d'enfant, ou en voulait absolument, que feriez-vous ? » → une seule hypothèse, symétrique.
- Liste de choix : « Où en êtes-vous : un oui ferme, un non ferme, ou un vrai doute ? » → une question ouverte.

POINTS NON NÉGOCIABLES (${NON_NEGOTIABLE_TOPICS}) : jamais de compromis ni de terrain d'entente ; confronte chacun à la réalité de la position de l'autre (« si cela ne changeait jamais… »).

SÉCURITÉ : violence, insultes, menaces, contrôle, dépendance à l'alcool, aux drogues ou au jeu sont couverts par les questions de limite écrites par BOLIGO : n'écris jamais de question sur ces sujets, ni seuil personnel, ni plan de protection.

PUDEUR ET NEUTRALITÉ :
- 180 caractères au plus, une seule question ; ne cite jamais les réponses entre guillemets ; ne dis jamais qui a répondu quoi ;
- jamais un revenu, une épargne personnelle, un employeur, un lieu précis, des papiers, l'ethnie, la tribu ou la caste (une somme ronde posée en hypothèse est admise) ;
- intimité : au jour 3 seulement, et seulement ce que les mots veulent dire ou comment chacun dit oui ou non ; jamais une pratique, une expérience ou une fréquence ;
- jamais le corps, l'apparence, la santé ; jamais le récit d'un événement douloureux ;
- aucune morale, aucune « bonne » réponse ; respect de toutes les cultures, croyances et modèles familiaux (famille élargie, dot, polygamie choisie ou refusée).`;

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
1. elle ne porte pas sur un écart réel détecté (accord ou sujet neutre), ou n'a pas de lien avec l'écart cité par ses preuves ;
2. elle passe par un souvenir d'enfance, la famille d'origine, le regard d'un proche, un « angle mort » ou le « sacré » ;
3. elle demande seulement de définir une valeur abstraite (« que représente l'amour pour vous ? », « que pensez-vous de l'argent ? ») ; toute question sur ce que chacun ferait, accepterait, choisirait, supporterait, vivrait, garderait, ou sur ce que l'autre aurait besoin de savoir, est concrète et acceptée, même sans chiffre ;
4. elle redemande telle quelle une réponse de l'entretien (« voulez-vous des enfants ? »), ou répète une question de la liste (même sens, autres mots) ; aller au cran suivant (combien, jusqu'où, à quelles conditions, pendant combien de temps) n'est pas une répétition ;
5. elle mélange plusieurs idées, oppose deux alternatives (« … ou … »), propose une liste de choix, ou emploie du jargon, une étiquette, un diagnostic ou une tournure alambiquée ;
6. elle oriente vers une réponse, juge ou fait la morale ;
7. elle contient une faute, oublie le vouvoiement, cite les réponses entre guillemets ou dit qui a répondu quoi ;
8. elle suppose un passé commun aux deux membres, ou un fait de leur vie absent de l'analyse (invention) ;
9. elle demande un revenu, une épargne personnelle, un employeur, un lieu précis, des papiers, l'ethnie, la tribu ou la caste (une somme ronde posée en hypothèse est admise) ;
10. elle porte sur le corps, l'apparence, la santé, ou demande le récit d'un événement douloureux ou un détail de la vie sexuelle ;
11. elle met en scène la violence, les insultes, les menaces ou le contrôle, ou traite une dépendance avérée comme un comportement à aménager (réservés aux questions de limite de BOLIGO) ; une question sur l'alcool, le tabac ou le jeu comme habitude de vie (fréquence acceptable, ce que l'on pourrait vivre) est admise ;
12. elle invite à un compromis ou à un terrain d'entente sur un point non négociable ; mesurer la TOLÉRANCE de chacun (« pourriez-vous vivre avec… », « combien… pourriez-vous réellement vivre », « pendant combien de temps… », « quelle limite fixeriez-vous ») sur un point de mode de vie (tabac, alcool, jeu, enfants, lieu de vie) n'est PAS un compromis et est accepté ; sécurité, violence et contrôle : jamais ;
13. elle aborde l'intimité ou la sexualité avant le jour 3, ou revient sur un sujet qu'un membre a gardé pour la rencontre ;
14. elle mentionne l'âge, le genre, la ville, ou un écart entre eux ;
15. elle dépasse 180 caractères ;
16. elle présente un modèle culturel, religieux ou familial comme allant de soi, dépassé ou problématique ;
17. elle suppose qu'un membre précis tient une position (« si votre partenaire ne voulait jamais d'enfant ») ou retourne une hypothèse (« si votre partenaire gardait…, qu'est-ce que vous ne pourriez pas accepter ? ») ; une question à laquelle chacun peut répondre depuis sa propre position (« pourriez-vous… », « jusqu'où iriez-vous… », « si l'un de vous… », « si vos positions ne bougeaient pas… ») est réciproque ;
18. elle porte sur un risque partagé (mêmes réponses) ou sur un sujet proche de la violence (élever la voix, cris, menace) ;
19. elle reprend, même reformulé, un exemple de la consigne ;
20. sa version anglaise (« EN ») ne dit pas exactement la même chose, sonne comme une traduction mot à mot, ou enfreint l'une des règles ci-dessus.`;

/**
 * Relecture : un refus doit être une faute nette, citée mot pour mot. Le style
 * (une question claire, concrète et valable pour les deux) n'est jamais un motif.
 */
export const CRITIC_STANCE = `Les questions sont composées par le code dans des CADRES VALIDÉS, réciproques par construction : juge le contenu des cases (lien avec l'écart, fuite, présupposé, fait inventé, attribution), jamais la forme ni le texte fixe du cadre (« qu'est-ce qui vous permettrait de rester », « comment organiseriez-vous… au quotidien », « pourriez-vous le vivre » ne sont ni des compromis ni des présupposés). Tu refuses une question seulement pour une FAUTE NETTE d'une règle ci-dessous, et tu cites dans "extrait" les mots exacts de la question (ou de sa version EN) qui la constituent. Sans extrait précis, tu acceptes.
Ne sont PAS des fautes : une question concrète sur ce que chacun ferait, accepterait, vivrait ou garderait ; « si l'un de vous… », « si l'autre… , comment le vivriez-vous ? », « si vos positions ne bougeaient jamais… » (chacun répond depuis sa propre position) ; une durée, une fréquence ou une somme ronde posée en hypothèse ; l'alcool, le tabac ou le jeu comme habitude de vie ; ce que l'autre aurait besoin de savoir ou de comprendre ; une limite personnelle (« qu'est-ce que vous ne pourriez pas accepter au sujet de… ») qui ne prête rien à l'autre.
Sont des fautes : citer ou laisser deviner la réponse d'un membre (« l'un de vous a répondu… », « comme l'alcool est quotidien pour l'un de vous… ») ; prêter une position à « votre partenaire » ; une hypothèse sur l'autre suivie de « qu'est-ce que vous ne supporteriez pas » ; une question qui n'a de sens que pour l'un des deux (« vous retenir de parier », « arrêter de fumer pour le couple ») ; un fait inventé ; un diagnostic ou une étiquette ; un arrangement sur un point non négociable ; la violence.`;

/** Exemples de relecture : jamais posés aux membres, jamais recopiés. */
export const CRITIC_EXAMPLES = `EXEMPLES (sujets fictifs, à ne pas recopier) :
À ACCEPTER — « Si l'un de vous devait passer deux soirs par semaine en formation pendant un an, comment l'organiseriez-vous ? » ; « Combien de dîners par mois chez des amis vous sembleraient idéals à deux ? » ; « Si vos positions sur le chien ne bougeaient jamais, pourriez-vous vivre ensemble quand même ? » ; « Qu'est-ce que l'autre devrait savoir de votre rythme de sommeil avant de partager un logement ? »
À REFUSER — « L'un de vous ne veut pas de chien : qu'en pensez-vous ? » (règle 7, extrait « L'un de vous ne veut pas de chien ») ; « Si votre partenaire refusait tout animal, pourriez-vous rester ? » (règle 17, extrait « Si votre partenaire refusait tout animal ») ; « Combien de fois par semaine pourriez-vous vous passer de sortir sans l'autre ? » (règle 17, extrait « vous passer de sortir », ne vaut que pour celui qui sort) ; « Votre besoin de calme cache-t-il une fragilité ? » (règle 5, extrait « cache-t-il une fragilité »).`;

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
  /(?<!\p{L})(?:montants?|quel(?:le)? (?:est|sont|serait|seraient) (?:votre|vos) (?:salaire|revenus?|épargne|économies|budget)|(?<!0 à 10, )combien (?:d['’]argent|de partenaires|d['’]amants?|d['’]ex|de dot|seriez-vous prêt|gagn|envoy|épargn|mett|vers|pai|dépens|avez-vous|vous gagnez)\p{L}*|euros?|fcfa|francs? cfa|dollars?|nairas?|dirhams?|employeur|où travaillez|habitez-vous|adresse|titre de séjour|statut migratoire|visa|sans[- ]papiers|vos papiers|situation administrative|(?:votre|vos) (?:ethnie|tribu|caste|origines? ethniques?)|quel(?:le)? (?:ethnie|tribu|caste)|séparation de vos parents|vos (?:futurs |éventuels )?enfants|votre (?:ex|ancien(?:ne)? (?:conjoint\p{L}*|partenaire|compagn\p{L}*|mari|femme|époux|épouse)|dernière relation|précédente? (?:relation|union)|précédent mariage|premier mariage|rupture|veuvage|divorce)|fai(?:t|re|tes) l['’]amour|rapports? sexuels?|relations? sexuelles?|(?:votre|la) première fois|fantasme\p{L}*|virginité|rendre vivable|vivable|rapprocher vos positions|terrain (?:d['’]entente|commun)|(?:trouver|faire) (?:un |des )?compromis|voie médiane|juste milieu)(?!\p{L})|[€$£]/iu;

/**
 * Compromis ou « vivre avec » : interdit sur un point non négociable (foi
 * exigée, conversion, enfants, polygamie, pays de vie, condition déclarée),
 * dans une question comme dans une lecture.
 */
export const COMPROMISE =
  /(?<!\p{L})(?:rendre vivable|vivable|rapprocher vos positions|terrain (?:d['’]entente|commun)|compromis|concessions?|concilier (?:vos|leurs|les deux) (?:positions|visions|croyances|religions)|voie médiane|juste milieu|pas[^?.]{0,30} vers l['’]autre|chacun (?:fait|ferait|pourrait faire) (?:un|des) (?:pas|efforts?)|trouve\p{L}* un chemin|conversion progressive|eau dans (?:son|votre|leur) vin|mi-chemin|équilibre (?:à|reste à) trouver|trouver un équilibre|arrangement|accommodement|s['’]adapter l['’]un à l['’]autre|(?:pourra|devra|pourrait|pourrez|devrez) s['’]adapter|lâcher du lest|céder)(?!\p{L})/iu;

export function isIntrusiveQuestion(text: string): boolean {
  return INTRUSIVE.test(neutralizeHypotheticalSum(text));
}

/**
 * Somme ronde posée en hypothèse (« Sur 1 000 € qui vous restent… ») : ce
 * n'est pas une demande de revenu, et « combien mettriez-vous » y demande une
 * part, pas le montant de son épargne.
 */
export function neutralizeHypotheticalSum(text: string): string {
  const AMOUNT =
    /(?<!\p{L})sur (?:\d[\d\s\u202f.]*)\s?(?:€|euros?)(?!\p{L})/giu;
  // Au conditionnel (« combien mettriez-vous de côté… »), une répartition
  // envisagée, pas le montant de son épargne actuelle.
  text = text.replace(
    /(?<!\p{L})combien (?=(?:mett|épargn|dépens|vers|envoy)\p{L}*riez(?!\p{L}))/giu,
    'quelle part ',
  );
  // Seuil (« à partir de quel montant… », « jusqu'à quelle somme… ») : une
  // limite envisagée, pas un revenu ni une épargne.
  text = text.replace(
    /(?<!\p{L})(à partir de|jusqu['’]à|au-delà de) (?:quel(?:le)?) (?:montant|somme)(?!\p{L})/giu,
    '$1 quel seuil',
  );
  if (!AMOUNT.test(text)) return text;
  return text
    .replace(AMOUNT, 'sur une somme donnée')
    .replace(
      /(?<!\p{L})combien (?=mett|épargn|dépens|vers|envoy)/giu,
      'quelle part ',
    );
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
  "partiriez|quitteriez|resteriez(?![- ]vous (?:à l['’]aise|serein|sereine|calme|tranquille|confortable))|romp|rupture|mettre fin|vous retiendrait dans la relation|renonceriez|ferai(?:t|ent) quitter(?! la (?:pièce|table|conversation|salle))|ferai(?:t|ent) partir",
);
/**
 * Ultimatum sans issue, refusé même dans une question de confrontation
 * (« Si…, resteriez-vous ? » est admis : c'est la réalité à regarder en face).
 */
const ULTIMATUM_HARD = prefix(
  'partiriez|quitteriez|romp|rupture|mettre fin|vous retiendrait dans la relation|renonceriez|ferai(?:t|ent) quitter(?! la (?:pièce|table|conversation|salle))|ferai(?:t|ent) partir',
);

/**
 * Question de confrontation à la réalité, propre à l'IA et à un écart réel :
 * une hypothèse concrète (« Si… ») suivie d'un conditionnel adressé au membre
 * (« pourriez-vous… ? », « resteriez-vous ? »). Elle peut se répondre par oui
 * ou non : la réponse libre de 500 caractères laisse la place de nuancer.
 */
export function isRealityCheck(text: string): boolean {
  const t = text.trim();
  // « Si…, pourriez-vous / resteriez-vous / cela vous irait-il… ? »
  if (
    /^si\s[^?]{8,},\s*[^?]*(?<!\p{L})\p{L}+-(?:t-)?(?:vous|il|elle|ce)(?!\p{L})[^?]*\?$/iu.test(
      t,
    )
  )
    return true;
  // Question fermée portant sur une durée ou une quantité concrète
  // (« Pourriez-vous attendre encore trois ans… ? ») : réalité, pas façade.
  return /(?<!\p{L})(?:\d+|un|une|deux|trois|quatre|cinq|six|sept|huit|dix|vingt)\s+(?:ans?|mois|semaines?|jours?|nuits?|soirs?|soirées?|heures?|km|€|euros?)(?!\p{L})/iu.test(
    t,
  );
}

/**
 * Souvenirs d'enfance, famille d'origine, regard d'un proche, « angle mort »
 * ou « sacré » : l'IA du Sondeur ne les emploie plus (fiche jugée hors sujet).
 */
export const ORIGIN_DETOUR =
  /(?<!\p{L})(?:dans votre famille|dans la famille où|(?:où|là où) vous avez grandi|maison où vous avez grandi|un proche qui vous (?:connaît|a vu)|vos proches diraient|chez vous,\s*qui|à quoi (?:la|le|les|l['’]) ?reconna[iî]t-on|angle mort|sacré)(?!\p{L})/iu;

/**
 * Deux alternatives opposées dans une même question (« s'il ne voulait jamais
 * d'enfant, ou en voulait absolument, que feriez-vous ? »), ou liste de
 * choix (« un oui ferme, un non ferme, ou un vrai doute ? ») : deux idées.
 */
export const TWO_ALTERNATIVES =
  /(?<!\p{L})(?:voul|voudr|refus|accept|souhait|rest|gard|quitt)\p{L}*[^?]{0,80}?,?\s+ou\s+(?:(?:en|s['’]|si|qu['’](?:il|elle)|il|elle|le|la|les|y)\s*)*(?:voul|voudr|refus|accept|souhait|rest|gard|quitt)\p{L}*|:\s*[^?:]{2,40},\s*[^?:]{2,40},?\s+ou\s+[^?]{2,40}\?\s*$|,\s*ou\s+[^,?]{2,60},\s*que\s/iu;

/**
 * Hypothèse qui ne vise que l'un des deux : prêter au partenaire une position
 * sur l'écart (« si votre partenaire ne voulait jamais d'enfant… ») n'a de
 * sens que pour celui qui tient la position opposée. La même question est
 * posée aux deux : l'écart se formule de façon symétrique.
 */
export const ONE_SIDED =
  /^si votre partenaire (?:ne |n['’])?(?:voul|voudr|refus|accept|souhait|ten)\p{L}*/iu;

/**
 * Hypothèse retournée : on suppose une position de l'autre, puis on demande ce
 * que l'on n'accepterait pas (« si votre partenaire gardait un moment à soi,
 * qu'est-ce que vous ne pourriez pas accepter ? »).
 */
export const REVERSED_HYPOTHESIS =
  /^si\s[^?]+,\s*(?:qu['’]est-ce que vous (?:ne pourriez (?:pas|plus) (?:accepter|supporter|tolérer|vivre)|ne supporteriez (?:pas|plus)|n['’]accepteriez (?:pas|plus)|ne toléreriez (?:pas|plus))|que ne (?:pourriez|supporteriez|accepteriez|toléreriez)-vous pas|qu['’]est-ce qui vous serait (?:insupportable|inacceptable|intolérable)|où (?:serait|placeriez-vous|mettriez-vous) (?:votre|la) limite)/iu;

/**
 * Effort à sens unique : la question demande de renoncer à son propre
 * comportement sur l'écart (« vous retenir de parier », « arrêter de fumer
 * pour le couple », « réduire vos dépenses plaisir ») ; elle n'a de sens que
 * pour celui qui le pratique.
 */
export const ONE_WAY_EFFORT =
  /(?<!\p{L})(?:vous retenir|vous empêcher|vous passer|vous abstenir|arrêter|cesser|renon\p{L}*|réduire|rédui\p{L}*|diminuer|limiter|modérer|freiner|décrocher)\s+(?:de\s+|d['’]|à\s+)?(?:vos\s+|votre\s+|vos\s+propres\s+|la\s+|le\s+|les\s+|l['’])?(?:boire|fumer|jouer|parier|miser|dépenser|consommation|envies|tabac|alcool|cigarettes?|paris|jeux?(?! de société)|verres?|dépenses(?: plaisir)?|achats? plaisir|sorties)(?!\p{L})/iu;

/** Présupposé d'un penchant (« qu'est-ce qui vous attire tant dans… »). */
export const PRESUPPOSED_PULL =
  /(?:qu['’]est-ce qui|que(?:l(?:le)?s?)? [^?]{0,20}) vous (?:attire|plaît|pousse|retient|tente|manque) (?:tant|autant|si fort|tellement)|frisson du jeu/iu;

/** Morale ou « bonne réponse » suggérée. */
export const MORALE = word(
  "devriez|devrait|devraient|(?<=(?:on|chacun|un homme|une femme|un mari|une épouse|un conjoint|une conjointe|le mari|la femme|l['’]homme) )doit|doit-(?:on|il|elle)|(?<=(?:les hommes|les femmes|les maris|les épouses) )doivent|dois|(?<!qu'il )faut|bonne réponse|normale?|anormale?|mauvaise?|immature|bien ou mal|coupable|tendance",
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
  'vous|votre|vos|vôtres?|pensez|imaginez|rappelez|souvenez|décrivez|choisissez|citez|dites|prenez|regardez',
);
/** Question impersonnelle sur le sens d'un mot (« Que veut dire « respecter »… ? »). */
const IMPERSONAL =
  /^\s*(?:que veut dire|que signifie|qu['’]est-ce que (?:veut dire|signifie))(?!\p{L})/iu;
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
  /(?<!\p{L})(?:quelle somme|ethni\p{L}*|tribus?|castes?|mariage précédent|union précédente|fréquence[^?]{0,40}intim\p{L}*|intim\p{L}*[^?]{0,40}fréquence|quel traitement|traitement (?:suivez|prenez|médical)|combien (?:touchez|percevez|gagnez|empochez)|que gagnez|(?:votre|son) salaire|ancienne relation|parents (?:se sont |étaient )?séparés|vos ex(?!\p{L})|premier baiser|fréquence (?:de vos|des) (?:moments|rapports|relations) intimes|(?:où|dans quelle ville)[^?]{0,30}vivent vos parents|pays d['’]origine|(?:dans )?quel(?:le)? (?:quartier|village|immeuble|entreprise|société)|votre origine|originaire|\d{2} ans|écart d['’]âge|votre âge)(?!\p{L})/iu;
/** Violence présentée comme excusable, pardonnable ou réparable. */
export const VIOLENCE_NORMALIZE =
  /(?<!\p{L})(?:gifl|frapp|coups?(?!\p{L})|violen|insult|menac|mots blessants|geste brusque|geste déplacé|bouscul)\p{L}*[^?]{0,60}(?:excus|justifi|réconcili|pardonn|répar|vivable|tourner la page|passer l['’]éponge)|(?<!\p{L})(?:excus|justifi|réconcili|pardonn|répar)\p{L}*[^?]{0,60}(?:gifl|frapp|coups?(?!\p{L})|violen|insult|menac|mots blessants|geste brusque|geste déplacé|bouscul)/iu;
/** Trait de caractère ou difficulté présupposés (« votre jalousie », « avez-vous du mal à »). */
export const PRESUPPOSED =
  /(?<!\p{L})(?:votre (?:jalousie|possessivité|méfiance|colère|immaturité|égoïsme|besoin de contrôle)|(?:avez|auriez)-vous du mal à|vous empêche encore|encore d['’]accepter|toujours pas|encore (?:nécessaire|utile|d['’]actualité|pertinente?)|dépassée?s?|archaïques?|d['’]un autre temps)(?!\p{L})/iu;

/** Bonnes questions données en exemple dans la consigne : jamais recopiées. */
export const LENS_EXAMPLES = [
  ...(CLINICAL_LENS.split('EXEMPLES (écart détecté')[1] ?? '')
    .split('CONTRE-EXEMPLES')[0]
    .matchAll(/« ([^»]+\?) »/g),
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
export const STAGED_HARM =
  /(?<!\p{L})(?:gifl\p{L}*|(?<!(?:qui|qu['’]est-ce qui) vous (?:a )?)frapp\p{L}*|cogn\p{L}*|battr\p{L}*|bat(?:tu|tue|tait)|coups?(?! de (?:cœur|coeur|foudre|main|fil|pouce|tête|chance))|violen\p{L}*|étrangl\p{L}*|(?:le plus |la plus )bless\p{L}*|bless\p{L}* (?:dans|pendant|durant) (?:votre|ton) enfance|humili\p{L}*|lis\p{L}* vos messages|fouill\p{L}* (?:votre|vos)|à l['’]abri|(?<![-\p{L}])vous protéger|vous réfugier|(?<!jusqu['’])où iriez|(?:le )?code de (?:votre|son) téléphone|accès à (?:votre|son|leur) téléphone|bouscul\p{L}*|l[eè]v\p{L}* la main|petite tape|cri\p{L}* dessus|contrôl\p{L}* (?:vos|ses|son|sa|le|les|votre) (?:dépenses|téléphone|messages|sorties|fréquentations)|par amour)(?!\p{L})/iu;

/** Arrangement ou concession sur un sujet non négociable, dans une question de l'IA. */
const NN_ARRANGEMENT =
  /(?:seconde|deuxième|autre|nouvelle) épouse|coépouse|(?:mettre|trouver) d['’]accord sur (?:la religion|la foi|les enfants|la polygamie|le pays|la conversion)|devenir acceptable|à mi-(?:temps|chemin)|(?:religion|foi|polygamie|conversion|enfants)[^?]{0,40}(?:céder|lâcher|assouplir|renoncer)/iu;

/**
 * Sujets de sécurité : couverts par les questions de limite écrites par
 * BOLIGO. Une question de l'IA qui les nomme, même sans les mettre en scène,
 * est écartée.
 */
export const SAFETY_TOPIC =
  /(?<!\p{L})(?:gifl\p{L}*|claques?|(?<!(?:qui|qu['’]est-ce qui) vous (?:a )?)frapp\p{L}*|cogn\p{L}*|(?<!(?:tout |à ))coups?(?! de (?:cœur|coeur|foudre|main|fil|pouce|tête|chance|génie))|violen\p{L}*|empoign\p{L}*|serr\p{L}* le cou|étrangl\p{L}*|bouscul\p{L}*|cris|crier|hurl\p{L}*|insult\p{L}*|trait\p{L}* de (?!vos|votre|famille)\p{L}+|humili\p{L}*|rabaiss\p{L}*|menac\p{L}*|contrôl\p{L}*|(?<!entre (?:la )?confiance et (?:la )?)surveill\p{L}*|espionn\p{L}*|fouill\p{L}*|mots? de passe|en cachette|rendre compte de chaque|partir avec les enfants|dormir ce soir|chez qui pourriez|dégénér\p{L}*|invivable|lever la main|ne plus voir vos|(?:connaître )?votre code|vérifi\p{L}* où vous|où vous êtes|décid\p{L}* seul\p{L}* de vos|vos sorties|votre passeport|jet\p{L}* vos affaires|punitions?|punir|hausser la voix|lever le ton|(?:permission|autorisation) (?:de|pour|avant de) (?:sortir|travailler|voir|dépenser|partir)|demander (?:la permission|l['’]autorisation))(?!\p{L})/iu;
/**
 * Prémisse affirmée avant la question (« Puisque l'un de vous a déjà deux
 * enfants… », « Comme l'alcool est quotidien pour l'un de vous… ») : un fait
 * présenté comme acquis, souvent la réponse de l'un des deux.
 */
export const ASSERTED_PREMISE =
  /^(?:puisque|comme|vu que|étant donné que|sachant que|maintenant que|alors que)(?!\p{L})|(?<!\p{L})(?:pour|chez) l['’]un (?:de vous|d['’]entre vous)(?!\p{L})/iu;

/** Deux interrogatifs coordonnés (« jusqu'où et combien de temps ») : deux idées. */
export const TWO_INTERROGATIVES =
  /(?<!\p{L})(?:jusqu['’]où|combien|comment|quand|pourquoi|où|quel(?:le)?s?|à quel point)(?:\s+[^\s?,]+){0,2}?\s+et\s+(?:jusqu['’]où|combien|comment|quand|pourquoi|où|quel(?:le)?s?|à quel point)(?!\p{L})/iu;

/** Sujet voisin de la violence verbale : relève des questions de limite. */
export const ELEVATED_VOICE =
  /(?<!\p{L})(?:élev\p{L}* la voix|monte(?:r|nt)? le ton|cri(?:s|ait|aient|erait)?|menaç\p{L}*)(?!\p{L})/iu;
/** Seuil personnel de tolérance (« à partir de combien de cris… »). */
const THRESHOLD =
  /(?:à partir de (?:quand|combien|quel moment)|jusqu['’]où)[^?]{0,60}(?:accept|tolér|support|invivable|trop|limite|parler de|aller)/iu;
/** Sujet non négociable dans une question : aucun arrangement proposé. */
const NN_QUESTION_TOPIC =
  /(?<!\p{L})(?:foi|relig\p{L}*|pri(?:e|ère|ent|ez)\p{L}*|conver\p{L}*|polygam\p{L}*|pays|enfants?|fidélité|pratique)(?!\p{L})/iu;
const ARRANGE =
  /(?<!\p{L})(?:concili\p{L}*|intermédiaire|acceptable|lâcher|raisonnables?|céder|renoncer|sacrifier|assouplir|compromis|mi-chemin|terrain d['’]entente|formule|entre parenthèses|mettre de côté|mettre en pause)(?!\p{L})/iu;

/** Tournures alambiquées refusées dans une question de l'IA (franchise). */
export const HEDGED =
  /(?:vous permet(?:tent)? de (?:protéger|préserver)|dans ce souhait|qu['’]est-ce qui,? pour vous,|dans quelle mesure|que signifie pour vous|qu['’]évoque pour vous)/iu;

export function isWellFormedQuestion(text: string): boolean {
  const t = text.trim();
  const reality = isRealityCheck(t);
  // Confrontation à la réalité : une somme ronde posée en hypothèse n'est pas
  // une demande de revenu ; « Si votre partenaire… » parle d'un futur
  // conjoint, pas d'un passé commun.
  let forForm = neutralizeHypotheticalSum(t).replace(
    /^si votre partenaire(?!\p{L})/iu,
    'Si la personne choisie',
  );
  // En hypothèse, « votre couple » ou « cette relation » parlent du couple
  // à venir, pas d'un passé commun.
  if (/^si\s/iu.test(t))
    forForm = forForm
      .replace(
        /(?<!\p{L})(?:votre couple|cette relation)(?!\p{L})/giu,
        'le couple',
      )
      // « Si l'école de vos enfants… » : des enfants à venir, pas présupposés.
      .replace(/(?<!\p{L})vos enfants(?!\p{L})/giu, 'des enfants');
  // « Que devrait savoir l'autre… » : une attente, pas une morale (« vous
  // devriez » reste refusé).
  forForm = forForm.replace(
    /(?<!\p{L})devrai(?:t|ent)(?!\p{L})/giu,
    'pourrait',
  );
  return (
    !HEDGED.test(t) &&
    t.split(/\s+/).length <= 22 &&
    passesFormRules(forForm, { realityCheck: reality }) &&
    !STAGED_HARM.test(t) &&
    !SAFETY_TOPIC.test(
      t.replace(/frontière entre[^?]{0,40}?(?:surveill\p{L}*)/iu, 'frontière'),
    ) &&
    // « Jusqu'où… » est une confrontation à la réalité ; le seuil de
    // tolérance reste refusé dès qu'il touche la sécurité.
    !(THRESHOLD.test(t) && (SAFETY_TOPIC.test(t) || STAGED_HARM.test(t))) &&
    !(NN_QUESTION_TOPIC.test(t) && ARRANGE.test(t)) &&
    !NN_ARRANGEMENT.test(t) &&
    !LENS_EXAMPLES.some((e) => similarQuestions(e, t) || e === t)
  );
}

/**
 * Règles de forme communes aux gabarits écrits par l'équipe et aux questions
 * de l'IA (sans le contrôle des exemples de la consigne, réservé à l'IA).
 */
export function passesFormRules(
  text: string,
  opts: { realityCheck?: boolean } = {},
): boolean {
  const t = text.trim();
  const marks = (t.match(/\?/g) ?? []).length;
  return (
    t.length >= 20 &&
    t.length <= MAX_QUESTION_LENGTH &&
    t.endsWith('?') &&
    marks <= 2 &&
    quotesAllowed(t) &&
    (isOpenQuestion(t) || !!opts.realityCheck) &&
    !hasClinicalJargon(t) &&
    !hasInterpretation(t) &&
    !isIntrusiveQuestion(t) &&
    !REPORTS_ANSWER.test(t) &&
    !(opts.realityCheck ? ULTIMATUM_HARD : ULTIMATUM).test(t) &&
    !MORALE.test(t) &&
    !MORALE_PREFIX.test(t) &&
    !SHARED_PAST.test(t) &&
    !BODY_HEALTH.test(t) &&
    !SEXUAL_DETAIL.test(t) &&
    !PAINFUL_STORY.test(t) &&
    !TUTOIEMENT.test(t) &&
    !TUTOIEMENT_IMPERATIVE.test(t) &&
    !isDoubleQuestion(t) &&
    (VOUVOIEMENT.test(t) || IMPERSONAL.test(t)) &&
    !INTRUSIVE_MORE.test(t) &&
    !VIOLENCE_NORMALIZE.test(t) &&
    !PRESUPPOSED.test(t)
  );
}

/**
 * Règles propres au rédacteur du Sondeur (écarts réels) : une question vaut
 * pour les deux membres, porte une seule idée, ne retourne pas une hypothèse
 * et laisse la violence verbale aux questions de limite.
 */
export function gapQuestionIssues(text: string): string[] {
  const t = text.trim();
  const r: string[] = [];
  if (TWO_ALTERNATIVES.test(t))
    r.push('P19 deux alternatives opposées ou liste de choix');
  if (ONE_SIDED.test(t)) r.push('P20 hypothèse qui ne vise que l’un des deux');
  if (REVERSED_HYPOTHESIS.test(t)) r.push('P21 hypothèse retournée');
  if (/^(?:chez vous|dans votre famille)(?!\p{L})/iu.test(t))
    r.push('P23 commence par « Chez vous » ou « Dans votre famille »');
  if (ASSERTED_PREMISE.test(t))
    r.push('P25 prémisse affirmée (fait ou réponse présentés comme acquis)');
  if (
    TWO_INTERROGATIVES.test(t) ||
    /,\s*et\s+(?:à\s+|de\s+|en\s+)?(?:quel(?:le)?s?|comment|combien|quand|pourquoi|où)(?!\p{L})/iu.test(
      t,
    )
  )
    r.push('P24 deux interrogatifs coordonnés (une seule idée)');
  if (ELEVATED_VOICE.test(t))
    r.push('P22 sujet voisin de la violence (questions de limite)');
  if (ONE_WAY_EFFORT.test(t))
    r.push('P26 effort à sens unique (ne vaut que pour l’un des deux)');
  if (PRESUPPOSED_PULL.test(t))
    r.push('P27 penchant présupposé (« ce qui vous attire tant »)');
  return r;
}

const EN = (s: string) => new RegExp(s, 'i');
/** Mêmes règles du rédacteur, sur la version anglaise. */
const GAP_RULES_EN: Array<[RegExp, string]> = [
  [
    EN(
      "^if (?:your partner|the other(?: person)?) (?:didn't |did not |never |doesn't |does not )?(?:want|refus|accept|insist|rul|drank|drink|smok|gambl|bet|spent|spend|kept|keep|sav)",
    ),
    'EN-P20 hypothèse qui ne vise que l’un des deux',
  ],
  [
    EN(
      "your partner (?:has|had|is|was|'s) (?:ruled|decided|refused|chosen|set on|against|unsure|not sure|certain)|your partner (?:doesn't|does not|won't|will not) want",
    ),
    'EN-P20 position prêtée au partenaire',
  ],
  [
    EN(
      "^if [^?]+, (?:where would you draw the line|what (?:couldn't|could not|wouldn't|would not) you (?:accept|tolerate|stand|live with)|what would be (?:unbearable|unacceptable))",
    ),
    'EN-P21 hypothèse retournée',
  ],
  [
    EN(
      "^(?:since|as|given that|now that|because|considering)\\b|\\bfor one of you\\b|\\bone of you (?:is|isn't|is not|has|hasn't|was|doesn't|does not|can't|cannot)\\b",
    ),
    'EN-P25 prémisse affirmée',
  ],
  [
    EN(
      '\\b(?:and|or) (?:what|how|when|why|where|which) (?:would|could|do|did|will|is|are|should|might|can)\\b',
    ),
    'EN-P24 deux questions en une',
  ],
  [
    EN(
      '\\b(?:growing up|your parents|in your family|as a child|childhood|your mother|your father|someone who knows you)\\b',
    ),
    'EN-P15 détour par l’enfance, la famille d’origine ou un proche',
  ],
  [
    EN(
      "\\b(?:wouldn't you agree|don't you think|can't work|cannot work|simply can't|isn't it clear|admit that)\\b",
    ),
    'EN conclusion forcée',
  ],
  [
    EN(
      '\\b(?:split the difference|meet (?:in the middle|halfway)|halfway between|middle ground|compromise)\\b',
    ),
    'EN compromis proposé',
  ],
  [
    EN(
      '\\b(?:addict\\w*|in denial|transgenerational|codependen\\w*|attachment style|toxic|trauma\\w*|narciss\\w*|disorder|patholog\\w*|anxious temperament)\\b',
    ),
    'EN jargon ou diagnostic',
  ],
  [
    EN(
      '\\b(?:tell us|let us know|could you say) (?:whether|if) you\\b|^do you (?:smoke|drink|gamble|want (?:kids|children)|believe in)\\b',
    ),
    'EN redemande une réponse de l’entretien',
  ],
  [
    EN(
      '\\b(?:hold (?:yourself )?back from|stop (?:smoking|drinking|gambling|betting|spending)|cut (?:back|down) on your|give up your (?:drinking|smoking|gambling|bets|spending|treats))\\b',
    ),
    'EN-P26 effort à sens unique',
  ],
];

/** Règles du rédacteur du Sondeur appliquées à la version anglaise. */
export function gapQuestionIssuesEn(textEn: string | undefined): string[] {
  // Apostrophe typographique ramenée à la forme droite des motifs.
  const t = (textEn ?? '').replace(/[’`]/g, "'").trim();
  if (!t) return [];
  return GAP_RULES_EN.filter(([re]) => re.test(t)).map(([, why]) => why);
}
