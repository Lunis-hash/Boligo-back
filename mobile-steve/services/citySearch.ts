import { COUNTRIES, Country } from '@/constants/countries';

/**
 * Recherche de ville tolérante aux fautes, pour l'autocomplétion.
 *
 * - France et DOM : API Adresse (api-adresse.data.gouv.fr, type=municipality,
 *   très tolérante aux fautes : « Beson » → Bezons) et Découpage administratif
 *   (geo.api.gouv.fr, par nom, classé par population), en parallèle.
 * - Ailleurs : Photon (photon.komoot.io, OpenStreetMap), filtré sur les
 *   villes, bourgs et villages ; repli Nominatim (une requête par seconde au
 *   plus, règle d'usage d'OpenStreetMap).
 * - Hors ligne ou services muets : villes de la liste locale du pays
 *   (constants/countries.ts), en recherche approximative sans accents.
 *
 * Services gratuits, sans clé. Seul le texte tapé est envoyé.
 */
export interface CitySuggestion {
  /** Nom de la commune, tel qu'il sera enregistré (« Bezons »). */
  name: string;
  /** Code ISO du pays (« FR »), même s'il n'est pas dans la liste. */
  countryCode: string | null;
  /** Pays de la liste BOLIGO, ou null. */
  country: Country | null;
  /** Précision affichée sous le nom (« Val-d'Oise (95) · 95870 »). */
  detail?: string;
  postcode?: string;
  /** Département (France) : distingue les homonymes. */
  department?: string;
  population?: number;
  source: 'adresse' | 'geo' | 'photon' | 'nominatim' | 'local';
  /** Score de classement (plus haut = meilleur). */
  score: number;
}

export const ADRESSE_URL = 'https://api-adresse.data.gouv.fr';
export const GEO_API_URL = 'https://geo.api.gouv.fr';
export const PHOTON_URL = 'https://photon.komoot.io';
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
export const MAX_RESULTS = 8;
/** Délai d'anti-rebond conseillé pour la saisie. */
export const SEARCH_DEBOUNCE_MS = 400;
const TIMEOUT_MS = 6000;
const NOMINATIM_INTERVAL_MS = 1100;

/** Pays servis par les API françaises (DOM inclus) → code département. */
const FRENCH_CODES: Record<string, string | null> = {
  FR: null,
  GP: '971',
  MQ: '972',
  GF: '973',
  RE: '974',
};
const DOM_COUNTRY: Record<string, string> = { '971': 'GP', '972': 'MQ', '973': 'GF', '974': 'RE' };

// ─── Normalisation et similarité ──────────────────────────────────────

/** Texte comparable : sans accents, casse, tirets ni apostrophes ; « St » → saint. */
export function normalizeCityQuery(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[-'’.,/()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^st (?=\w)/, 'saint ')
    .replace(/^ste (?=\w)/, 'sainte ')
    .replace(/ st (?=\w)/g, ' saint ')
    .replace(/ ste (?=\w)/g, ' sainte ');
}

/** Distance d'édition avec transpositions (Damerau, version « OSA »). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/**
 * Clé phonétique grossière (français) : « Beson » et « Bezons » se
 * prononcent pareil. z → s, ph → f, y → i, lettres doublées et finales
 * muettes (s, x, t, e) retirées.
 */
export function phoneticKey(s: string): string {
  return normalizeCityQuery(s)
    .replace(/ /g, '')
    .replace(/ph/g, 'f')
    .replace(/qu/g, 'k')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/z/g, 's')
    .replace(/y/g, 'i')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1')
    .replace(/[sxte]+$/, '');
}

/**
 * Ressemblance de 0 à 1 entre la saisie et un nom de ville : 1 si égal,
 * ~0,9 si le nom commence par la saisie (autocomplétion), sinon une note
 * tirée de la distance d'édition (nom entier, ou son début de même longueur).
 */
export function citySimilarity(query: string, name: string): number {
  const q = normalizeCityQuery(query);
  const n = normalizeCityQuery(name);
  if (!q || !n) return 0;
  if (q === n) return 1;
  if (n.startsWith(q)) return 0.9 + 0.08 * (q.length / n.length);
  if (n.split(' ').some((w) => w.startsWith(q))) return 0.82;
  if (q.length >= 3 && n.includes(q)) return 0.75;
  const whole = 1 - editDistance(q, n) / Math.max(q.length, n.length);
  const head = n.slice(0, q.length);
  const prefix = q.length >= 3 ? 1 - editDistance(q, head) / q.length - 0.1 : 0;
  // Sans espaces : « saint ouen » ≈ « saintouen ».
  const compact = 1 - editDistance(q.replace(/ /g, ''), n.replace(/ /g, '')) / Math.max(q.length, n.length);
  const pq = phoneticKey(q);
  const pn = phoneticKey(n);
  const phonetic = pq.length >= 3 ? (1 - editDistance(pq, pn) / Math.max(pq.length, pn.length)) * 0.8 : 0;
  return Math.max(0, Math.min(0.85, Math.max(whole * 0.85, prefix * 0.85, compact * 0.85, phonetic)));
}

