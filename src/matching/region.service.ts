import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Région administrative d'une ville, pour les périmètres « Près de chez moi »
 * et « Même région » de la Découverte, dans tous les pays (Argenteuil et
 * Bezons : Île-de-France ; Cocody et Yopougon : Abidjan).
 *
 * - France : service public geo.api.gouv.fr, par nom de commune ou code
 *   postal (« 95870 » → Bezons → Île-de-France).
 * - Autres pays : OpenStreetMap (Nominatim), « Ville, Pays » → région,
 *   province ou État. Règle d'usage respectée : une requête par seconde au
 *   plus, identifiée, en arrière-plan.
 *
 * Chaque ville n'est cherchée qu'une fois : le résultat est gardé en mémoire
 * et dans la table GeoRegion. Seul le nom de la ville part vers ces services,
 * jamais une donnée du membre. Une région inconnue n'exclut personne : la
 * Découverte compare alors le pays.
 */
export const GEO_API_URL = 'https://geo.api.gouv.fr';
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'BOLIGO/1.0 (contact@boligo.fr)';
const TIMEOUT_MS = 4000;
const CACHE_MAX = 5000;
const CONCURRENCY = 6;
/** Une ville introuvable est recherchée de nouveau après ce délai. */
const RETRY_NOT_FOUND_MS = 30 * 24 * 3600 * 1000;
/** Nominatim : une requête par seconde au plus. */
const NOMINATIM_INTERVAL_MS = 1100;

