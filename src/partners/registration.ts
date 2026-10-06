import { PartnerRegistrationType } from '@prisma/client';

/**
 * Numéros d'entreprise des partenaires : contrôle de forme, avant toute
 * interrogation des registres publics.
 */

/** Pays de l'UE (code VIES ; la Grèce est « EL ») et Irlande du Nord (« XI »). */
export const VIES_COUNTRIES = [
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'EL',
  'ES',
  'FI',
  'FR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
  'XI',
];

/** Espaces, points, tirets et barres retirés ; lettres en majuscules. */
export function compactNumber(raw: string): string {
  return raw.replace(/[\s.\-/]/g, '').toUpperCase();
}

/** Clé de Luhn (SIREN, SIRET). */
export function luhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const LA_POSTE_SIREN = '356000000';

export type RegistrationCheck =
  | { ok: true; number: string; siren?: string; country?: string }
  | { ok: false; error: string };

/** SIREN (9 chiffres) ou SIRET (14 chiffres), clé de contrôle comprise. */
export function checkSirene(raw: string): RegistrationCheck {
  const n = compactNumber(raw);
  if (/^\d{9}$/.test(n)) {
    return luhnValid(n)
      ? { ok: true, number: n, siren: n }
      : { ok: false, error: 'SIREN invalide : vérifiez les 9 chiffres.' };
  }
  if (/^\d{14}$/.test(n)) {
    const siren = n.slice(0, 9);
    // Les établissements de La Poste suivent une règle propre (somme multiple de 5).
    const valid =
      siren === LA_POSTE_SIREN
        ? [...n].reduce((s, c) => s + Number(c), 0) % 5 === 0
        : luhnValid(n);
    return valid
      ? { ok: true, number: n, siren }
      : { ok: false, error: 'SIRET invalide : vérifiez les 14 chiffres.' };
  }
  return {
    ok: false,
    error: 'Indiquez un SIREN (9 chiffres) ou un SIRET (14 chiffres).',
  };
}

/** Numéro de TVA intracommunautaire : préfixe du pays puis 2 à 12 caractères. */
export function checkEuVat(raw: string): RegistrationCheck {
  let n = compactNumber(raw);
  if (n.startsWith('GR')) n = `EL${n.slice(2)}`;
  const country = n.slice(0, 2);
  const rest = n.slice(2);
  if (!VIES_COUNTRIES.includes(country) || !/^[0-9A-Z]{2,12}$/.test(rest)) {
    return {
      ok: false,
      error:
        'Numéro de TVA invalide : il commence par le code du pays (FR, BE, DE…).',
    };
  }
  return { ok: true, number: n, country };
}

/** Company number britannique : 8 chiffres, ou 2 lettres et 6 chiffres. */
export function checkUkCompany(raw: string): RegistrationCheck {
  const n = compactNumber(raw);
  if (/^\d{1,8}$/.test(n)) return { ok: true, number: n.padStart(8, '0') };
  if (/^[A-Z]{2}\d{6}$/.test(n)) return { ok: true, number: n };
  return {
    ok: false,
    error: 'Company number invalide : 8 chiffres, ou 2 lettres et 6 chiffres.',
  };
}

/** Autre pays : numéro officiel de 4 à 30 lettres ou chiffres. */
export function checkOther(raw: string): RegistrationCheck {
  const n = compactNumber(raw);
  return /^[0-9A-Z]{4,30}$/.test(n)
    ? { ok: true, number: n }
    : {
        ok: false,
        error:
          'Numéro d’immatriculation invalide (4 à 30 lettres ou chiffres).',
      };
}

export function checkRegistration(
  type: PartnerRegistrationType,
  raw: string,
): RegistrationCheck {
  switch (type) {
    case PartnerRegistrationType.SIRENE:
      return checkSirene(raw);
    case PartnerRegistrationType.TVA_UE:
      return checkEuVat(raw);
    case PartnerRegistrationType.UK_COMPANY:
      return checkUkCompany(raw);
    default:
      return checkOther(raw);
  }
}

export const REGISTRATION_LABELS: Record<PartnerRegistrationType, string> = {
  SIRENE: 'SIREN / SIRET (France)',
  TVA_UE: 'TVA intracommunautaire (Union européenne)',
  UK_COMPANY: 'Company number (Royaume-Uni)',
  AUTRE: 'Numéro d’immatriculation (autre pays)',
};
