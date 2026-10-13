import { offerState } from './partner-tracking.service';

describe('Offres des marques : état affiché', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const d = (iso: string) => new Date(iso);
  it.each([
    [{ isActive: false, startsAt: null, endsAt: null }, 'brouillon'],
    [{ isActive: true, startsAt: null, endsAt: null }, 'en_ligne'],
    [
      { isActive: true, startsAt: d('2026-11-01T00:00:00Z'), endsAt: null },
      'programmee',
    ],
    [
      { isActive: true, startsAt: null, endsAt: d('2026-10-01T00:00:00Z') },
      'expiree',
    ],
    [
      { isActive: false, startsAt: null, endsAt: d('2026-10-01T00:00:00Z') },
      'expiree',
    ],
    [
      {
        isActive: false,
        startsAt: d('2026-10-01T00:00:00Z'),
        endsAt: d('2026-12-31T00:00:00Z'),
      },
      'brouillon',
    ],
    [
      {
        isActive: false,
        startsAt: null,
        endsAt: null,
        publishedAt: d('2026-10-02T00:00:00Z'),
      },
      'retiree',
    ],
  ])('%o → %s', (offer, expected) => {
    expect(offerState(offer, now)).toBe(expected);
  });
});
