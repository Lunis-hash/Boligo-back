import { maskProfanityForDisplay, moderateOutgoingMessage } from '@/services/chatModeration';

describe('chat moderation (client side)', () => {
  it('blocks obvious profanity before sending', () => {
    expect(moderateOutgoingMessage('ferme la connard')).toHaveProperty('reason');
    expect(moderateOutgoingMessage('Bonjour, ravie de te parler !')).toEqual({ success: true });
  });

  it.each([
    'Merci pour ce conseil !',
    'Je reviens dans une seconde.',
    'Nous avons trouvé un consensus.',
    'Le contrat est signé.',
    'Second rendez-vous ?',
    'Il est content, conscient et confiant.',
    'Cette conception est bien conçue.',
    'Une connexion réussie.',
    'Il dit « Constance », pas autre chose.',
    'Le bâtiment est en béton.',
    'La députée a parlé.',
  ])('lets ordinary French words through: %s', (message) => {
    expect(moderateOutgoingMessage(message)).toEqual({ success: true });
    expect(maskProfanityForDisplay(message)).toBe(message);
  });

  it.each([
    'quel con',
    "t'es con ou quoi",
    'Espèce de CONNASSE',
    'bande de cons',
    'merde alors',
    'putain !',
    'sale pute',
    'salope',
    'enculé',
    'ENCULÉE',
    'bâtard',
    'batard',
    'Bâtarde',
    'chienne',
    'connard!',
    '...con...',
  ])('still catches real insults (whole word, any case or accent): %s', (message) => {
    expect(moderateOutgoingMessage(message)).toHaveProperty('reason');
    expect(maskProfanityForDisplay(message)).toContain('***');
  });

  it('matches accents written with combining marks (NFD input)', () => {
    const decomposed = 'enculé'; // « enculé » en forme décomposée
    expect(moderateOutgoingMessage(decomposed)).toHaveProperty('reason');
    expect(maskProfanityForDisplay(`quel ${decomposed}`)).toBe('quel ***');
  });

  it('masks profanity for display', () => {
    expect(maskProfanityForDisplay('quel con')).toBe('quel ***');
    expect(maskProfanityForDisplay('')).toBe('');
  });

  it('masks only the insult, never parts of ordinary words', () => {
    expect(maskProfanityForDisplay('Un conseil : ne sois pas con.')).toBe('Un conseil : ne sois pas ***.');
    expect(maskProfanityForDisplay('Ce contrat, quelle merde !')).toBe('Ce contrat, quelle *** !');
    expect(maskProfanityForDisplay('Projet bien conçu')).toBe('Projet bien conçu');
  });
});
