import { Injectable, Logger } from '@nestjs/common';
import { PartnerRegistrationType, PartnerVerification } from '@prisma/client';
import { checkRegistration } from './registration';

export interface RegistryResult {
  status: PartnerVerification;
  method: string;
  officialName: string | null;
  note: string;
}

const TIMEOUT_MS = 8000;

type JsonResponse = { status: number; body: unknown };

const MANUAL_HINT =
  'Contrôle manuel : demander au partenaire un extrait officiel et récent de son immatriculation, puis le comparer au registre public du pays.';

/**
 * Interroge les registres publics officiels et gratuits :
 * - France : Annuaire des entreprises de l'État (données INSEE Sirene) ;
 * - Union européenne et Irlande du Nord : VIES de la Commission européenne ;
 * - Royaume-Uni : Companies House (clé gratuite COMPANIES_HOUSE_API_KEY).
 * Ailleurs, ou si un registre ne répond pas, le dossier reste « à vérifier »
 * pour un contrôle manuel de l'équipe.
 */
@Injectable()
export class RegistryService {
  private readonly logger = new Logger('Registres');

  async verify(
    type: PartnerRegistrationType,
    rawNumber: string,
  ): Promise<RegistryResult> {
    const check = checkRegistration(type, rawNumber);
    if (!check.ok) {
      return {
        status: PartnerVerification.REJETE,
        method: 'Contrôle de forme',
        officialName: null,
        note: check.error,
      };
    }
    try {
      switch (type) {
        case PartnerRegistrationType.SIRENE:
          return await this.verifySirene(check.number, check.siren as string);
        case PartnerRegistrationType.TVA_UE:
          return await this.verifyVies(
            check.country as string,
            check.number.slice(2),
          );
        case PartnerRegistrationType.UK_COMPANY:
          return await this.verifyCompaniesHouse(check.number);
        default:
          return {
            status: PartnerVerification.A_VERIFIER,
            method: 'Contrôle manuel',
            officialName: null,
            note: MANUAL_HINT,
          };
      }
    } catch (err) {
      this.logger.warn(`Registre injoignable : ${(err as Error).message}`);
      return {
        status: PartnerVerification.A_VERIFIER,
        method: 'Registre injoignable',
        officialName: null,
        note: 'Le registre n’a pas répondu : relancez la vérification plus tard.',
      };
    }
  }

  /** Annuaire des entreprises (recherche-entreprises.api.gouv.fr), sans clé. */
  private async verifySirene(
    number: string,
    siren: string,
  ): Promise<RegistryResult> {
    const method = 'Annuaire des entreprises (INSEE)';
    const res = await this.fetchJson(
      `https://recherche-entreprises.api.gouv.fr/search?q=${number}&page=1&per_page=5`,
    );
    if (res.status === 429 || res.status >= 500) {
      return {
        status: PartnerVerification.A_VERIFIER,
        method,
        officialName: null,
        note: 'Annuaire momentanément indisponible : relancez la vérification.',
      };
    }
    const results =
      (res.body as { results?: SireneResult[] } | null)?.results ?? [];
    const company = results.find((r) => r.siren === siren);
    if (!company) {
      return {
        status: PartnerVerification.A_VERIFIER,
        method,
        officialName: null,
        note: 'Introuvable dans l’annuaire public (entreprise peut-être non diffusible) : demander un avis de situation INSEE ou un extrait Kbis, puis valider manuellement.',
      };
    }
    const name = company.nom_complet || company.nom_raison_sociale || null;
    const hidden = !name || /NON[- ]DIFFUSIBLE/i.test(name);
    let state = company.etat_administratif;
    if (number.length === 14) {
      const site = [company.siege, ...(company.matching_etablissements ?? [])]
        .filter(Boolean)
        .find((e) => e?.siret === number);
      if (site?.etat_administratif) state = site.etat_administratif;
    }
    if (state === 'C' || state === 'F') {
      return {
        status: PartnerVerification.REJETE,
        method,
        officialName: hidden ? null : name,
        note:
          number.length === 14
            ? 'Établissement fermé selon l’INSEE.'
            : 'Entreprise cessée selon l’INSEE.',
      };
    }
    if (hidden) {
      return {
        status: PartnerVerification.A_VERIFIER,
        method,
        officialName: null,
        note: 'Entreprise active mais non diffusible : demander un avis de situation INSEE, puis valider manuellement.',
      };
    }
    const city = company.siege?.libelle_commune;
    return {
      status: PartnerVerification.VERIFIE,
      method,
      officialName: name,
      note: `Entreprise active${city ? `, siège à ${city}` : ''}${
        company.date_creation ? `, créée le ${company.date_creation}` : ''
      }. Vérifiez que le nom correspond au candidat.`,
    };
  }

