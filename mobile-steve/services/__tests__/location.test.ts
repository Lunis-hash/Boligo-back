import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { COUNTRIES } from '@/constants/countries';
import {
  detectPlace,
  LocationPermissionError,
  pickCity,
  placeFromAddress,
  splitResidence,
} from '../location';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

const france = COUNTRIES.find((c) => c.code === 'FR')!;
const mocked = Location as jest.Mocked<typeof Location>;

describe('Localisation', () => {
  it('retient la ville de la liste, sans jamais prendre la première par défaut', () => {
    expect(pickCity(france, { city: 'Lyon 3e Arrondissement' })).toBe('Lyon');
    expect(pickCity(france, { city: 'Grenoble' })).toBe('Grenoble');
    // Ville inconnue du géocodeur : la région, pas « Paris ».
    expect(pickCity(france, { city: null, region: 'Bretagne' })).toBe('Bretagne');
    expect(pickCity(france, {})).toBe('');
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

  it('signale un refus de permission', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as any);
    await expect(detectPlace()).rejects.toBeInstanceOf(LocationPermissionError);
  });

  it('géocode sur le web avec une position arrondie à environ un kilomètre', async () => {
    const os = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
    mocked.requestForegroundPermissionsAsync.mockResolvedValueOnce({ status: 'granted' } as any);
    mocked.getCurrentPositionAsync.mockResolvedValueOnce({
      coords: { latitude: 45.764043, longitude: 4.835659 },
    } as any);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ address: { country_code: 'fr', city: 'Lyon', state: 'Auvergne-Rhône-Alpes' } }),
    });
    (global as any).fetch = fetchMock;
    try {
      const place = await detectPlace();
      expect(place.country?.code).toBe('FR');
      expect(place.city).toBe('Lyon');
      expect(fetchMock.mock.calls[0][0]).toContain('lat=45.76&lon=4.84');
      expect(mocked.reverseGeocodeAsync).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    }
  });
});
