import { CONTENT, PartnerForm, initialPartnerLang, isPartnerFormValid, partnerPayload } from '../content';

const filled: PartnerForm = {
  type: 'AMBASSADEUR',
  name: 'Kofi Mensah',
  email: ' Kofi@Exemple.com ',
  company: '',
  country: 'Ghana',
  city: ' Accra ',
  website: '',
  audience: 'Diaspora ghanéenne à Londres',
  message: 'Je connais bien les associations de la diaspora.',
  consent: true,
};

describe('Programme Partenaires : page publique', () => {
  it('existe en français et en anglais, avec les mêmes trois profils', () => {
    for (const lang of ['fr', 'en'] as const) {
      expect(CONTENT[lang].cards.map((c) => c.type)).toEqual(['ANNONCEUR', 'AMBASSADEUR', 'CREATEUR']);
      expect(CONTENT[lang].steps).toHaveLength(4);
      expect(CONTENT[lang].contact).toContain('contact@boligo.fr');
    }
    expect(CONTENT.fr.cards[1].points.join(' ')).toMatch(/20 %/);
    expect(CONTENT.en.cards[2].points.join(' ')).toMatch(/15%/);
  });

  it('exige profil, nom, e-mail, pays, message de 20 caractères et consentement', () => {
    expect(isPartnerFormValid(filled)).toBe(true);
    expect(isPartnerFormValid({ ...filled, type: null })).toBe(false);
    expect(isPartnerFormValid({ ...filled, email: 'kofi@' })).toBe(false);
    expect(isPartnerFormValid({ ...filled, message: 'Trop court' })).toBe(false);
    expect(isPartnerFormValid({ ...filled, consent: false })).toBe(false);
  });

  it('envoie des champs propres et retire les champs vides', () => {
    const body = partnerPayload(filled, 'en');
    expect(body).toMatchObject({ email: 'kofi@exemple.com', city: 'Accra', language: 'en', consent: true });
    expect(body.company).toBeUndefined();
    expect(body.website).toBeUndefined();
  });

  it('respecte la langue imposée par l’adresse', () => {
    expect(initialPartnerLang('en')).toBe('en');
    expect(['fr', 'en']).toContain(initialPartnerLang());
  });
});