  /** VIES, service officiel de la Commission européenne, sans clé. */
  private async verifyVies(
    country: string,
    vat: string,
  ): Promise<RegistryResult> {
    const method = 'VIES (Commission européenne)';
    const res = await this.fetchJson(
      `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/${country}/vat/${vat}`,
    );
    const body = (res.body ?? {}) as {
      isValid?: boolean;
      name?: string;
      userError?: string;
    };
    if (body.isValid === true) {
      const name = body.name && body.name !== '---' ? body.name : null;
      return {
        status: PartnerVerification.VERIFIE,
        method,
        officialName: name,
        note: name
          ? 'Numéro de TVA valide. Vérifiez que le nom correspond au candidat.'
          : 'Numéro de TVA valide (ce pays ne communique pas le nom : vérifiez-le sur un justificatif).',
      };
    }
    if (
      body.isValid === false &&
      (!body.userError ||
        body.userError === 'VALID' ||
        body.userError === 'INVALID')
    ) {
      return {
        status: PartnerVerification.REJETE,
        method,
        officialName: null,
        note: 'Numéro de TVA inconnu ou inactif selon VIES.',
      };
    }
    return {
      status: PartnerVerification.A_VERIFIER,
      method,
      officialName: null,
      note: 'Le service du pays ne répond pas : relancez la vérification plus tard.',
    };
  }

  /** Companies House : clé gratuite à créer sur developer.company-information.service.gov.uk. */
  private async verifyCompaniesHouse(number: string): Promise<RegistryResult> {
    const method = 'Companies House (Royaume-Uni)';
    const key = process.env.COMPANIES_HOUSE_API_KEY;
    if (!key) {
      return {
        status: PartnerVerification.A_VERIFIER,
        method: 'Contrôle manuel',
        officialName: null,
        note: `Vérifiez le numéro sur find-and-update.company-information.service.gov.uk (ou ajoutez COMPANIES_HOUSE_API_KEY pour un contrôle automatique). ${MANUAL_HINT}`,
      };
    }
    const res = await this.fetchJson(
      `https://api.company-information.service.gov.uk/company/${number}`,
      {
        Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      },
    );
    if (res.status === 404) {
      return {
        status: PartnerVerification.REJETE,
        method,
        officialName: null,
        note: 'Société inconnue de Companies House.',
      };
    }
    const body = (res.body ?? {}) as {
      company_name?: string;
      company_status?: string;
    };
    if (res.status !== 200 || !body.company_status) {
      return {
        status: PartnerVerification.A_VERIFIER,
        method,
        officialName: null,
        note: 'Companies House ne répond pas : relancez la vérification plus tard.',
      };
    }
    const active = body.company_status === 'active';
    return {
      status: active ? PartnerVerification.VERIFIE : PartnerVerification.REJETE,
      method,
      officialName: body.company_name ?? null,
      note: active
        ? 'Société active. Vérifiez que le nom correspond au candidat.'
        : `Société non active (statut : ${body.company_status}).`,
    };
  }

  protected async fetchJson(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<JsonResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', ...headers },
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      return { status: res.status, body };
    } finally {
      clearTimeout(timer);
    }
  }
}

type Etablissement = {
  siret?: string;
  etat_administratif?: string;
  libelle_commune?: string;
};

type SireneResult = {
  siren: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  etat_administratif?: string;
  date_creation?: string;
  siege?: Etablissement;
  matching_etablissements?: Etablissement[];
};
