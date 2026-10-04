import { FAREWELLS, formatDeadline, ghostingBannerText, isGhostingView } from '../ghosting';

describe('pacte anti-ghosting (app)', () => {
  const at = (y: number, m: number, d: number, h: number, min: number) => new Date(y, m - 1, d, h, min).toISOString();

  it('formate l’échéance en français, dans le fuseau de l’appareil', () => {
    expect(formatDeadline(at(2026, 10, 8, 14, 5))).toBe('jeudi 8 octobre à 14:05');
    expect(formatDeadline('pas une date')).toBe('');
  });

  it('dit à celui qui doit répondre jusqu’à quand, et qu’il peut partir poliment', () => {
    const text = ghostingBannerText(
      { waitingOn: 'me', since: null, closeAt: at(2026, 10, 8, 14, 0), refundOnClose: false },
      'Inès',
    );
    expect(text?.title).toBe('Inès attend votre réponse');
    expect(text?.body).toContain('jeudi 8 octobre à 14:00');
    expect(text?.body).toContain('mettez fin poliment');
  });

  it('rassure celui qui attend : fin du parcours et crédit rendu à l’échéance', () => {
    const text = ghostingBannerText(
      { waitingOn: 'partner', since: null, closeAt: at(2026, 10, 8, 14, 0), refundOnClose: true },
      'Yanis',
    );
    expect(text?.title).toBe('Vous attendez la réponse de Yanis');
    expect(text?.body).toContain('votre crédit vous sera rendu');
  });

  it("n'affiche rien quand personne n'attend", () => {
    expect(ghostingBannerText({ waitingOn: null, since: null, closeAt: null, refundOnClose: false }, 'Nadia')).toBeNull();
    expect(ghostingBannerText(null, 'Nadia')).toBeNull();
    expect(isGhostingView({ waitingOn: null })).toBe(false);
    expect(isGhostingView({ waitingOn: 'me', closeAt: null })).toBe(true);
  });

  it('propose les mêmes messages de courtoisie que le serveur', () => {
    expect(FAREWELLS.map((f) => f.code)).toEqual(['merci', 'pas_compatible', 'pas_disponible']);
  });
});
