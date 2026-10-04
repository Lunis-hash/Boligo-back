/**
 * Fiche personnelle d'un membre (bilan de fin d'entretien, onglet Profil),
 * rédigée par le moteur de portraits à partir de son dernier entretien.
 */
import { PrismaService } from '../prisma/prisma.service';
import { collectRawAnswers } from '../matching/divergence.engine';
import { ageFrom } from '../matching/match-view';
import { buildPortrait, Portrait } from './portrait.writer';

// Couleurs de la marque : framboise, lavande, bleu nuit, rose vif, bleu, orchidée.
const PALETTE = [
  '#C62A6E',
  '#7C5CDB',
  '#33287A',
  '#D63F7E',
  '#4E6BD6',
  '#A63DB8',
];

function pastel(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.08)`;
}

/** Cartes du bilan : un module du Grand Entretien par carte. */
export function buildSelfPillars(portrait: Portrait) {
  return portrait.modules.map((m, i) => {
    const color = PALETTE[i % PALETTE.length];
    return {
      id: m.id,
      module: m.module,
      emoji: m.emoji,
      label: m.label,
      tagline: m.tagline,
      percentage: m.clarity,
      color,
      pastel: pastel(color),
      description: m.description,
      metrics: m.keyAnswers.map((k) => ({ label: k.label, answer: k.answer })),
    };
  });
}

export async function loadSelfPortrait(
  prisma: PrismaService,
  userId: string,
): Promise<Portrait | null> {
  const [user, interview, mentalMap] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    }),
    prisma.interviewIA.findFirst({
      where: { userId, status: { in: ['en_cours', 'termine'] } },
      orderBy: { startDate: 'desc' },
      include: { responses: true },
    }),
    prisma.mentalMap.findFirst({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
    }),
  ]);
  if (!user) return null;
  return buildPortrait({
    firstName: user.firstName,
    gender: user.gender === 'F' ? 'F' : user.gender === 'H' ? 'H' : null,
    age: ageFrom(user.birthDate),
    profession: user.profile?.profession ?? null,
    city: user.profile?.displayedCity || user.city || null,
    answers: collectRawAnswers(interview?.responses),
    storedBio: user.profile?.description ?? null,
    storedSynthesis: mentalMap?.synthesis ?? null,
  });
}
