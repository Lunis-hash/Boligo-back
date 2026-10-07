import {
  maskProfanityForDisplay,
  moderateAnswerLocally,
  moderateMessageLocally,
} from './chat-moderation';

describe('Modération locale des réponses au Sondeur', () => {
  it.each([
    'Mon ex me traitait de salope devant ses amis.',
    'Il me disait « ta gueule » dès que je parlais.',
    'Il me criait « dégage » quand je pleurais.',
    'Mon père traitait ma mère de pute, je ne veux jamais revivre ça.',
  ])('une victime qui cite les mots subis est enregistrée : %s', (text) => {
    expect(moderateMessageLocally(text).allowed).toBe(false);
    expect(moderateAnswerLocally(text).allowed).toBe(true);
  });

  it('une insulte adressée à l’autre reste refusée', () => {
    expect(moderateAnswerLocally('Tu es une salope.').allowed).toBe(false);
    expect(moderateAnswerLocally('Ferme la, connard.').allowed).toBe(false);
  });

  it('les mots grossiers cités sont masqués à l’affichage', () => {
    expect(
      maskProfanityForDisplay('Mon ex me traitait de salope devant ses amis.'),
    ).not.toContain('salope');
  });
});
