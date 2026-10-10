import {
  frenchLookup,
  regionFromNominatim,
  RegionService,
} from './region.service';

const json = (body: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);

function setup(
  stored: Array<{ key: string; region: string | null; updatedAt: Date }> = [],
) {
  const prisma = {
    geoRegion: {
      findMany: jest.fn(() => Promise.resolve(stored)),
      upsert: jest.fn(() => Promise.resolve({})),
    },
  };
  const service = new RegionService(prisma as never);
  const urls: string[] = [];
  service.sleep = () => Promise.resolve();
  service.fetcher = (url: string) => {
    urls.push(url);
    if (url.includes('geo.api.gouv.fr')) {
      if (url.includes('codePostal=95870') || url.includes('nom=Argenteuil'))
        return json([{ region: { nom: 'Île-de-France' } }]);
      return json([]);
    }
    if (url.includes('Cocody'))
      return json([{ address: { state: 'Abidjan' } }]);
    return json([]);
  };
  return { service, prisma, urls };
}

describe('Régions des villes', () => {
  it('reconnaît une commune française, par nom ou code postal', () => {
    expect(frenchLookup('95870, France')).toEqual({ postcode: '95870' });
    expect(frenchLookup('Paris 11e, France')).toEqual({ name: 'Paris' });
    expect(frenchLookup('Argenteuil')).toEqual({ name: 'Argenteuil' });
    expect(frenchLookup('Dakar, Sénégal')).toBeNull();
  });

  it('lit la région, la province ou l’État renvoyé par OpenStreetMap', () => {
    expect(regionFromNominatim({ state: 'Abidjan' })).toBe('Abidjan');
    expect(regionFromNominatim({ province: 'Kinshasa' })).toBe('Kinshasa');
    expect(regionFromNominatim(undefined)).toBeNull();
  });

  it('Argenteuil et 95870 (Bezons) sont en Île-de-France, cherchées une seule fois', async () => {
    const { service, prisma, urls } = setup();
    const map = await service.regionsOf([
      'Argenteuil, France',
      '95870, France',
    ]);
    expect(map.get('Argenteuil, France')).toBe('Île-de-France');
    expect(map.get('95870, France')).toBe('Île-de-France');
    expect(prisma.geoRegion.upsert).toHaveBeenCalledTimes(2);
    await service.regionsOf(['Argenteuil, France']);
    expect(urls).toHaveLength(2);
  });

  it('hors de France : cherché en arrière-plan, puis connu', async () => {
    const { service, urls } = setup();
    const first = await service.regionsOf(['Cocody, Côte d’Ivoire']);
    expect(first.get('Cocody, Côte d’Ivoire')).toBeNull();
    await service.drain();
    const later = await service.regionsOf(['Cocody, Côte d’Ivoire']);
    expect(later.get('Cocody, Côte d’Ivoire')).toBe('Abidjan');
    expect(urls.filter((u) => u.includes('nominatim'))).toHaveLength(1);
  });

  it('réutilise la région déjà enregistrée sans rien chercher en ligne', async () => {
    const { service, urls } = setup([
      {
        key: 'lyon, france',
        region: 'Auvergne-Rhône-Alpes',
        updatedAt: new Date(),
      },
    ]);
    const map = await service.regionsOf(['Lyon, France']);
    expect(map.get('Lyon, France')).toBe('Auvergne-Rhône-Alpes');
    expect(urls).toHaveLength(0);
  });

  it('une panne ne bloque rien et n’est pas mémorisée', async () => {
    const { service, prisma } = setup();
    service.fetcher = () => Promise.reject(new Error('réseau'));
    const map = await service.regionsOf(['Argenteuil, France']);
    expect(map.get('Argenteuil, France')).toBeNull();
    expect(prisma.geoRegion.upsert).not.toHaveBeenCalled();
  });
});
