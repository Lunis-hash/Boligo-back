import {
  citySimilarity,
  clearCitySearchCache,
  editDistance,
  normalizeCityQuery,
  phoneticKey,
  parseAdresse,
  parseGeo,
  parsePhoton,
  rankSuggestions,
  resetNominatimThrottle,
  searchCities,
  searchLocalCities,
} from '../citySearch';

/** Réponse HTTP simulée. */
const ok = (body: any) => ({ ok: true, status: 200, json: async () => body });
const fail = () => ({ ok: false, status: 503, json: async () => ({}) });

// Formes réelles des réponses des services (champs utiles seulement).
const ADRESSE_BESON = {
  features: [
    { properties: { type: 'municipality', name: 'Bezons', postcode: '95870', citycode: '95063', population: 31476, context: "95, Val-d'Oise, Île-de-France", score: 0.82 } },
    { properties: { type: 'municipality', name: 'Besson', postcode: '03210', citycode: '03025', population: 760, context: '03, Allier, Auvergne-Rhône-Alpes', score: 0.8 } },
  ],
};
const GEO_BESON = [
  { nom: 'Besson', codesPostaux: ['03210'], codeDepartement: '03', population: 760 },
];

describe('Recherche de ville : normalisation et similarité', () => {
  it('ignore accents, casse, tirets, apostrophes et abréviations', () => {
    expect(normalizeCityQuery('  Montréal ')).toBe('montreal');
    expect(normalizeCityQuery("L'Haÿ-les-Roses")).toBe('l hay les roses');
    expect(normalizeCityQuery('St-Ouen')).toBe('saint ouen');
    expect(normalizeCityQuery('Ste Foy')).toBe('sainte foy');
  });

  it('compte une transposition comme une seule faute', () => {
    expect(editDistance('kinshsa', 'kinshasa')).toBe(1);
    expect(editDistance('duoala', 'douala')).toBe(1);
    expect(editDistance('', 'abc')).toBe(3);
  });

  it('rapproche les graphies qui se prononcent pareil', () => {
    expect(phoneticKey('Beson')).toBe(phoneticKey('Bezons'));
    expect(phoneticKey('Argenteuille')).toBe(phoneticKey('Argenteuil'));
  });

  it('note un nom exact, un début de nom, puis une faute de frappe', () => {
    expect(citySimilarity('bezons', 'Bezons')).toBe(1);
    expect(citySimilarity('Argen', 'Argenteuil')).toBeGreaterThan(0.9);
    expect(citySimilarity('Beson', 'Bezons')).toBeGreaterThan(0.6);
    expect(citySimilarity('Montreal', 'Montréal')).toBe(1);
    expect(citySimilarity('Bruxelles', 'Lyon')).toBeLessThan(0.45);
  });
});

