import {
  acceptsCandidate,
  birthDateBounds,
  FilterSubject,
  filterCity,
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
    // Une femme de 49 ans, à Lyon, plus jeune que Bernard : Bernard l'accepte…
    const nadia: FilterSubject = {
      age: 49,
      city: 'Lyon, France',
      answers: { M0_Q01: 'C', M0_Q02: 'A' }, // plus âgé, même ville
    };
    expect(acceptsCandidate(bernard, nadia)).toBe(true);
    expect(mutuallyAccepted(bernard, nadia)).toBe(true);
    // …mais Amina (25 ans, ±5 ans, même ville) n'est jamais proposée à Bernard.
    expect(acceptsCandidate(bernard, amina)).toBe(false);
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
    // « Peu importe » reste borné à 5 ans d'écart.
    const any = birthDateBounds(25, 'D', now)!;
    const born = (age: number) => {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - age);
      return d.getTime();
    };
    // « Peu importe » : jusqu'à 10 ans d'écart.
    expect(born(35)).toBeGreaterThanOrEqual(any.gte!.getTime());
    expect(born(15)).toBeLessThanOrEqual(any.lte!.getTime());
    expect(born(13)).toBeGreaterThan(any.lte!.getTime());
    expect(birthDateBounds(null, 'D', now)).toBeUndefined();
  });

  it('pré-filtre la requête sur le pays (local, région, national)', () => {
    const country = {
      OR: [
        { city: { contains: 'France', mode: 'insensitive' } },
        {
          profile: {
            is: { displayedCity: { contains: 'France', mode: 'insensitive' } },
          },
        },
      ],
    };
    expect(scopeWhere('Paris, France', 'A')).toEqual(country);
    expect(scopeWhere('Paris, France', 'B')).toEqual(country);
    expect(scopeWhere('Paris, France', 'C')).toEqual(country);
    expect(scopeWhere('Lyon, France', 'D')).toBeUndefined();
    expect(scopeWhere(null, 'A')).toBeUndefined();
  });

  it("n'accepte jamais plus de 5 ans d'écart, sauf « peu importe » (10 ans au plus)", () => {
    const anyAge = (age: number): FilterSubject => ({
      age,
      city: 'Paris, France',
      answers: { M0_Q01: 'D', M0_Q02: 'D' },
    });
    expect(mutuallyAccepted(anyAge(52), anyAge(19))).toBe(false);
    expect(mutuallyAccepted(anyAge(30), anyAge(35))).toBe(true);
    expect(mutuallyAccepted(anyAge(30), anyAge(40))).toBe(true);
    expect(mutuallyAccepted(anyAge(30), anyAge(41))).toBe(false);
    // Chacun doit entrer dans la limite de l'autre : « même génération » = 5 ans.
    const sameGeneration: FilterSubject = {
      ...anyAge(38),
      answers: { M0_Q01: 'A', M0_Q02: 'D' },
    };
    expect(acceptsCandidate(anyAge(30), sameGeneration)).toBe(true);
    expect(mutuallyAccepted(anyAge(30), sameGeneration)).toBe(false);
    // « Plus jeune » : de 1 à 5 ans de moins.
    const wantsYounger: FilterSubject = {
      ...anyAge(40),
      answers: { M0_Q01: 'B', M0_Q02: 'D' },
    };
    expect(acceptsCandidate(wantsYounger, anyAge(36))).toBe(true);
    expect(acceptsCandidate(wantsYounger, anyAge(30))).toBe(false);
    expect(acceptsCandidate(wantsYounger, anyAge(41))).toBe(false);
  });

  it('filtre sur la ville de résidence, pas sur la ville affichée', () => {
    expect(
      filterCity({
        city: 'Paris, France',
        profile: { displayedCity: 'Paris 11e' },
      }),
    ).toBe('Paris, France');
    expect(
      filterCity({ city: null, profile: { displayedCity: 'Lyon, France' } }),
    ).toBe('Lyon, France');
    expect(filterCity({ city: null, profile: null })).toBeNull();
  });

  it('compare la région (« même région ») et non le pays', () => {
    const at = (city: string): FilterSubject => ({
      age: 30,
      city,
      answers: { M0_Q02: 'B' },
    });
    expect(
      mutuallyAccepted(
        at('Lyon, Auvergne-Rhône-Alpes, France'),
        at('Grenoble, Auvergne-Rhône-Alpes, France'),
      ),
    ).toBe(true);
    expect(
      mutuallyAccepted(
        at('Lyon, Auvergne-Rhône-Alpes, France'),
        at('Paris, Île-de-France, France'),
      ),
    ).toBe(false);
    // « Ville, Pays » sans région retrouvée : le pays fait foi.
    expect(mutuallyAccepted(at('Paris, France'), at('Lyon, France'))).toBe(
      true,
    );
  });

  it('« Près de chez moi » : même région dans tous les pays', () => {
    const at = (city: string, region: string | null): FilterSubject => ({
      age: 39,
      city,
      region,
      answers: { M0_Q02: 'A' },
    });
    // Argenteuil et Bezons (saisie « 95870 ») : Île-de-France.
    expect(
      mutuallyAccepted(
        at('Argenteuil, France', 'Île-de-France'),
        at('95870, France', 'Île-de-France'),
      ),
    ).toBe(true);
    expect(
      mutuallyAccepted(
        at('Argenteuil, France', 'Île-de-France'),
        at('Lyon, France', 'Auvergne-Rhône-Alpes'),
      ),
    ).toBe(false);
    // Abidjan : Cocody et Yopougon dans le même district.
    expect(
      mutuallyAccepted(
        at('Cocody, Côte d’Ivoire', 'Abidjan'),
        at('Yopougon, Côte d’Ivoire', 'Abidjan'),
      ),
    ).toBe(true);
    expect(
      mutuallyAccepted(
        at('Kinshasa, Congo RDC', 'Kinshasa'),
        at('Lubumbashi, Congo RDC', 'Haut-Katanga'),
      ),
    ).toBe(false);
    // Région introuvable pour l'un : le pays, jamais d'exclusion à tort…
    expect(
      mutuallyAccepted(
        at('Argenteuil, France', 'Île-de-France'),
        at('Bzns, France', null),
      ),
    ).toBe(true);
    // …mais jamais d'un pays à l'autre.
    expect(
      mutuallyAccepted(
        at('Lille, France', null),
        at('Bruxelles, Belgique', null),
      ),
    ).toBe(false);
  });
});
