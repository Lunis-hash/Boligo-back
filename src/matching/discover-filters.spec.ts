import {
  acceptsCandidate,
  birthDateBounds,
  FilterSubject,
  mutuallyAccepted,
  scopeWhere,
} from './discover-filters';

const amina: FilterSubject = {
  age: 25,
  city: 'Paris, France',
  answers: { M0_Q01: 'A', M0_Q02: 'A' }, // ±5 ans, même ville
};
const bernard: FilterSubject = {
  age: 52,
  city: 'Lyon, France',
  answers: { M0_Q01: 'B', M0_Q02: 'D' }, // plus jeune, international
};
const karim: FilterSubject = {
  age: 27,
  city: 'Paris, France',
  answers: { M0_Q01: 'A', M0_Q02: 'A' },
};

describe('Filtres non négociables du Module 0', () => {
  it('applique les critères des deux membres', () => {
    // Bernard accepte Amina (plus jeune, international)…
    expect(acceptsCandidate(bernard, amina)).toBe(true);
    // …mais Amina (±5 ans, même ville) n'accepte pas Bernard : pas de proposition.
    expect(mutuallyAccepted(bernard, amina)).toBe(false);
    expect(mutuallyAccepted(amina, karim)).toBe(true);
  });

  it('compare le pays à l’identique (« Congo » ≠ « Congo RDC »)', () => {
    const grace: FilterSubject = {
      age: 30,
      city: 'Brazzaville, Congo',
      answers: { M0_Q02: 'C' },
    };
    const patrick: FilterSubject = {
      age: 30,
      city: 'Kinshasa, Congo RDC',
      answers: { M0_Q02: 'C' },
    };
    expect(mutuallyAccepted(grace, patrick)).toBe(false);
    const ange: FilterSubject = {
      age: 31,
      city: 'Pointe-Noire, Congo',
      answers: { M0_Q02: 'C' },
    };
    expect(mutuallyAccepted(grace, ange)).toBe(true);
  });

  it('donne des bornes de naissance qui contiennent toute la tranche acceptée', () => {
    const now = new Date('2026-10-05T12:00:00Z');
    const b = birthDateBounds(25, 'A', now)!;
    for (const age of [20, 25, 30]) {
      const born = new Date(now);
      born.setFullYear(born.getFullYear() - age);
      expect(born.getTime()).toBeGreaterThanOrEqual(b.gte!.getTime());
      expect(born.getTime()).toBeLessThanOrEqual(b.lte!.getTime());
    }
    expect(birthDateBounds(25, 'D', now)).toBeUndefined();
  });

  it('pré-filtre la requête sur la ville (local) ou le pays (national)', () => {
    const contains = (t: string) => ({ contains: t, mode: 'insensitive' });
    expect(scopeWhere('Paris, France', 'A')).toEqual({
      OR: [
        { city: contains('Paris') },
        { profile: { is: { displayedCity: contains('Paris') } } },
      ],
    });
    expect(scopeWhere('Lyon, France', 'C')!.OR[0]).toEqual({
      city: contains('France'),
    });
    expect(scopeWhere('Lyon, France', 'D')).toBeUndefined();
    expect(scopeWhere(null, 'A')).toBeUndefined();
  });
});
