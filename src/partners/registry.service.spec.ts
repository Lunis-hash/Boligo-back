import { PartnerRegistrationType, PartnerVerification } from '@prisma/client';
import { RegistryService } from './registry.service';

type Reply = { status: number; body: unknown };

function service(reply: Reply | Error) {
  const s = new RegistryService();
  const fetchJson = jest
    .spyOn(
      s as unknown as { fetchJson: (u: string) => Promise<Reply> },
      'fetchJson',
    )
    .mockImplementation(() =>
      reply instanceof Error ? Promise.reject(reply) : Promise.resolve(reply),
    );
  return { s, fetchJson };
}

const sirene = (over: Record<string, unknown>) => ({
  status: 200,
  body: {
    results: [
      {
        siren: '552100554',
        nom_complet: 'ATELIER AWA',
        etat_administratif: 'A',
        date_creation: '2021-03-01',
        siege: {
          siret: '55210055400013',
          etat_administratif: 'A',
          libelle_commune: 'LYON',
        },
        ...over,
      },
    ],
  },
});

describe('Registres publics', () => {
  it('France : entreprise active trouvée dans l’annuaire', async () => {
    const { s, fetchJson } = service(sirene({}));
    const r = await s.verify(PartnerRegistrationType.SIRENE, '552 100 554');
    expect(fetchJson.mock.calls[0][0]).toContain(
      'recherche-entreprises.api.gouv.fr/search?q=552100554',
    );
    expect(r).toMatchObject({
      status: PartnerVerification.VERIFIE,
      officialName: 'ATELIER AWA',
    });
    expect(r.note).toContain('LYON');
  });

  it('France : entreprise cessée, établissement fermé, introuvable, non diffusible, saturé', async () => {
    expect(
      (
        await service(sirene({ etat_administratif: 'C' })).s.verify(
          PartnerRegistrationType.SIRENE,
          '552100554',
        )
      ).status,
    ).toBe(PartnerVerification.REJETE);
    expect(
      (
        await service(
          sirene({
            siege: { siret: '55210055400013', etat_administratif: 'F' },
          }),
        ).s.verify(PartnerRegistrationType.SIRENE, '55210055400013')
      ).status,
    ).toBe(PartnerVerification.REJETE);
    expect(
      (
        await service({ status: 200, body: { results: [] } }).s.verify(
          PartnerRegistrationType.SIRENE,
          '552100554',
        )
      ).status,
    ).toBe(PartnerVerification.A_VERIFIER);
    expect(
      (
        await service(sirene({ nom_complet: '[NON-DIFFUSIBLE]' })).s.verify(
          PartnerRegistrationType.SIRENE,
          '552100554',
        )
      ).status,
    ).toBe(PartnerVerification.A_VERIFIER);
    expect(
      (
        await service({ status: 429, body: null }).s.verify(
          PartnerRegistrationType.SIRENE,
          '552100554',
        )
      ).status,
    ).toBe(PartnerVerification.A_VERIFIER);
  });

  it('Union européenne : réponses de VIES', async () => {
    const ok = service({
      status: 200,
      body: { isValid: true, name: 'BOLIGO TEST BV', userError: 'VALID' },
    });
    const r = await ok.s.verify(
      PartnerRegistrationType.TVA_UE,
      'NL123456789B01',
    );
    expect(ok.fetchJson.mock.calls[0][0]).toContain('/ms/NL/vat/123456789B01');
    expect(r).toMatchObject({
      status: PartnerVerification.VERIFIE,
      officialName: 'BOLIGO TEST BV',
    });
    expect(
      (
        await service({
          status: 200,
          body: { isValid: true, name: '---' },
        }).s.verify(PartnerRegistrationType.TVA_UE, 'DE123456789')
      ).officialName,
    ).toBeNull();
    expect(
      (
        await service({
          status: 200,
          body: { isValid: false, userError: 'INVALID' },
        }).s.verify(PartnerRegistrationType.TVA_UE, 'BE0123456789')
      ).status,
    ).toBe(PartnerVerification.REJETE);
    expect(
      (
        await service({
          status: 200,
          body: { isValid: false, userError: 'MS_UNAVAILABLE' },
        }).s.verify(PartnerRegistrationType.TVA_UE, 'IT12345678901')
      ).status,
    ).toBe(PartnerVerification.A_VERIFIER);
  });

  it('Royaume-Uni : contrôle manuel sans clé, automatique avec la clé', async () => {
    const old = process.env.COMPANIES_HOUSE_API_KEY;
    delete process.env.COMPANIES_HOUSE_API_KEY;
    const manual = service({ status: 200, body: {} });
    expect(
      (await manual.s.verify(PartnerRegistrationType.UK_COMPANY, '01234567'))
        .status,
    ).toBe(PartnerVerification.A_VERIFIER);
    expect(manual.fetchJson).not.toHaveBeenCalled();
    process.env.COMPANIES_HOUSE_API_KEY = 'cle-de-test';
    expect(
      await service({
        status: 200,
        body: { company_name: 'AWA LTD', company_status: 'active' },
      }).s.verify(PartnerRegistrationType.UK_COMPANY, '01234567'),
    ).toMatchObject({
      status: PartnerVerification.VERIFIE,
      officialName: 'AWA LTD',
    });
    expect(
      (
        await service({ status: 404, body: {} }).s.verify(
          PartnerRegistrationType.UK_COMPANY,
          '01234567',
        )
      ).status,
    ).toBe(PartnerVerification.REJETE);
    process.env.COMPANIES_HOUSE_API_KEY = old;
    if (old === undefined) delete process.env.COMPANIES_HOUSE_API_KEY;
  });

  it('autre pays : contrôle manuel ; numéro mal formé : rejet sans appel ; registre injoignable : à vérifier', async () => {
    const other = service({ status: 200, body: {} });
    expect(
      (
        await other.s.verify(
          PartnerRegistrationType.AUTRE,
          'RC-ABJ-2019-B-12345',
        )
      ).status,
    ).toBe(PartnerVerification.A_VERIFIER);
    expect(other.fetchJson).not.toHaveBeenCalled();
    const bad = service({ status: 200, body: {} });
    expect(
      (await bad.s.verify(PartnerRegistrationType.SIRENE, '552100555')).status,
    ).toBe(PartnerVerification.REJETE);
    expect(bad.fetchJson).not.toHaveBeenCalled();
    expect(
      (
        await service(new Error('ECONNRESET')).s.verify(
          PartnerRegistrationType.SIRENE,
          '552100554',
        )
      ).status,
    ).toBe(PartnerVerification.A_VERIFIER);
  });
});