/** Note finale : ressemblance, taille de la ville, pays choisi. */
export function scoreSuggestion(
  query: string,
  s: Pick<CitySuggestion, 'name' | 'population' | 'countryCode'> & { apiScore?: number; kindBonus?: number },
  countryCode?: string | null,
): number {
  const sim = Math.max(citySimilarity(query, s.name), (s.apiScore ?? 0) * 0.9);
  const pop = s.population && s.population > 0 ? Math.min(7, Math.log10(s.population)) * 2.5 : 0;
  const sameCountry = countryCode && s.countryCode === countryCode ? 12 : 0;
  return Math.round((sim * 100 + pop + (s.kindBonus ?? 0) + sameCountry) * 100) / 100;
}

const keyOf = (s: CitySuggestion) =>
  `${normalizeCityQuery(s.name)}|${s.countryCode ?? ''}|${s.department ?? ''}`;

/**
 * Fusionne (même commune vue par deux services), trie par note décroissante,
 * écarte ce qui ne ressemble pas du tout à la saisie.
 */
export function rankSuggestions(
  query: string,
  list: CitySuggestion[],
  limit = MAX_RESULTS,
  minSimilarity = 0.45,
): CitySuggestion[] {
  const byKey = new Map<string, CitySuggestion>();
  for (const s of list) {
    if (!s.name?.trim()) continue;
    const k = keyOf(s);
    const prev = byKey.get(k);
    if (!prev) byKey.set(k, { ...s });
    else {
      byKey.set(k, {
        ...prev,
        score: Math.max(prev.score, s.score),
        population: prev.population ?? s.population,
        postcode: prev.postcode ?? s.postcode,
        detail: prev.detail ?? s.detail,
      });
    }
  }
  return [...byKey.values()]
    .filter((s) => s.source !== 'local' || citySimilarity(query, s.name) >= 0.6)
    .filter((s) => s.score >= minSimilarity * 100)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'fr'))
    .slice(0, limit);
}

const countryOf = (code: string | null | undefined): Country | null =>
  code ? COUNTRIES.find((c) => c.code === code.toUpperCase()) ?? null : null;

// ─── Repli hors ligne : liste locale ──────────────────────────────────

/** Villes de la liste locale (du pays choisi, sinon de tous les pays). */
export function searchLocalCities(query: string, countryCode?: string | null): CitySuggestion[] {
  if (normalizeCityQuery(query).length < 2) return [];
  const countries = countryCode ? COUNTRIES.filter((c) => c.code === countryCode) : COUNTRIES;
  const all: CitySuggestion[] = [];
  for (const c of countries) {
    c.regions.forEach((name, i) => {
      const sim = citySimilarity(query, name);
      if (sim < 0.6) return;
      // Liste rangée par importance : la première ville est la plus peuplée.
      all.push({
        name,
        countryCode: c.code,
        country: c,
        detail: countryCode ? undefined : c.name,
        source: 'local',
        score: Math.round((sim * 100 + Math.max(0, 6 - i)) * 100) / 100,
      });
    });
  }
  return rankSuggestions(query, all);
}

// ─── Services en ligne ─────────────────────────────────────────────────

export type Fetcher = (url: string, init?: RequestInit) => Promise<{ ok: boolean; status?: number; json: () => Promise<any> }>;

export interface SearchOptions {
  /** Pays choisi (code ISO) : oriente la recherche. */
  countryCode?: string | null;
  signal?: AbortSignal;
  /** Remplacés dans les tests. */
  fetchImpl?: Fetcher;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

async function getJson(fetcher: Fetcher, url: string, signal?: AbortSignal): Promise<any> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), TIMEOUT_MS) : null;
  const onAbort = () => ctrl?.abort();
  signal?.addEventListener?.('abort', onAbort);
  try {
    const res = await fetcher(url, {
      headers: { Accept: 'application/json' },
      ...(ctrl ? { signal: ctrl.signal } : {}),
    });
    if (!res.ok) throw new Error(`Recherche de ville indisponible (${res.status ?? '?'})`);
    return await res.json();
  } finally {
    if (timer) clearTimeout(timer);
    signal?.removeEventListener?.('abort', onAbort);
  }
}

