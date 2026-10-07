import {
  containsContactDetails,
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
    'Il m’appelait connasse devant ses amis.',
    'Mon ex me disait que j’étais une salope.',
    'Il me criait dégage quand je pleurais.',
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

describe('Coordonnées dans le Sondeur', () => {
  it.each([
    ['Mon WhatsApp : 07 07 07 07 07, écris-moi.', true],
    ['écris-moi sur wa.me/2250707070707', true],
    ['Appelle le +225 07 00 00 00 00', true],
    ['mon mail : awa@example.com', true],
    ['La dot chez nous tourne autour de 1 000 000 FCFA.', false],
    ['Je suis née en 1990 et j’ai grandi à Douala.', false],
  ])('« %s » → %s', (text, expected) => {
    expect(containsContactDetails(text)).toBe(expected);
  });
});
