import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PartnerStatus, PartnerType } from '@prisma/client';
import { PartnersService } from './partners.service';

type Row = Record<string, unknown>;
type App = Row & {
  id: string;
  email: string;
  type: string;
  promoCodeId: string | null;
};
type Code = Row & { id: string; code: string };
type Where = {
  id?: string;
  email?: string;
  type?: string;
  code?: string;
  portalTokenHash?: string;
};

function setup() {
  const apps: App[] = [];
  const codes: Code[] = [];
  const withCode = (a: App) => ({
    ...a,
    promoCode: codes.find((c) => c.id === a.promoCodeId) ?? null,
  });
  const prisma = {
    partnerApplication: {
      findFirst: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(
          apps.find((a) => a.email === where.email && a.type === where.type) ??
            null,
        ),
      ),
      findUnique: jest.fn(({ where }: { where: Where }) => {
        const a = apps.find((x) =>
          where.portalTokenHash !== undefined
            ? x.portalTokenHash === where.portalTokenHash
            : x.id === where.id,
        );
        return Promise.resolve(a ? withCode(a) : null);
      }),
      create: jest.fn(({ data }: { data: Row }) => {
        const row = {
          id: `00000000-0000-4000-8000-00000000000${apps.length + 1}`,
          status: 'NOUVEAU',
          promoCodeId: null,
          ...data,
        } as App;
        apps.push(row);
        return Promise.resolve(row);
      }),
      update: jest.fn(({ where, data }: { where: Where; data: Row }) => {
        const a = apps.find((x) => x.id === where.id)!;
        Object.assign(
          a,
          Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined),
          ),
        );
        return Promise.resolve(withCode(a));
      }),
    },
    promoCode: {
      findUnique: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(codes.find((c) => c.code === where.code) ?? null),
      ),
      create: jest.fn(({ data }: { data: Row }) => {
        const row = { id: `code-${codes.length + 1}`, ...data } as Code;
        codes.push(row);
        return Promise.resolve(row);
      }),
    },
    creditTransaction: {
      groupBy: jest.fn(() =>
        Promise.resolve([
          {
            promoCodeId: 'code-1',
            _count: { _all: 3 },
            _sum: { euroAmount: 40.5 },
          },
        ]),
      ),
      findMany: jest.fn(() =>
        Promise.resolve([
          { date: new Date(), euroAmount: 13.5 },
          { date: new Date(), euroAmount: 13.5 },
          { date: new Date('2020-01-01T00:00:00Z'), euroAmount: 13.5 },
        ]),
      ),
    },
  };
  const email = { sendSimpleEmail: jest.fn(() => Promise.resolve()) };
  return {
    service: new PartnersService(prisma as never, email as never),
    prisma,
    email,
    apps,
    codes,
  };
}

const base = {
  type: PartnerType.CREATEUR,
  name: 'Awa Diop',
  email: 'awa@exemple.com',
  country: 'Sénégal',
  message: 'Je crée du contenu sur les relations sérieuses pour la diaspora.',
  language: 'fr' as const,
  consent: true,
};

