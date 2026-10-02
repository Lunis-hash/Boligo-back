import { extractErrorMessage, getReadableError } from '@/services/api';

describe('extractErrorMessage', () => {
  it('joins validation arrays returned by NestJS', () => {
    expect(extractErrorMessage({ message: ['email must be an email', 'password too short'] }, 'x')).toBe(
      'email must be an email\npassword too short',
    );
  });

  it('translates well-known backend messages', () => {
    expect(extractErrorMessage({ message: 'Invalid credentials' }, 'x')).toMatch(/mot de passe incorrect/);
    expect(extractErrorMessage({ message: 'Email already exists' }, 'x')).toMatch(/existe déjà/);
    expect(extractErrorMessage({ message: 'User not found' }, 'x')).toMatch(/Aucun compte/);
  });

  it('keeps the backend message otherwise and uses the fallback when empty', () => {
    expect(extractErrorMessage({ message: 'Code de vérification incorrect.' }, 'x')).toBe('Code de vérification incorrect.');
    expect(extractErrorMessage(null, 'fallback')).toBe('fallback');
  });
});

describe('getReadableError', () => {
  it('prefers the message computed by the interceptor', () => {
    expect(getReadableError({ readableMessage: 'Déjà traduit' })).toBe('Déjà traduit');
  });

  it('explains network errors and timeouts', () => {
    expect(getReadableError({ message: 'Network Error' })).toMatch(/connexion internet/);
    expect(getReadableError({ code: 'ECONNABORTED' })).toMatch(/trop de temps/);
  });

  it('reads the HTTP payload when present', () => {
    expect(getReadableError({ response: { data: { message: 'Solde insuffisant.' } } })).toBe('Solde insuffisant.');
  });

  it('falls back to the given default', () => {
    expect(getReadableError({}, 'Défaut')).toBe('Défaut');
  });
});
