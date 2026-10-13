import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { COUNTRIES, Country } from '@/constants/countries';

/** Lieu détecté : pays de la liste BOLIGO et commune où se trouve le membre. */
export interface DetectedPlace {
  country: Country | null;
  /** Code ISO du pays détecté, même s'il n'est pas dans la liste. */
  countryCode: string | null;
  /** Commune réelle (jamais une ville voisine de la liste) ; vide si inconnue. */
  city: string;
  /** Code postal quand le service le donne (France). */
  postcode?: string;
  /** Précision de la position en mètres, quand le navigateur ou le téléphone la donne. */
  accuracy?: number | null;
}

export class LocationPermissionError extends Error {}

export interface GeocodedAddress {
  isoCountryCode?: string | null;
  city?: string | null;
  subregion?: string | null;
  region?: string | null;
  postalCode?: string | null;
}

/** Nom comparable : sans accents ni casse. */
export const normName = (s: string) =>
  s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** « Ville, Pays » → ville et pays de la liste (pays null s'il n'y figure pas). */
export function splitResidence(value: string): { city: string; country: Country | null } {
  const parts = value.split(',').map((p) => p.trim()).filter(Boolean);
  const last = parts[parts.length - 1] ?? '';
  const country =
    parts.length >= 2 ? COUNTRIES.find((c) => normName(c.name) === normName(last)) ?? null : null;
  return { city: (country ? parts.slice(0, -1) : parts).join(', '), country };
}

/** « Ville » + pays → valeur « Ville, Pays » enregistrée par le serveur (champ `city`). */
export function formatResidence(city: string, country: Country | null): string {
  const clean = city.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return country ? `${clean}, ${country.name}` : clean;
}

/**
 * Ville à retenir : le nom de la COMMUNE renvoyé par le géocodeur, tel quel.
 *
 * V8.2 : l'ancienne version rattachait ce nom à une ville « proche » de la
 * liste du pays par inclusion de texte (« Lyons-la-Forêt » → Lyon) et, sans
 * ville, retenait la région. Désormais seule l'orthographe d'une ville de la
 * liste est reprise quand le nom est exactement le même (accents compris), et
 * le suffixe d'arrondissement est retiré (« Lyon 3e Arrondissement » → Lyon).
 * Sans commune connue, le champ reste vide : le membre la saisit.
 */
export function pickCity(country: Country | null, address: GeocodedAddress): string {
  const raw = (address.city ?? '').trim();
  if (!raw) return '';
  const name = raw.replace(/\s+\d+\s*(e|er|eme|ème)?\s+arrondissement$/i, '').trim();
  const same = country?.regions.find((r) => normName(r) === normName(name));
  return same ?? name;
}

/** Code ISO → pays de la liste. */
function countryOf(code: string | null): Country | null {
  return code ? COUNTRIES.find((c) => c.code === code) ?? null : null;
}

/** Lieu correspondant à une adresse géocodée. */
export function placeFromAddress(address: GeocodedAddress): DetectedPlace {
  const code = (address.isoCountryCode ?? '').toUpperCase() || null;
  const country = countryOf(code);
  const place: DetectedPlace = { country, countryCode: code, city: pickCity(country, address) };
  if (address.postalCode) place.postcode = address.postalCode;
  return place;
}

// ─── Services de géocodage inverse (gratuits, sans clé) ──────────────
const GEO_API_URL = 'https://geo.api.gouv.fr';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const PHOTON_URL = 'https://photon.komoot.io';
const TIMEOUT_MS = 7000;

/** Départements d'outre-mer → pays de la liste BOLIGO (ils y figurent à part). */
const DOM_COUNTRY: Record<string, string> = {
  '971': 'GP',
  '972': 'MQ',
  '973': 'GF',
  '974': 'RE',
};

/**
 * Coordonnée envoyée aux services : 4 décimales (une dizaine de mètres),
 * assez pour tomber dans la bonne commune près d'une limite (Bezons et
 * Argenteuil se touchent), sans transmettre la position exacte.
 */
export const roundCoord = (n: number) => Math.round(n * 10000) / 10000;

