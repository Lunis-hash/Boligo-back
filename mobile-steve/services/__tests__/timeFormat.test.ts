import { dayLabel, formatSince, stepDay } from '../timeFormat';

const NOW = new Date('2026-10-04T12:00:00Z').getTime();
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

describe('formatSince', () => {
  it('reste lisible quelle que soit la durée', () => {
    expect(formatSince(ago(10_000), NOW)).toBe("À l'instant");
    expect(formatSince(ago(5 * MIN), NOW)).toBe('Il y a 5 min');
    expect(formatSince(ago(3 * 60 * MIN), NOW)).toBe('Il y a 3 h');
    expect(formatSince(ago(DAY + 60 * MIN), NOW)).toBe('Hier');
    expect(formatSince(ago(4 * DAY), NOW)).toBe('Il y a 4 j');
  });

  it("n'affiche rien sans date valide", () => {
    expect(formatSince(null, NOW)).toBe('');
    expect(formatSince('pas une date', NOW)).toBe('');
  });
});

describe('stepDay', () => {
  it('compte les jours depuis le début de l’étape, de 1 à 3', () => {
    expect(stepDay(ago(MIN), 3, NOW)).toBe(1);
    expect(stepDay(ago(DAY + MIN), 3, NOW)).toBe(2);
    expect(stepDay(ago(2 * DAY + MIN), 3, NOW)).toBe(3);
    expect(stepDay(ago(9 * DAY), 3, NOW)).toBe(3);
  });

  it('revient au jour 1 sans date', () => {
    expect(stepDay(null, 3, NOW)).toBe(1);
  });
});

describe('dayLabel', () => {
  // Midi local : le test ne dépend pas du fuseau de la machine.
  const now = new Date(2026, 9, 4, 12, 0, 0).getTime();
  it('nomme le jour comme dans une messagerie', () => {
    expect(dayLabel(new Date(2026, 9, 4, 8, 0).toISOString(), now)).toBe("Aujourd'hui");
    expect(dayLabel(new Date(2026, 9, 3, 23, 0).toISOString(), now)).toBe('Hier');
    expect(dayLabel(new Date(2026, 8, 28, 10, 0).toISOString(), now)).toBe('lundi 28 septembre');
    expect(dayLabel(new Date(2026, 9, 1, 10, 0).toISOString(), now)).toBe('jeudi 1er octobre');
  });
  it('ne renvoie rien sans date', () => {
    expect(dayLabel(undefined, now)).toBe('');
  });
});
