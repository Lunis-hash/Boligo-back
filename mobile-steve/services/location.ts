import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { COUNTRIES, Country } from '@/constants/countries';

/** Lieu détecté : pays de la liste BOLIGO et ville (ou région) la plus précise connue. */
export interface DetectedPlace {
  country: Country | null;
  /** Code ISO du pays détecté, même s'il n'est pas dans la liste. */
  countryCode: string | null;
  city: string;
}

export class LocationPermissionError extends Error {}

interface GeocodedAddress {
  isoCountryCode?: string | null;
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
}

/** Nom comparable : sans accents ni casse. */
export const normName = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
const norm = normName;

/** « Ville, Pays » → ville et pays de la liste (pays null s'il n'y figure pas). */
export function splitResidence(value: string): { city: string; country: Country | null } {
  const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  const country =
    parts.length >= 2 ? COUNTRIES.find((c) => normName(c.name) === normName(last)) ?? null : null;
  return { city: (country ? parts.slice(0, -1) : parts).join(', '), country };
}

/**
 * Ville à retenir : la ville de la liste du pays qui correspond le mieux, sinon
 * le nom renvoyé par le géocodeur. Une ville vide ne doit jamais retenir la
 * première ville de la liste.
 */
export function pickCity(country: Country | null, address: GeocodedAddress): string {
  const names = [address.city, address.subregion, address.region]
    .map((n) => (n ?? '').trim())
    .filter(Boolean);
  for (const name of names) {
    const match = country?.regions.find(
      (r) => norm(r).includes(norm(name)) || norm(name).includes(norm(r)),
    );
    if (match) return match;
  }
  return names[0] ?? '';
}

/** Lieu correspondant à une adresse géocodée. */
export function placeFromAddress(address: GeocodedAddress): DetectedPlace {
  const code = (address.isoCountryCode ?? '').toUpperCase() || null;
  const country = code ? COUNTRIES.find((c) => c.code === code) ?? null : null;
  return { country, countryCode: code, city: pickCity(country, address) };
}

/**
 * Sur le web, le géocodeur d'Expo n'existe pas : la position, arrondie à
 * environ un kilomètre, est envoyée au service ouvert d'OpenStreetMap
 * (Nominatim), uniquement quand le membre le demande.
 */
async function reverseGeocodeWeb(latitude: number, longitude: number): Promise<GeocodedAddress> {
  const round = (n: number) => Math.round(n * 100) / 100;
  const url =
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=fr' +
    `&lat=${round(latitude)}&lon=${round(longitude)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Géocodage indisponible (${res.status})`);
  const data = await res.json();
  const a = data?.address ?? {};
  return {
    isoCountryCode: a.country_code ?? null,
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
    subregion: a.county ?? null,
    region: a.state ?? null,
  };
}

/** Détecte le pays et la ville du membre (permission demandée au moment de l'appel). */
export async function detectPlace(): Promise<DetectedPlace> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new LocationPermissionError();
  const { coords } = await Location.getCurrentPositionAsync({});
  if (Platform.OS === 'web') {
    return placeFromAddress(await reverseGeocodeWeb(coords.latitude, coords.longitude));
  }
  const [address] = await Location.reverseGeocodeAsync({
    latitude: coords.latitude,
    longitude: coords.longitude,
  });
  return placeFromAddress(address ?? {});
}
