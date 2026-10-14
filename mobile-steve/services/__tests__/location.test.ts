import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { COUNTRIES } from '@/constants/countries';
import {
  cityFromNominatim,
  detectPlace,
  formatResidence,
  reverseGeocode,
  LocationPermissionError,
  LocationTimeoutError,
  PERMISSION_TIMEOUT_MS,
  POSITION_TIMEOUT_MS,
  withTimeout,
  pickCity,
  placeFromAddress,
  splitResidence,
} from '../location';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6 },
  reverseGeocodeAsync: jest.fn(),
}));

const france = COUNTRIES.find((c) => c.code === 'FR')!;
const mocked = Location as jest.Mocked<typeof Location>;

describe('Localisation', () => {
  afterEach(() => {
    delete (global as any).fetch;
    jest.clearAllMocks();
  });

  it('garde la vraie commune, sans la rattacher à une ville de la liste', () => {
    expect(pickCity(france, { city: 'Lyon 3e Arrondissement' })).toBe('Lyon');
    expect(pickCity(france, { city: 'Grenoble' })).toBe('Grenoble');
    // Ancienne règle par inclusion : « Lyons-la-Forêt » devenait Lyon.
    expect(pickCity(france, { city: 'Lyons-la-Forêt' })).toBe('Lyons-la-Forêt');
    expect(pickCity(france, { city: 'Bezons', subregion: "Val-d'Oise" })).toBe('Bezons');
    // Orthographe de la liste reprise seulement pour le même nom.
    expect(pickCity(france, { city: 'paris' })).toBe('Paris');
    // Sans commune : champ vide, jamais la région ni la première ville.
    expect(pickCity(france, { city: null, region: 'Bretagne' })).toBe('');
    expect(pickCity(france, {})).toBe('');
  });

  it('Nominatim en France : jamais l’arrondissement (« municipality »)', () => {
    // Forme de la réponse de Nominatim au zoom 10 près de Bezons : seul l’arrondissement.
    expect(cityFromNominatim({ country_code: 'fr', municipality: 'Argenteuil', county: "Val-d'Oise" })).toBeNull();
    expect(cityFromNominatim({ country_code: 'fr', town: 'Bezons', municipality: 'Argenteuil' })).toBe('Bezons');
    expect(cityFromNominatim({ country_code: 'cd', municipality: 'Gombe' })).toBe('Gombe');
  });

  it('associe le code ISO au pays de la liste', () => {
    expect(placeFromAddress({ isoCountryCode: 'fr', city: 'Nice' })).toEqual({
      country: france,
      countryCode: 'FR',
      city: 'Nice',
    });
    expect(placeFromAddress({ isoCountryCode: 'ZZ', city: 'X' }).country).toBeNull();
  });

  it('sépare la ville et le pays de la résidence enregistrée', () => {
    expect(splitResidence('Lyon, France')).toEqual({ city: 'Lyon', country: france });
    expect(splitResidence('Abidjan').country).toBeNull();
    expect(splitResidence('Abidjan').city).toBe('Abidjan');
  });

  it('formate « Ville, Pays » comme le lit le serveur', () => {
    expect(formatResidence(' Bezons ', france)).toBe('Bezons, France');
    expect(formatResidence('Saint-Denis, 93', france)).toBe('Saint-Denis 93, France');
    expect(formatResidence('', france)).toBe('');
    expect(splitResidence(formatResidence('Bezons', france))).toEqual({ city: 'Bezons', country: france });
  });

  it('signale un refus de permission', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as any);
    await expect(detectPlace()).rejects.toBeInstanceOf(LocationPermissionError);
  });

  it('Bezons : position haute précision, commune exacte via geo.api.gouv.fr', async () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    mocked.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' } as any);
    mocked.getCurrentPositionAsync.mockResolvedValueOnce({
      coords: { latitude: 48.92637, longitude: 2.21785, accuracy: 15 },
    } as any);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ nom: 'Bezons', codesPostaux: ['95870'], codeDepartement: '95' }],
    });
    (global as any).fetch = fetchMock;
    try {
      const place = await detectPlace();
      expect(place).toMatchObject({ city: 'Bezons', countryCode: 'FR', postcode: '95870', accuracy: 15 });
      expect(place.country?.code).toBe('FR');
      const opts = mocked.getCurrentPositionAsync.mock.calls[0][0] as any;
      expect(opts.accuracy).toBe(Location.Accuracy.Highest);
      expect(opts.maximumAge).toBe(0);
      const url = fetchMock.mock.calls[0][0] as string;
      expect(url).toContain('geo.api.gouv.fr/communes?lat=48.9264&lon=2.2179');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    }
  });

  it('DOM : la commune de Fort-de-France est rattachée à la Martinique', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ nom: 'Fort-de-France', codesPostaux: ['97200'], codeDepartement: '972' }],
    });
    const place = await reverseGeocode(14.6, -61.07);
    expect(place.country?.code).toBe('MQ');
    expect(place.city).toBe('Fort-de-France');
  });

  it('hors de France sur le web : Nominatim au niveau de la commune (zoom 14)', async () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    const fetchMock = jest.fn(async (url: string) => ({
      ok: true,
      json: async () =>
        url.includes('geo.api.gouv.fr')
          ? []
          : { address: { country_code: 'cd', city: 'Kinshasa', state: 'Kinshasa' } },
    }));
    (global as any).fetch = fetchMock;
    try {
      const place = await reverseGeocode(-4.3217, 15.3125);
      expect(place).toMatchObject({ city: 'Kinshasa', countryCode: 'CD' });
      const nominatim = fetchMock.mock.calls.map((c) => c[0]).find((u) => u.includes('nominatim'))!;
      expect(nominatim).toContain('zoom=14');
      expect(mocked.reverseGeocodeAsync).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    }
  });
});

describe('Localisation : jamais d’attente sans fin', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('demande d’autorisation ignorée : erreur de délai, saisie manuelle possible', async () => {
    mocked.requestForegroundPermissionsAsync.mockReturnValue(new Promise(() => {}) as never);
    const p = detectPlace();
    jest.advanceTimersByTime(PERMISSION_TIMEOUT_MS + 1);
    await expect(p).rejects.toBeInstanceOf(LocationTimeoutError);
  });

  it('autorisation donnée mais aucune position : erreur de délai', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
    mocked.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}) as never);
    const p = detectPlace();
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(POSITION_TIMEOUT_MS + 1);
    await expect(p).rejects.toBeInstanceOf(LocationTimeoutError);
  });

  it('withTimeout : résultat rendu avant le délai, sans erreur tardive', async () => {
    await expect(withTimeout(Promise.resolve(42), 1000)).resolves.toBe(42);
    jest.advanceTimersByTime(2000);
  });
});
