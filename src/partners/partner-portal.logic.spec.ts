import {
  hashPortalToken,
  isPortalToken,
  monthlyHistory,
  newPortalToken,
  portalLink,
} from './partner-portal.logic';

describe('Espace partenaire : lien privé et historique', () => {
  it('fabrique un lien imprévisible dont seule l’empreinte est gardée', () => {
    const a = newPortalToken();
    const b = newPortalToken();
    expect(isPortalToken(a.token)).toBe(true);
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashPortalToken(a.token));
    expect(a.hash).not.toContain(a.token);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(isPortalToken('court')).toBe(false);
    expect(isPortalToken(`${a.token}"; drop`)).toBe(false);
    expect(isPortalToken(42)).toBe(false);
  });

  it('place le jeton après « # », dans la langue du partenaire', () => {
    expect(portalLink('abc', 'fr', 'https://site.test/')).toBe(
      'https://site.test/espace-partenaire#abc',
    );
    expect(portalLink('abc', 'en', 'https://site.test')).toBe(
      'https://site.test/partner-space#abc',
    );
  });

  it('regroupe les achats par mois sur douze mois, du plus récent au plus ancien', () => {
    const now = new Date('2026-10-15T12:00:00Z');
    const lines = monthlyHistory(
      [
        { date: new Date('2026-10-02T09:00:00Z'), euroAmount: 13.5 },
        { date: new Date('2026-10-20T09:00:00Z'), euroAmount: 13.5 },
        { date: new Date('2026-08-31T23:00:00Z'), euroAmount: 15 },
        { date: new Date('2026-09-10T09:00:00Z'), euroAmount: null },
        { date: new Date('2025-09-30T09:00:00Z'), euroAmount: 99 },
      ],
      15,
      now,
    );
    expect(lines).toHaveLength(12);
    expect(lines[0]).toEqual({
      month: '2026-10',
      purchases: 2,
      revenue: 27,
      commission: 4.05,
    });
    expect(lines[1]).toMatchObject({
      month: '2026-09',
      purchases: 1,
      revenue: 0,
    });
    expect(lines[2]).toMatchObject({
      month: '2026-08',
      revenue: 15,
      commission: 2.25,
    });
    expect(lines[11].month).toBe('2025-11');
    expect(lines.reduce((n, l) => n + l.purchases, 0)).toBe(4);
  });

  it('ne calcule pas de commission sans taux (marques et annonceurs)', () => {
    const [line] = monthlyHistory(
      [{ date: new Date('2026-10-02T09:00:00Z'), euroAmount: 15 }],
      null,
      new Date('2026-10-15T12:00:00Z'),
      1,
    );
    expect(line).toEqual({
      month: '2026-10',
      purchases: 1,
      revenue: 15,
      commission: 0,
    });
  });
});