describe('Recherche de ville : classement', () => {
  it('« Beson » : Bezons (95) avant Besson, plus petite', () => {
    const list = [...parseGeo('Beson', GEO_BESON, 'FR'), ...parseAdresse('Beson', ADRESSE_BESON, 'FR')];
    const ranked = rankSuggestions('Beson', list);
    expect(ranked[0].name).toBe('Bezons');
    expect(ranked[0].postcode).toBe('95870');
    expect(ranked[0].detail).toContain("Val-d'Oise (95)");
    // Besson vu par les deux services : fusionné en une seule ligne.
    expect(ranked.filter((s) => s.name === 'Besson')).toHaveLength(1);
  });

  it('garde les homonymes de départements différents', () => {
    const list = parseGeo('Saint-Denis', [
      { nom: 'Saint-Denis', codesPostaux: ['93200'], codeDepartement: '93', population: 113000 },
      { nom: 'Saint-Denis', codesPostaux: ['97400'], codeDepartement: '974', population: 153000 },
    ], 'FR');
    const ranked = rankSuggestions('Saint-Denis', list);
    expect(ranked).toHaveLength(2);
    // La commune de La Réunion est rattachée au pays « La Réunion » de la liste.
    expect(ranked.find((s) => s.department === '974')?.countryCode).toBe('RE');
  });

  it('Photon : seulement les lieux habités, pays choisi en tête', () => {
    const data = {
      features: [
        { properties: { name: 'Douala', osm_key: 'place', osm_value: 'city', countrycode: 'CM', state: 'Littoral' } },
        { properties: { name: 'Rue de Douala', osm_key: 'highway', osm_value: 'residential', countrycode: 'FR' } },
        { properties: { name: 'Douala', osm_key: 'place', osm_value: 'village', countrycode: 'GA' } },
      ],
    };
    const ranked = rankSuggestions('Douala', parsePhoton('Douala', data, 'CM'));
    expect(ranked.map((s) => s.countryCode)).toEqual(['CM', 'GA']);
    expect(ranked[0].country?.name).toBe('Cameroun');
  });

  it('liste locale : recherche approximative sans accents', () => {
    expect(searchLocalCities('kinshsa', 'CD')[0]?.name).toBe('Kinshasa');
    expect(searchLocalCities('montreal', 'CA')[0]?.name).toBe('Montréal');
    expect(searchLocalCities('abidjn')[0]?.name).toBe('Abidjan');
    expect(searchLocalCities('a', 'FR')).toEqual([]);
  });
});

describe('Recherche de ville : services', () => {
  beforeEach(() => {
    clearCitySearchCache();
    resetNominatimThrottle();
  });

  it('France : interroge l’API Adresse et geo.api.gouv.fr, puis classe', async () => {
    const fetchImpl = jest.fn(async (url: string) =>
      url.includes('api-adresse') ? ok(ADRESSE_BESON) : ok(GEO_BESON),
    );
    const res = await searchCities('Beson', { countryCode: 'FR', fetchImpl });
    expect(res[0].name).toBe('Bezons');
    const urls = fetchImpl.mock.calls.map((c) => c[0]);
    expect(urls.some((u) => u.includes('type=municipality') && u.includes('q=Beson'))).toBe(true);
    expect(urls.some((u) => u.includes('geo.api.gouv.fr/communes?nom=Beson') && u.includes('boost=population'))).toBe(true);
    // Mise en cache : pas de nouvelle requête pour la même saisie.
    await searchCities('beson', { countryCode: 'FR', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('hors ligne : repli sur la liste locale du pays', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error('réseau coupé');
    });
    const res = await searchCities('Kinshsa', { countryCode: 'CD', fetchImpl, sleep: async () => {} });
    expect(res[0]).toMatchObject({ name: 'Kinshasa', source: 'local', countryCode: 'CD' });
  });

  it('ailleurs : Photon, puis Nominatim (une requête par seconde au plus)', async () => {
    let clock = 10_000;
    const sleep = jest.fn(async (ms: number) => {
      clock += ms;
    });
    const fetchImpl = jest.fn(async (url: string) => {
      if (url.includes('photon')) return fail();
      return ok([
        { name: 'Abidjan', category: 'place', type: 'city', address: { country_code: 'ci', country: "Côte d'Ivoire" } },
      ]);
    });
    const opts = { countryCode: 'CI', fetchImpl, sleep, now: () => clock };
    expect((await searchCities('Abidjan', opts))[0]).toMatchObject({ name: 'Abidjan', source: 'nominatim' });
    expect((await searchCities('Abidja', opts))[0].name).toBe('Abidjan');
    const nominatim = fetchImpl.mock.calls.map((c) => c[0]).filter((u) => u.includes('nominatim'));
    expect(nominatim).toHaveLength(2);
    expect(nominatim[0]).toContain('countrycodes=ci');
    // La seconde requête Nominatim a attendu ~1,1 s.
    expect(sleep).toHaveBeenCalledWith(1100);
  });

  it('saisie trop courte : aucune requête', async () => {
    const fetchImpl = jest.fn();
    expect(await searchCities(' b ', { countryCode: 'FR', fetchImpl: fetchImpl as any })).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