export const normCity = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** « Ville, Pays » découpé ; pays absent : France (inscription française). */
export function splitPlace(
  city: string | null | undefined,
): { first: string; country: string } | null {
  const parts = (city ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  return {
    first: parts[0],
    country: parts.length >= 2 ? parts[parts.length - 1] : 'France',
  };
}

/** Ville à chercher en France, ou null si l'adresse est d'un autre pays. */
export function frenchLookup(
  city: string | null | undefined,
): { postcode?: string; name?: string } | null {
  const place = splitPlace(city);
  if (!place || normCity(place.country) !== 'france') return null;
  const postcode = /\b(\d{5})\b/.exec(place.first)?.[1];
  if (postcode) return { postcode };
  const name = place.first.replace(/\s+\d+(e|er|eme)?$/i, '').trim(); // « Paris 11e »
  return name.length >= 2 ? { name } : null;
}

/** Région la plus fine retournée par OpenStreetMap pour une ville. */
export function regionFromNominatim(
  address: Record<string, string> | undefined,
): string | null {
  if (!address) return null;
  return (
    address.state ??
    address.region ??
    address.province ??
    address.state_district ??
    address.county ??
    null
  );
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

@Injectable()
export class RegionService implements OnModuleInit {
  private readonly cache = new Map<string, string | null>();
  private readonly queue: string[] = [];
  private readonly queued = new Set<string>();
  private draining: Promise<void> | null = null;
  /** Remplacés dans les tests. */
  fetcher: Fetcher = (u, i) => fetch(u, i);
  sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  constructor(@Optional() private readonly prisma?: PrismaService) {}

  /** Au démarrage, en arrière-plan : régions des villes des membres. */
  onModuleInit() {
    if (!this.prisma || process.env.NODE_ENV === 'test') return;
    setTimeout(() => void this.warmUp(), 5000);
  }

  async warmUp() {
    try {
      const users = await this.prisma!.user.findMany({
        where: { city: { not: null } },
        select: { city: true },
        distinct: ['city'],
        take: 2000,
      });
      await this.regionsOf(users.map((u) => u.city));
    } catch (err) {
      console.warn(
        '[REGIONS] Préparation impossible :',
        (err as Error).message,
      );
    }
  }

  /** Régions de plusieurs villes ; null tant qu'une ville n'est pas connue. */
  async regionsOf(
    cities: Array<string | null | undefined>,
  ): Promise<Map<string, string | null>> {
    const unique = [...new Set(cities.filter((c): c is string => !!c))];
    const out = new Map<string, string | null>();
    const missing = unique.filter((c) => {
      const key = normCity(c);
      if (!this.cache.has(key)) return true;
      out.set(c, this.cache.get(key) ?? null);
      return false;
    });
    if (!missing.length) return out;

    const stored = await this.readStored(missing.map(normCity));
    const toFetch: string[] = [];
    for (const c of missing) {
      const key = normCity(c);
      const row = stored.get(key);
      const fresh =
        row &&
        (row.region !== null ||
          Date.now() - row.updatedAt.getTime() < RETRY_NOT_FOUND_MS);
      if (fresh) {
        this.remember(key, row.region);
        out.set(c, row.region);
      } else toFetch.push(c);
    }

    // France : réponse immédiate. Ailleurs : file d'attente en arrière-plan.
    const french = toFetch.filter((c) => frenchLookup(c));
    for (const c of toFetch) {
      if (frenchLookup(c)) continue;
      this.enqueue(c);
      out.set(c, null);
    }
    for (let i = 0; i < french.length; i += CONCURRENCY) {
      const batch = french.slice(i, i + CONCURRENCY);
      const regions = await Promise.all(batch.map((c) => this.fromFrance(c)));
      batch.forEach((c, j) => {
        if (regions[j] !== undefined) void this.save(normCity(c), regions[j]);
        out.set(c, regions[j] ?? null);
      });
    }
    return out;
  }

  /** Région d'une seule ville (France immédiatement, ailleurs dès que connue). */
  async regionOf(city: string | null | undefined): Promise<string | null> {
    if (!city) return null;
    return (await this.regionsOf([city])).get(city) ?? null;
  }

  private remember(key: string, region: string | null) {
    if (this.cache.size >= CACHE_MAX) this.cache.clear();
    this.cache.set(key, region);
  }

  private async readStored(
    keys: string[],
  ): Promise<Map<string, { region: string | null; updatedAt: Date }>> {
    const map = new Map<string, { region: string | null; updatedAt: Date }>();
    if (!this.prisma) return map;
    try {
      const rows = await this.prisma.geoRegion.findMany({
        where: { key: { in: keys } },
      });
      for (const r of rows) map.set(r.key, r);
    } catch {
      /* table absente ou base injoignable : on cherche en ligne */
    }
    return map;
  }

  private async save(key: string, region: string | null) {
    this.remember(key, region);
    if (!this.prisma) return;
    try {
      await this.prisma.geoRegion.upsert({
        where: { key },
        create: { key, region },
        update: { region },
      });
    } catch {
      /* la mémoire suffit jusqu'au prochain essai */
    }
  }

  /** undefined : service injoignable ; null : ville introuvable. */
  private async fromFrance(city: string): Promise<string | null | undefined> {
    const lookup = frenchLookup(city)!;
    const params = new URLSearchParams({ fields: 'region', limit: '1' });
    if (lookup.postcode) params.set('codePostal', lookup.postcode);
    else {
      params.set('nom', lookup.name!);
      params.set('boost', 'population');
    }
    try {
      const res = await this.fetcher(`${GEO_API_URL}/communes?${params}`, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return undefined;
      const data = (await res.json()) as Array<{ region?: { nom?: string } }>;
      return data?.[0]?.region?.nom ?? null;
    } catch {
      return undefined;
    }
  }

  private async fromWorld(city: string): Promise<string | null | undefined> {
    const params = new URLSearchParams({
      q: city,
      format: 'jsonv2',
      addressdetails: '1',
      limit: '1',
      'accept-language': 'fr',
    });
    try {
      const res = await this.fetcher(`${NOMINATIM_URL}/search?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) return undefined;
      const data = (await res.json()) as Array<{
        address?: Record<string, string>;
      }>;
      return regionFromNominatim(data?.[0]?.address);
    } catch {
      return undefined;
    }
  }

  private enqueue(city: string) {
    const key = normCity(city);
    if (this.queued.has(key)) return;
    this.queued.add(key);
    this.queue.push(city);
    void this.drain();
  }

  /** Recherches hors de France, une par seconde, sans faire attendre personne. */
  drain(): Promise<void> {
    this.draining ??= this.run().finally(() => {
      this.draining = null;
    });
    return this.draining;
  }

  private async run() {
    while (this.queue.length) {
      const city = this.queue.shift()!;
      const key = normCity(city);
      const region = await this.fromWorld(city);
      if (region !== undefined) await this.save(key, region);
      this.queued.delete(key);
      if (this.queue.length) await this.sleep(NOMINATIM_INTERVAL_MS);
    }
  }
}
