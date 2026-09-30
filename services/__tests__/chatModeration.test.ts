import { maskProfanityForDisplay, moderateOutgoingMessage } from '@/services/chatModeration';

describe('chat moderation (client side)', () => {
  it('blocks obvious profanity before sending', () => {
    expect(moderateOutgoingMessage('ferme la connard')).toHaveProperty('reason');
    expect(moderateOutgoingMessage('Bonjour, ravie de te parler !')).toEqual({ success: true });
  });

  it('masks profanity for display', () => {
    expect(maskProfanityForDisplay('quel con')).toBe('quel ***');
    expect(maskProfanityForDisplay('')).toBe('');
  });
});