/** API Adresse : communes, tolérante aux fautes. */
export function parseAdresse(query: string, data: any, countryCode?: string | null): CitySuggestion[] {
  const features: any[] = Array.isArray(data?.features) ? data.features : [];
  return features
    .map((f) => f?.properties ?? {})
    .filter((p) => p.name && (!p.type || p.type === 'municipality'))
    .map((p) => {
      const ctx = String(p.context ?? '').split(',').map((x: string) => x.trim());
      const dept = ctx[0] || undefined;
      const code = (dept && DOM_COUNTRY[dept]) || 'FR';
      const deptName = ctx[1];
      const population = typeof p.population === 'number' ? p.population : undefined;
      const s: CitySuggestion = {
        name: p.name,
        countryCode: code,
        country: countryOf(code),
        department: dept,
        postcode: p.postcode || undefined,
        population,
        detail: [deptName && dept ? `${deptName} (${dept})` : dept, p.postcode].filter(Boolean).join(' · ') || undefined,
        source: 'adresse',
        score: 0,
      };
      s.score = scoreSuggestion(query, { ...s, apiScore: typeof p.score === 'number' ? p.score : 0 }, countryCode);
      return s;
    });
}

/** Découpage administratif : communes par nom. */
export function parseGeo(query: string, data: any, countryCode?: string | null): CitySuggestion[] {
  const list: any[] = Array.isArray(data) ? data : [];
  return list
    .filter((c) => c?.nom)
    .map((c) => {
      const dept = c.codeDepartement ? String(c.codeDepartement) : undefined;
      const code = (dept && DOM_COUNTRY[dept]) || 'FR';
      const postcode = Array.isArray(c.codesPostaux) ? c.codesPostaux[0] : undefined;
      const s: CitySuggestion = {
        name: c.nom,
        countryCode: code,
        country: countryOf(code),
        department: dept,
        postcode,
        population: typeof c.population === 'number' ? c.population : undefined,
        detail: [dept ? `Dép. ${dept}` : null, postcode].filter(Boolean).join(' · ') || undefined,
        source: 'geo',
        score: 0,
      };
      s.score = scoreSuggestion(query, s, countryCode);
      return s;
    });
}

const PLACE_KIND_BONUS: Record<string, number> = { city: 10, town: 6, village: 2, municipality: 4 };

/** Photon : ne garde que les lieux habités (ville, bourg, village). */
export function parsePhoton(query: string, data: any, countryCode?: string | null): CitySuggestion[] {
  const features: any[] = Array.isArray(data?.features) ? data.features : [];
  return features
    .map((f) => f?.properties ?? {})
    .filter((p) => p.name && p.osm_key === 'place' && p.osm_value in PLACE_KIND_BONUS)
    .map((p) => {
      const code = p.countrycode ? String(p.countrycode).toUpperCase() : null;
      const country = countryOf(code);
      const s: CitySuggestion = {
        name: p.name,
        countryCode: code,
        country,
        postcode: p.postcode || undefined,
        detail: [p.state, country?.name ?? p.country].filter(Boolean).join(' · ') || undefined,
        source: 'photon',
        score: 0,
      };
      s.score = scoreSuggestion(query, { ...s, kindBonus: PLACE_KIND_BONUS[p.osm_value] }, countryCode);
      return s;
    });
}

/** Nominatim : résultats de type lieu habité. */
export function parseNominatim(query: string, data: any, countryCode?: string | null): CitySuggestion[] {
  const list: any[] = Array.isArray(data) ? data : [];
  return list
    .filter((r) => r && (r.category === 'place' || r.class === 'place' || r.addresstype in PLACE_KIND_BONUS || r.category === 'boundary'))
    .map((r) => {
      const a = r.address ?? {};
      const name: string = r.name || a.city || a.town || a.village || '';
      const code = a.country_code ? String(a.country_code).toUpperCase() : null;
      const country = countryOf(code);
      const s: CitySuggestion = {
        name,
        countryCode: code,
        country,
        detail: [a.state, country?.name ?? a.country].filter(Boolean).join(' · ') || undefined,
        source: 'nominatim',
        score: 0,
      };
      s.score = scoreSuggestion(query, { ...s, kindBonus: PLACE_KIND_BONUS[r.type] ?? PLACE_KIND_BONUS[r.addresstype] ?? 0 }, countryCode);
      return s;
    })
    .filter((s) => s.name);
}

