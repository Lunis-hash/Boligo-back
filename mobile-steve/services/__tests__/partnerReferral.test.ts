jest.mock('../api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() }, API_URL: 'https://api.test/api' }));

import { normalizeReferralCode, parseStoredReferral, referralCodeFromUrl, REFERRAL_KEEP_DAYS } from '../partnerReferral';
import { offerClickUrl, unseenOfferIds } from '../partnerOffers';

describe('lien partenaire', () => {
  it('lit ?p=CODE dans une adresse', () => {
    expect(referralCodeFromUrl('?p=awa10')).toBe('AWA10');
    expect(referralCodeFromUrl('?utm=x&p=AWA-10&y=1')).toBe('AWA-10');
    expect(referralCodeFromUrl('https://boligo.fr/?p=AWA10')).toBe('AWA10');
    expect(referralCodeFromUrl('?q=AWA10')).toBeNull();
    expect(referralCodeFromUrl('?p=%3Cscript%3E')).toBeNull();
    expect(referralCodeFromUrl('?p=%E0%A4%A')).toBeNull();
  });

  it('refuse les codes mal formés', () => {
    expect(normalizeReferralCode('ab')).toBeNull();
    expect(normalizeReferralCode('a b c')).toBeNull();
    expect(normalizeReferralCode(12)).toBeNull();
  });

  it('oublie le code après 30 jours', () => {
    const now = Date.UTC(2026, 9, 10);
    const fresh = JSON.stringify({ code: 'AWA10', partnerName: 'Awa', discount: '-10 %', savedAt: now - 86400000 });
    const old = JSON.stringify({ code: 'AWA10', partnerName: 'Awa', discount: '-10 %', savedAt: now - (REFERRAL_KEEP_DAYS + 1) * 86400000 });
    expect(parseStoredReferral(fresh, now)?.code).toBe('AWA10');
    expect(parseStoredReferral(old, now)).toBeNull();
    expect(parseStoredReferral('{oops', now)).toBeNull();
    expect(parseStoredReferral(null, now)).toBeNull();
  });
});

describe('offres partenaires', () => {
  it('ne compte un affichage qu’une fois par session', () => {
    expect(unseenOfferIds(['a', 'b', 'a', 'c'], ['b'])).toEqual(['a', 'c']);
  });

  it('passe par le serveur pour compter le clic', () => {
    expect(offerClickUrl('1234')).toBe('https://api.test/api/partners/offers/1234/go');
  });
});
