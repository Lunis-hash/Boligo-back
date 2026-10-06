import {
  SPACE_CONTENT,
  discountLabel,
  formatEuro,
  formatMonth,
  readPortalToken,
} from '../space-content';

const TOKEN = 'A'.repeat(20) + '_-' + 'b9'.repeat(10) + 'z';

describe('Espace partenaire : textes et formats', () => {
  it('lit le jeton placé après « # » et ignore tout le reste', () => {
    expect(TOKEN).toHaveLength(43);
    expect(readPortalToken(`#${TOKEN}`)).toBe(TOKEN);
    expect(readPortalToken(TOKEN)).toBe(TOKEN);
    expect(readPortalToken('')).toBeNull();
    expect(readPortalToken('#court')).toBeNull();
    expect(readPortalToken(`#${TOKEN}<script>`)).toBeNull();
    expect(readPortalToken(undefined)).toBeNull();
  });

  it('affiche montants, mois et réductions dans la langue choisie', () => {
    expect(formatEuro(6.08, 'fr').replace(/\s/g, ' ')).toBe('6,08 €');
    expect(formatEuro(6.08, 'en')).toBe('€6.08');
    expect(formatMonth('2026-10', 'fr')).toBe('Octobre 2026');
    expect(formatMonth('2026-10', 'en')).toBe('October 2026');
    const base = { code: 'AWA42', isActive: true, expiresAt: null, uses: 0 };
    expect(discountLabel({ ...base, discountType: 'percent', discountValue: 10 }, 'fr')).toBe('-10 %');
    expect(discountLabel({ ...base, discountType: 'percent', discountValue: 10 }, 'en')).toBe('-10%');
    expect(discountLabel({ ...base, discountType: 'fixed', discountValue: 500 }, 'fr').replace(/\s/g, ' ')).toBe(
      '-5,00 €',
    );
    expect(discountLabel({ ...base, discountType: 'free', discountValue: 0 }, 'en')).toBe('Free Journey');
  });

  it('a les mêmes rubriques en français et en anglais, avec le rappel publicitaire', () => {
    const fr = SPACE_CONTENT.fr;
    const en = SPACE_CONTENT.en;
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    expect(fr.rules.length).toBe(en.rules.length);
    expect(fr.rules.join(' ')).toMatch(/Collaboration commerciale/);
    expect(en.rules.join(' ')).toMatch(/#ad/);
    expect(fr.contact).toContain('contact@boligo.fr');
    expect(fr.kpiCommission(15)).toBe('Votre commission (15 %)');
  });
});
