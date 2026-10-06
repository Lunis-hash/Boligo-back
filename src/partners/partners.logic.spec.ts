import { PartnerType } from '@prisma/client';
import {
  codeStem,
  commissionDue,
  defaultCommission,
  normalizeCode,
  partnerTypeLabel,
} from './partners.logic';

describe('Programme Partenaires : règles', () => {
  it('fabrique un préfixe de code lisible à partir du nom', () => {
    expect(codeStem('Aïssatou Ndiaye')).toBe('AISSATOU');
    expect(codeStem('Mariages d’Or')).toBe('MARIAGES');
    expect(codeStem('Jo')).toBe('JOBLG');
    expect(codeStem('李')).toBe('BLG');
  });

  it('n’accepte que des codes de 4 à 20 lettres ou chiffres', () => {
    expect(normalizeCode(' awa-2026 ')).toBe('AWA2026');
    expect(normalizeCode('ab')).toBeNull();
    expect(normalizeCode('x'.repeat(21))).toBeNull();
  });

  it('calcule la commission au centime', () => {
    expect(commissionDue(150, 20)).toBe(30);
    expect(commissionDue(13.5, 15)).toBe(2.03);
    expect(commissionDue(100, null)).toBe(0);
    expect(commissionDue(0, 20)).toBe(0);
  });

  it('propose une commission par profil, aucune pour les marques', () => {
    expect(defaultCommission(PartnerType.AMBASSADEUR)).toBe(20);
    expect(defaultCommission(PartnerType.CREATEUR)).toBe(15);
    expect(defaultCommission(PartnerType.ANNONCEUR)).toBeNull();
  });

  it('nomme chaque profil en français et en anglais', () => {
    expect(partnerTypeLabel(PartnerType.CREATEUR, 'en')).toBe(
      'Content creator / influencer',
    );
    expect(partnerTypeLabel(PartnerType.ANNONCEUR)).toBe('Marque / annonceur');
  });
});