let lastNominatimAt = 0;
/** Pour les tests. */
export function resetNominatimThrottle() {
  lastNominatimAt = 0;
}

async function searchFrance(query: string, opts: SearchOptions, fetcher: Fetcher): Promise<CitySuggestion[] | null> {
  const dept = opts.countryCode ? FRENCH_CODES[opts.countryCode] : null;
  const q = encodeURIComponent(query);
  const adresseUrl = `${ADRESSE_URL}/search/?q=${q}&type=municipality&limit=${MAX_RESULTS}&autocomplete=1`;
  const geoUrl =
    `${GEO_API_URL}/communes?nom=${q}&fields=nom,codesPostaux,codeDepartement,population` +
    `&boost=population&limit=${MAX_RESULTS}` + (dept ? `&codeDepartement=${dept}` : '');
  const [adresse, geo] = await Promise.allSettled([
    getJson(fetcher, adresseUrl, opts.signal),
    getJson(fetcher, geoUrl, opts.signal),
  ]);
  if (adresse.status === 'rejected' && geo.status === 'rejected') return null;
  let all = [
    ...(adresse.status === 'fulfilled' ? parseAdresse(query, adresse.value, opts.countryCode) : []),
    ...(geo.status === 'fulfilled' ? parseGeo(query, geo.value, opts.countryCode) : []),
  ];
  // Un DOM choisi : seulement ses communes.
  if (dept) all = all.filter((s) => s.department === dept);
  return all;
}

async function searchWorld(query: string, opts: SearchOptions, fetcher: Fetcher): Promise<CitySuggestion[] | null> {
  const q = encodeURIComponent(query);
  const photonUrl =
    `${PHOTON_URL}/api/?q=${q}&limit=${opts.countryCode ? 15 : MAX_RESULTS}&lang=fr` +
    '&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village';
  try {
    const found = parsePhoton(query, await getJson(fetcher, photonUrl, opts.signal), opts.countryCode);
    if (found.length) return found;
  } catch (e: any) {
    if (e?.name === 'AbortError' && opts.signal?.aborted) throw e;
  }
  // Repli Nominatim, une requête par seconde au plus.
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const wait = lastNominatimAt + NOMINATIM_INTERVAL_MS - now();
  if (wait > 0) await sleep(wait);
  if (opts.signal?.aborted) return [];
  lastNominatimAt = now();
  const nominatimUrl =
    `${NOMINATIM_URL}/search?format=jsonv2&addressdetails=1&limit=${MAX_RESULTS}&accept-language=fr` +
    `&featureType=settlement&q=${q}` +
    (opts.countryCode ? `&countrycodes=${opts.countryCode.toLowerCase()}` : '');
  try {
    return parseNominatim(query, await getJson(fetcher, nominatimUrl, opts.signal), opts.countryCode);
  } catch {
    return null;
  }
}

const cache = new Map<string, CitySuggestion[]>();
/** Pour les tests. */
export function clearCitySearchCache() {
  cache.clear();
}

/**
 * Suggestions de villes pour la saisie `query` (2 caractères au moins),
 * classées de la plus probable à la moins probable. Ne lève pas d'erreur :
 * services injoignables → liste locale.
 */
export async function searchCities(query: string, opts: SearchOptions = {}): Promise<CitySuggestion[]> {
  const clean = query.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  if (normalizeCityQuery(clean).length < 2) return [];
  const code = opts.countryCode ? opts.countryCode.toUpperCase() : null;
  const key = `${code ?? ''}|${normalizeCityQuery(clean)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const fetcher: Fetcher = opts.fetchImpl ?? ((u, i) => fetch(u, i) as any);
  let online: CitySuggestion[] | null = null;
  try {
    online = code && code in FRENCH_CODES
      ? await searchFrance(clean, { ...opts, countryCode: code }, fetcher)
      : await searchWorld(clean, { ...opts, countryCode: code }, fetcher);
  } catch {
    online = null;
  }
  if (opts.signal?.aborted) return [];
  // Liste locale seulement si les services ne trouvent rien ou sont injoignables.
  const fromOnline = online?.length ? rankSuggestions(clean, online) : [];
  const ranked = fromOnline.length ? fromOnline : searchLocalCities(clean, code);
  // Les réponses en ligne sont gardées ; un repli hors ligne est retenté.
  if (fromOnline.length) {
    cache.set(key, ranked);
    if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  }
  return ranked;
}
