import { PartnerRegistrationType } from '@prisma/client';
import {
  checkEuVat,
  checkOther,
  checkRegistration,
  checkSirene,
  checkUkCompany,
  luhnValid,
} from './registration';

describe('Numéros d’entreprise : contrôle de forme', () => {
  it('vérifie la clé des SIREN et SIRET', () => {
    expect(luhnValid('552100554')).toBe(true);
    expect(checkSirene('552 100 554')).toEqual({
      ok: true,
      number: '552100554',
      siren: '552100554',
    });
    expect(checkSirene('552100555')).toMatchObject({ ok: false });
    expect(checkSirene('732 829 320 00074')).toEqual({
      ok: true,
      number: '73282932000074',
      siren: '732829320',
    });
    expect(checkSirene('73282932000075')).toMatchObject({ ok: false });
    expect(checkSirene('1234')).toMatchObject({ ok: false });
  });

  it('applique la règle propre aux établissements de La Poste', () => {
    expect(checkSirene('35600000000001')).toMatchObject({ ok: true });
    expect(checkSirene('35600000000002')).toMatchObject({ ok: false });
  });

  it('reconnaît les numéros de TVA de l’Union européenne', () => {
    expect(checkEuVat('fr 40 303265045')).toEqual({
      ok: true,
      number: 'FR40303265045',
      country: 'FR',
    });
    expect(checkEuVat('GR094259216')).toMatchObject({
      ok: true,
      country: 'EL',
      number: 'EL094259216',
    });
    expect(checkEuVat('US123456789')).toMatchObject({ ok: false });
    expect(checkEuVat('FR')).toMatchObject({ ok: false });
  });

  it('reconnaît les company numbers britanniques et les autres numéros', () => {
    expect(checkUkCompany('1234567')).toEqual({ ok: true, number: '01234567' });
    expect(checkUkCompany('SC123456')).toEqual({
      ok: true,
      number: 'SC123456',
    });
    expect(checkUkCompany('ABC')).toMatchObject({ ok: false });
    expect(checkOther('RC-ABJ-2019-B-12345')).toEqual({
      ok: true,
      number: 'RCABJ2019B12345',
    });
    expect(checkOther('12')).toMatchObject({ ok: false });
    expect(
      checkRegistration(PartnerRegistrationType.SIRENE, '552100554'),
    ).toMatchObject({ ok: true });
  });
});