describe('Programme Partenaires : service', () => {
  it('enregistre la candidature avec la commission du profil et prévient l’équipe et le candidat', async () => {
    const { service, apps, email } = setup();
    const res = await service.apply(base);
    expect(res.ok).toBe(true);
    expect(apps[0]).toMatchObject({
      type: 'CREATEUR',
      commissionRate: 15,
      language: 'fr',
    });
    await new Promise((r) => setImmediate(r));
    expect(email.sendSimpleEmail).toHaveBeenCalledTimes(2);
    const [teamTo] = email.sendSimpleEmail.mock.calls[0] as unknown as [string];
    expect(teamTo).toBe('contact@boligo.fr');
  });

  it('ignore un doublon envoyé dans les 24 heures', async () => {
    const { service, apps } = setup();
    await service.apply(base);
    const again = await service.apply(base);
    expect(again).toMatchObject({ ok: true, duplicate: true });
    expect(apps).toHaveLength(1);
  });

  it('crée un code personnel, valide la candidature et refuse un second code', async () => {
    const { service, apps, codes } = setup();
    await service.apply(base);
    const id = apps[0].id;
    const res = await service.createCode(id, { discountPercent: 10 });
    expect(res.status).toBe(PartnerStatus.ACCEPTE);
    expect(codes[0].code).toMatch(/^AWADIOP\d{2}$/);
    expect(codes[0]).toMatchObject({
      discountType: 'percent',
      discountValue: 10,
      isActive: true,
    });
    await expect(service.createCode(id, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('refuse un code saisi déjà pris ou mal formé', async () => {
    const { service, apps, codes } = setup();
    codes.push({ id: 'x', code: 'AWA2026' });
    await service.apply(base);
    await expect(
      service.createCode(apps[0].id, { code: 'awa-2026' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createCode(apps[0].id, { code: 'a!' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('calcule ventes et commission du partenaire', async () => {
    const { service, apps } = setup();
    await service.apply(base);
    await service.createCode(apps[0].id, {});
    const detail = await service.get(apps[0].id);
    expect(detail.sales).toEqual({
      purchases: 3,
      revenue: 40.5,
      commission: 6.08,
    });
  });

  it('accueille le partenaire avec un lien privé dont seule l’empreinte est gardée', async () => {
    const { service, apps, email } = setup();
    await service.apply(base);
    email.sendSimpleEmail.mockClear();
    const res = await service.createCode(apps[0].id, {});
    expect(res.portalLink).toMatch(
      /^https:\/\/boligo-web\.onrender\.com\/espace-partenaire#[A-Za-z0-9_-]{43}$/,
    );
    expect(res).not.toHaveProperty('portalTokenHash');
    expect(res.portalActive).toBe(true);
    const token = res.portalLink.split('#')[1];
    expect(apps[0].portalTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(apps[0].portalTokenHash).not.toContain(token);
    const call = email.sendSimpleEmail.mock.calls[0] as unknown as [
      string,
      string,
      string,
      string[],
      string,
      { url: string },
    ];
    expect(call[0]).toBe('awa@exemple.com');
    expect(call[1]).toContain('Bienvenue');
    expect(call[5].url).toBe(res.portalLink);
  });

  it('montre au partenaire ses totaux, sans aucune donnée de membre', async () => {
    const { service, apps } = setup();
    await service.apply(base);
    const { portalLink } = await service.createCode(apps[0].id, {});
    const data = await service.portal(portalLink.split('#')[1]);
    expect(data.code.code).toMatch(/^AWADIOP/);
    expect(data.code.isActive).toBe(true);
    expect(data.totals).toEqual({
      purchases: 3,
      revenue: 40.5,
      commission: 6.08,
    });
    expect(data.months).toHaveLength(12);
    expect(data.months[0]).toMatchObject({ purchases: 2, revenue: 27 });
    const json = JSON.stringify(data);
    expect(json).not.toMatch(/userId|email|notes|portalTokenHash/);
  });

  it('un nouveau lien remplace l’ancien ; un accès coupé ou refusé ne s’ouvre plus', async () => {
    const { service, apps } = setup();
    await service.apply(base);
    const first = (await service.createCode(apps[0].id, {})).portalLink;
    const second = (await service.sendPortalLink(apps[0].id)).portalLink;
    await expect(service.portal(first.split('#')[1])).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.portal(second.split('#')[1])).resolves.toBeTruthy();
    await service.revokePortal(apps[0].id);
    await expect(service.portal(second.split('#')[1])).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const third = (await service.sendPortalLink(apps[0].id)).portalLink;
    await service.update(apps[0].id, { status: PartnerStatus.REFUSE });
    await expect(service.portal(third.split('#')[1])).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.portal('pas-un-jeton')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuse d’ouvrir un Espace partenaire avant la création du code', async () => {
    const { service, apps } = setup();
    await service.apply(base);
    await expect(service.sendPortalLink(apps[0].id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
