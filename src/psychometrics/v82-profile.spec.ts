import {
  buildPsychProfile,
  buildRelationalProfile,
  v82Items,
} from './psychometrics';

/** Réponses V8.2 : `high` sur les items directs, l'inverse sur les items inversés. */
function answer(
  items: Array<{ id: string; reverse?: boolean }>,
  high: boolean,
) {
  return Object.fromEntries(
    items.map((i) => [i.id, high !== !!i.reverse ? 'E' : 'A']),
  );
}

describe('V8.2 — profil relationnel tiré des échelles V8.2', () => {
  it('chaque échelle du profil a ses items V8.2 (Mini-IPIP : 4 par trait)', () => {
    expect(v82Items('anxiety')).toHaveLength(4);
    expect(v82Items('avoidance')).toHaveLength(4);
    for (const t of [
      'extraversion',
      'agreeableness',
      'conscientiousness',
      'emotionalStability',
      'openness',
    ] as const)
      expect(v82Items(t)).toHaveLength(4);
    expect(v82Items('criticism').map((i) => i.id)).toEqual(['V82_M6_01']);
  });

  it('attachement sécure / anxieux, items inversés compris', () => {
    const secure = {
      ...answer(v82Items('anxiety'), false),
      ...answer(v82Items('avoidance'), false),
    };
    const anxious = {
      ...answer(v82Items('anxiety'), true),
      ...answer(v82Items('avoidance'), false),
    };
    expect(buildPsychProfile(secure).attachment.style).toBe('secure');
    expect(buildPsychProfile(anxious).attachment.style).toBe('anxious');
    expect(buildRelationalProfile(secure, 'F')?.attachment?.style).toBe(
      'secure',
    );
  });

  it('Mini-IPIP : un trait élevé est lu comme élevé (items inversés retournés)', () => {
    const p = buildPsychProfile(answer(v82Items('conscientiousness'), true));
    expect(p.bigFive.conscientiousness).toBe(100);
  });

  it('« Non applicable » ne compte jamais comme une réponse', () => {
    const p = buildPsychProfile({ V82_M6_01: 'NA' });
    expect(p.conflict.criticism).toBeNull();
  });
});
