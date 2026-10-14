import { endedJourneyMessage } from '../journeyEnded';

const base = { journeyId: 'j1', partnerName: 'Dan', endedAt: '2026-10-14T10:00:00Z' };

describe('Onglet Matchs : parcours terminé expliqué', () => {
  it('abandon par l’autre membre, crédit rendu', () => {
    const m = endedJourneyMessage({ ...base, result: 'abandonne', creditReturned: 1 });
    expect(m.title).toBe('Votre parcours avec Dan est terminé');
    expect(m.body).toMatch(/arrêté/);
    expect(m.body).toMatch(/crédit vous a été rendu/);
  });

  it('clôture anti-ghosting, sans crédit rendu', () => {
    const m = endedJourneyMessage({ ...base, result: 'echoue', creditReturned: 0 });
    expect(m.body).toMatch(/faute de réponse/);
    expect(m.body).not.toMatch(/rendu/);
    expect(m.body).toMatch(/nouveau parcours/);
  });
});
