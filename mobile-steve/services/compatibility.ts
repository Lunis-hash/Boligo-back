/**
 * Lecture des divergences entre deux profils à partir des affinités par module
 * renvoyées par le backend (GET /matching/discover → mentalMap[], un élément
 * par module du Grand Entretien : m0 … m10).
 *
 * Esprit BOLIGO : une divergence n'est pas un motif de « swipe », c'est un sujet
 * à aborder franchement. Les modules faibles deviennent des axes de discussion.
 * Ce repli ne sert que si le serveur n'a pas déjà fourni ses sujets.
 */
export interface PillarLike {
  id: string;
  label: string;
  /** null : module sans réponse comparable (ignoré). */
  value: number | null;
}

export interface DiscussionTopic {
  id: string;
  title: string;
  prompt: string;
}

/** Sous ce pourcentage, le pilier est considéré comme une divergence. */
export const DIVERGENCE_THRESHOLD = 60;
/** Sous ce score global, on parle de divergence majeure. */
export const MAJOR_DIVERGENCE_SCORE = 55;
export const MAX_TOPICS = 3;

const TOPICS: Record<string, Omit<DiscussionTopic, 'id'>> = {
  // Modules du Grand Entretien
  m0: {
    title: 'Vos critères essentiels',
    prompt: "Enfants, déménagement, hygiène de vie : qu'est-ce qui est non négociable pour chacun de vous ?",
  },
  m1: {
    title: 'Votre culture et votre foi',
    prompt: 'Quelle place la foi et les traditions auront-elles dans votre foyer et votre mariage ?',
  },
  m2: {
    title: "Votre façon d'aimer",
    prompt: "De quoi avez-vous besoin pour vous sentir en sécurité quand l'autre prend ses distances ?",
  },
  m3: {
    title: 'Votre vécu',
    prompt: "Qu'avez-vous appris de vos relations passées que vous ne voulez plus revivre ?",
  },
  m4: {
    title: "L'argent dans le couple",
    prompt: 'Comment imaginez-vous le partage des dépenses, de l’épargne et des projets à deux ?',
  },
  m5: {
    title: 'La place de la famille',
    prompt: 'Quel rôle vos familles auront-elles dans vos décisions de couple ?',
  },
  m6: {
    title: 'Communication et intimité',
    prompt: 'Comment souhaitez-vous traverser un désaccord, et que signifie la fidélité pour vous ?',
  },
  m7: {
    title: 'Votre trajectoire de vie',
    prompt: 'Où vous voyez-vous dans cinq ans, et quel rythme de vie souhaitez-vous partager ?',
  },
  m8: {
    title: 'Votre projet de couple',
    prompt: "Quel engagement recherchez-vous, et dans quel délai l'envisagez-vous ?",
  },
  m9: {
    title: 'Donner et recevoir',
    prompt: 'Comment décidez-vous à deux, et que signifie pour vous un effort réciproque ?',
  },
  m10: {
    title: 'Votre alchimie',
    prompt: "Qu'attendez-vous de l'énergie de l'autre, et que voulez-vous lui apporter ?",
  },
  // Anciens piliers (versions précédentes du serveur)
  valeurs: {
    title: 'Vos valeurs et votre culture',
    prompt: "Qu'est-ce qui, dans vos traditions ou vos convictions, n'est pas négociable pour vous ?",
  },
  attachement: {
    title: "Votre façon d'aimer et de gérer les émotions",
    prompt: "Comment réagissez-vous quand l'autre prend ses distances ou demande plus de proximité ?",
  },
  projet: {
    title: 'Votre projet de vie et la famille',
    prompt: 'Où vous voyez-vous dans cinq ans, et quelle place pour les enfants et la famille ?',
  },
  vecu: {
    title: 'Votre vécu et vos leçons',
    prompt: "Qu'avez-vous appris de vos relations passées que vous ne voulez plus revivre ?",
  },
  mode_de_vie: {
    title: "Votre mode de vie et l'argent",
    prompt: 'Comment imaginez-vous le partage des dépenses et du quotidien à deux ?',
  },
};

const GENERIC_TOPIC: DiscussionTopic = {
  id: 'attentes',
  title: 'Vos attentes respectives',
  prompt: "Qu'attendez-vous concrètement d'une relation sérieuse dans les douze prochains mois ?",
};

function pillarTopic(pillar: PillarLike): DiscussionTopic {
  const known = TOPICS[pillar.id];
  if (known) return { id: pillar.id, ...known };
  const label = pillar.label.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  return {
    id: pillar.id,
    title: label || 'Un point de divergence',
    prompt: `Parlez franchement de « ${label || 'ce point'} » : qu'est-ce qui compte le plus pour chacun de vous ?`,
  };
}

/**
 * Sujets à aborder, du pilier le plus faible au moins faible (3 maximum).
 * Si aucun pilier n'est faible mais que le score global est bas, un sujet
 * générique est proposé pour ne jamais laisser une divergence sans parole.
 */
export function getDiscussionTopics(compatibility: number, pillars: PillarLike[] | undefined): DiscussionTopic[] {
  const weak = (pillars ?? [])
    .filter((p): p is PillarLike & { value: number } => typeof p.value === 'number' && p.value < DIVERGENCE_THRESHOLD)
    .sort((a, b) => a.value - b.value)
    .slice(0, MAX_TOPICS)
    .map(pillarTopic);
  if (weak.length === 0 && compatibility < DIVERGENCE_THRESHOLD) return [GENERIC_TOPIC];
  return weak;
}

/** Divergence majeure : score global bas ou au moins un pilier nettement faible. */
export function hasMajorDivergence(compatibility: number, pillars: PillarLike[] | undefined): boolean {
  if (compatibility < MAJOR_DIVERGENCE_SCORE) return true;
  return (pillars ?? []).some((p) => typeof p.value === 'number' && p.value <= 50);
}