async function getJson(url: string): Promise<any> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      ...(ctrl ? { signal: ctrl.signal } : {}),
    });
    if (!res.ok) throw new Error(`Géocodage indisponible (${res.status})`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * France (métropole et DOM) : commune exacte du point, service public
 * geo.api.gouv.fr. Renvoie null hors de France (liste vide).
 */
export async function reverseFrance(lat: number, lon: number): Promise<GeocodedAddress | null> {
  const url =
    `${GEO_API_URL}/communes?lat=${roundCoord(lat)}&lon=${roundCoord(lon)}` +
    '&fields=nom,codesPostaux,codeDepartement&format=json';
  const data = await getJson(url);
  const commune = Array.isArray(data) ? data[0] : null;
  if (!commune?.nom) return null;
  return {
    isoCountryCode: DOM_COUNTRY[String(commune.codeDepartement ?? '')] ?? 'FR',
    city: commune.nom,
    postalCode: Array.isArray(commune.codesPostaux) ? commune.codesPostaux[0] ?? null : null,
  };
}

/**
 * Commune d'une adresse Nominatim. En France, `municipality` désigne
 * l'arrondissement (Bezons → « Argenteuil ») : il n'est retenu qu'ailleurs.
 */
export function cityFromNominatim(a: Record<string, string> | undefined): string | null {
  if (!a) return null;
  const isFrance = (a.country_code ?? '').toLowerCase() === 'fr';
  return (
    a.city ??
    a.town ??
    a.village ??
    (isFrance ? undefined : a.municipality) ??
    null
  );
}

/** Ailleurs : Nominatim au niveau de la commune (zoom 14). */
async function reverseNominatim(lat: number, lon: number): Promise<GeocodedAddress> {
  const url =
    `${NOMINATIM_URL}/reverse?format=jsonv2&zoom=14&addressdetails=1&accept-language=fr` +
    `&lat=${roundCoord(lat)}&lon=${roundCoord(lon)}`;
  const data = await getJson(url);
  const a = data?.address ?? {};
  return {
    isoCountryCode: a.country_code ?? null,
    city: cityFromNominatim(a),
    subregion: a.county ?? null,
    region: a.state ?? null,
    postalCode: a.postcode ?? null,
  };
}

/** Repli : Photon (OpenStreetMap, Komoot). */
async function reversePhoton(lat: number, lon: number): Promise<GeocodedAddress> {
  const url = `${PHOTON_URL}/reverse?lat=${roundCoord(lat)}&lon=${roundCoord(lon)}&lang=fr`;
  const data = await getJson(url);
  const p = data?.features?.[0]?.properties ?? {};
  const isPlace = ['city', 'town', 'village', 'municipality'].includes(p.osm_value) && p.osm_key === 'place';
  return {
    isoCountryCode: p.countrycode ?? null,
    city: (isPlace ? p.name : p.city) ?? null,
    region: p.state ?? null,
    postalCode: p.postcode ?? null,
  };
}

/** Commune du point : France d'abord, puis géocodeur du téléphone, Nominatim, Photon. */
export async function reverseGeocode(lat: number, lon: number): Promise<DetectedPlace> {
  try {
    const fr = await reverseFrance(lat, lon);
    if (fr) return placeFromAddress(fr);
  } catch {
    /* service indisponible : on essaie les suivants */
  }
  if (Platform.OS !== 'web') {
    try {
      const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
      if (address?.city) return placeFromAddress(address);
    } catch {
      /* géocodeur du téléphone indisponible */
    }
  }
  try {
    const place = placeFromAddress(await reverseNominatim(lat, lon));
    if (place.city) return place;
  } catch {
    /* Nominatim indisponible */
  }
  return placeFromAddress(await reversePhoton(lat, lon));
}

/**
 * Détecte le pays et la commune du membre (permission demandée au moment de
 * l'appel). Position en haute précision et toujours fraîche : sur le web,
 * Expo réutilise sinon une ancienne position, parfois approximative (IP).
 */
export async function detectPlace(): Promise<DetectedPlace> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new LocationPermissionError();
  const { coords } = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest,
    // Options du navigateur (ignorées sur iOS / Android).
    maximumAge: 0,
    timeout: 20000,
  } as Location.LocationOptions);
  const place = await reverseGeocode(coords.latitude, coords.longitude);
  return { ...place, accuracy: coords.accuracy ?? null };
}

/** Localisation déjà acceptée ? (aucune demande affichée) */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}
