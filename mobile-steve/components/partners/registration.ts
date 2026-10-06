/**
 * Numéro d'entreprise des partenaires : mêmes règles de forme que l'API
 * (src/partners/registration.ts), pour prévenir avant l'envoi.
 */
export type RegistrationType = 'SIRENE' | 'TVA_UE' | 'UK_COMPANY' | 'AUTRE';
export const REGISTRATION_TYPES: RegistrationType[] = ['SIRENE', 'TVA_UE', 'UK_COMPANY', 'AUTRE'];

const VIES = [
  'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES', 'FI', 'FR', 'HR', 'HU',
  'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK', 'XI',
];

export const compactNumber = (raw: string) => raw.replace(/[\s.\-/]/g, '').toUpperCase();

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

/** Le numéro a-t-il une forme valide pour ce type ? */
export function isRegistrationValid(type: RegistrationType | null, raw: string): boolean {
  if (!type) return false;
  let n = compactNumber(raw);
  switch (type) {
    case 'SIRENE':
      if (/^\d{9}$/.test(n)) return luhnValid(n);
      if (/^\d{14}$/.test(n)) {
        return n.startsWith('356000000') ? [...n].reduce((s, c) => s + Number(c), 0) % 5 === 0 : luhnValid(n);
      }
      return false;
    case 'TVA_UE':
      if (n.startsWith('GR')) n = `EL${n.slice(2)}`;
      return VIES.includes(n.slice(0, 2)) && /^[0-9A-Z]{2,12}$/.test(n.slice(2));
    case 'UK_COMPANY':
      return /^\d{1,8}$/.test(n) || /^[A-Z]{2}\d{6}$/.test(n);
    default:
      return /^[0-9A-Z]{4,30}$/.test(n);
  }
}
