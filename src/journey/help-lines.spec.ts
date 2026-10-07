import { HELP_LINES, helpLinesFor } from './help-lines';
import { supportMessages } from './journey-insights.service';

describe("Numéros d'aide par pays", () => {
  it('lit le pays à la fin de « Ville, Pays », sans tenir compte des accents ni de la casse', () => {
    expect(helpLinesFor('Dakar, Sénégal')?.name).toBe('Sénégal');
    expect(helpLinesFor('Abidjan, Côte d’Ivoire')?.name).toBe("Côte d'Ivoire");
    expect(helpLinesFor('Lyon, france')?.name).toBe('France');
    expect(helpLinesFor('Kinshasa, Congo RDC')?.name).toBe('Congo RDC');
    expect(helpLinesFor('Brazzaville, Congo')?.name).toBe('Congo');
  });

  it('pays inconnu ou lieu vide : aucun numéro local', () => {
    expect(helpLinesFor('Kigali, Rwanda')).toBeNull();
    expect(helpLinesFor('')).toBeNull();
    expect(helpLinesFor(null)).toBeNull();
  });

  it('chaque pays a un numéro de secours', () => {
    for (const lines of Object.values(HELP_LINES))
      expect(lines.emergency.length).toBeGreaterThan(2);
  });

  it('au Sénégal : pas de 3114 ni de 3919, les secours du pays et le numéro vert avec ses horaires', () => {
    const [distress] = supportMessages(['detresse'], 'Dakar, Sénégal');
    expect(distress).not.toMatch(/3114|3919/);
    expect(distress).toMatch(/1515/);
    expect(distress).toMatch(/association d'écoute de votre pays/);
    const [victim] = supportMessages(['violence_subie'], 'Dakar, Sénégal');
    expect(victim).toMatch(/800 805 805/);
    expect(victim).toMatch(
      /En dehors des horaires du numéro vert, appelez le 17/,
    );
  });

  it('sans ligne violences fiable (Cameroun) : une association du pays, jamais la police seule', () => {
    const [victim] = supportMessages(['violence_subie'], 'Douala, Cameroun');
    expect(victim).toMatch(/association d'aide aux victimes de votre pays/);
    expect(victim).toMatch(/117/);
  });

  it('en France : le 3114 et le 3919', () => {
    const text = supportMessages(
      ['detresse', 'violence_subie'],
      'Paris, France',
    ).join(' ');
    expect(text).toMatch(/3114/);
    expect(text).toMatch(/3919/);
  });

  it('pays inconnu : le message général, numéros français et association du pays', () => {
    const [distress] = supportMessages(['detresse'], 'Kigali, Rwanda');
    expect(distress).toMatch(/en France, le 3114/);
    expect(distress).toMatch(/Ailleurs/);
  });

  it('la détresse en premier, chaque consigne d’horaires sous sa propre ligne', () => {
    const messages = supportMessages(
      ['menace', 'violence_subie', 'detresse', 'violence_exercee'],
      'Tunis, Tunisie',
    );
    // Le message aux victimes remplace celui sur la peur ; l'auteur garde le sien.
    expect(messages).toHaveLength(3);
    expect(messages[0]).toMatch(/moment difficile/);
    expect(messages[0]).toMatch(/ne répond qu'en journée/);
    expect(messages[1]).toMatch(/1899/);
    expect(messages[1]).not.toMatch(/80 10 50 50/);
    expect(messages[2]).toMatch(/gestes violents/);
  });
});
