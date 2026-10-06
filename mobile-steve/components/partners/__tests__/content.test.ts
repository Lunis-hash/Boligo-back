import { CONTENT, PartnerForm, initialPartnerLang, isPartnerFormValid, partnerPayload, registrationError } from '../content';
import { isRegistrationValid } from '../registration';

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
  registrationType: 'AUTRE',
  registrationNumber: 'CS 2019-123456',
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

  it('exige un numéro d’entreprise valide, avec un message précis', () => {
    expect(isPartnerFormValid({ ...filled, registrationType: null })).toBe(false);
    expect(isPartnerFormValid({ ...filled, registrationType: 'SIRENE', registrationNumber: '552 100 554' })).toBe(true);
    expect(isPartnerFormValid({ ...filled, registrationType: 'SIRENE', registrationNumber: '552100555' })).toBe(false);
    expect(registrationError({ ...filled, registrationType: 'SIRENE', registrationNumber: '552100555' }, 'fr')).toMatch(
      /SIREN ou SIRET invalide/,
    );
    expect(registrationError(filled, 'en')).toBeNull();
    expect(isRegistrationValid('TVA_UE', 'gr094259216')).toBe(true);
    expect(isRegistrationValid('TVA_UE', 'US123')).toBe(false);
    expect(isRegistrationValid('UK_COMPANY', 'SC123456')).toBe(true);
    expect(isRegistrationValid('SIRENE', '35600000000001')).toBe(true);
    expect(partnerPayload({ ...filled, registrationType: 'SIRENE', registrationNumber: '552 100 554' }, 'fr')).toMatchObject({
      registrationType: 'SIRENE',
      registrationNumber: '552100554',
    });
  });
});
